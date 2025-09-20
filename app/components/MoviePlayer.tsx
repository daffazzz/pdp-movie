'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define available video servers
const VIDEO_SERVERS = {
  DEFAULT: 'player.vidplus.to',
  ALTERNATE: 'vidsrc.to'
};

interface MoviePlayerProps {
  movieId: string;
  height?: string;
  autoPlay?: boolean;
  allowFullScreen?: boolean;
  onError?: (error: string) => void;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  movieId, 
  height = '360px', // Default fixed height
  autoPlay = false,
  allowFullScreen = true,
  onError
}) => {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [finalEmbedUrl, setFinalEmbedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const [movieTitle, setMovieTitle] = useState<string>('');
  const [currentServer, setCurrentServer] = useState<string>(VIDEO_SERVERS.DEFAULT);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const hideControlsTimeoutRef = useRef<number | null>(null);

  // Auto-hide controls on inactivity
  useEffect(() => {
    const resetHideTimer = () => {
      setShowControls(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      hideControlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    // Start timer on mount
    resetHideTimer();

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);


  // Toggle between video servers
  const toggleVideoServer = () => {
    const newServer = currentServer === VIDEO_SERVERS.DEFAULT 
      ? VIDEO_SERVERS.ALTERNATE 
      : VIDEO_SERVERS.DEFAULT;
    
    setCurrentServer(newServer);
    setRetryCount(prev => prev + 1); // Trigger reload with new server
  };

  // Ensure controls=1 parameter is always present
  useEffect(() => {
    if (!embedUrl) return;
    
    let url = embedUrl;
    
    // Add or replace controls parameter
    if (url.includes('controls=')) {
      url = url.replace(/controls=[0-9]/, 'controls=1');
    } else {
      url = url.includes('?') ? `${url}&controls=1` : `${url}?controls=1`;
    }
    
    setFinalEmbedUrl(url);
  }, [embedUrl]);

  // Format URL to use the currently selected server
  const formatServerUrl = (url: string, targetServer: string) => {
    if (!url) return url;
    
    // Replace any existing server domain with the target server
    if (url.includes(VIDEO_SERVERS.DEFAULT)) {
      return url.replace(`https://${VIDEO_SERVERS.DEFAULT}/embed/movie/`, `https://${targetServer}/embed/movie/`);
    } else if (url.includes(VIDEO_SERVERS.ALTERNATE)) {
      return url.replace(`https://${VIDEO_SERVERS.ALTERNATE}/embed/movie/`, `https://${targetServer}/embed/movie/`);
    }
    
    // If it's a different format, try to extract the ID and create a new URL
    const matchMovie = url.match(/\/embed\/movie\/([^?&]+)/);
    if (matchMovie && matchMovie[1]) {
      return `https://${targetServer}/embed/movie/${matchMovie[1]}`;
    }
    
    // Return original if we can't determine how to format it
    return url;
  };

  useEffect(() => {
    let isMounted = true; // For preventing state updates after unmount
    
    const fetchMovieSource = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        setError(false);

        // First, try to get the source from movie_sources table
        const { data: sourceData, error: sourceError } = await supabase
          .from('movie_sources')
          .select('embed_url, provider')
          .eq('movie_id', movieId)
          .eq('is_default', true)
          .single();

        if (!isMounted) return;

        // Get movie title for display
        const { data: movieData, error: movieError } = await supabase
          .from('movies')
          .select('external_ids, title, tmdb_id')
          .eq('id', movieId)
          .single();

        if (!isMounted) return;
        
        if (!movieError && movieData) {
          setMovieTitle(movieData.title);
        }

        // If we have a source in the database, use it directly
        if (!sourceError && sourceData && sourceData.embed_url) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Using source from database: ${sourceData.provider}`);
          }

          // Format URL for the current server
          let finalUrl = formatServerUrl(sourceData.embed_url, currentServer);
          
          // Add controls=1 parameter to URL if not already present
          if (finalUrl && !finalUrl.includes('controls=')) {
            finalUrl = finalUrl.includes('?') ? `${finalUrl}&controls=1` : `${finalUrl}?controls=1`;
          } else if (finalUrl && finalUrl.includes('controls=0')) {
            // Convert controls=0 to controls=1 if present
            finalUrl = finalUrl.replace('controls=0', 'controls=1');
          }
          
          setEmbedUrl(finalUrl);
        } else {
          // No source in database, check for external IDs
          if (process.env.NODE_ENV !== 'production') {
            console.log('Checking for external IDs');
          }
          
          if (movieError) throw movieError;
          
          // Determine which ID to use (IMDB preferred, then TMDB)
          let imdbId = '';
          let tmdbId = '';
          let vidSrcId = movieId; // Default to movie UUID if no other IDs found
          
          // First check external_ids object if it exists
          if (movieData && movieData.external_ids) {
            try {
              if (typeof movieData.external_ids === 'string') {
                // Handle case where external_ids might be a string instead of an object
                const parsedIds = JSON.parse(movieData.external_ids);
                if (parsedIds.imdb_id && String(parsedIds.imdb_id).startsWith('tt')) {
                  imdbId = String(parsedIds.imdb_id);
                  vidSrcId = imdbId;
                } else if (parsedIds.tmdb_id) {
                  tmdbId = String(parsedIds.tmdb_id);
                  if (!imdbId) vidSrcId = tmdbId;
                }
              } else {
                // Normal case - external_ids is an object
                if (movieData.external_ids.imdb_id && String(movieData.external_ids.imdb_id).startsWith('tt')) {
                  imdbId = String(movieData.external_ids.imdb_id);
                  vidSrcId = imdbId;
                } else if (movieData.external_ids.tmdb_id) {
                  tmdbId = String(movieData.external_ids.tmdb_id);
                  if (!imdbId) vidSrcId = tmdbId;
                }
              }
            } catch (parseErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('Error parsing external_ids:', parseErr);
              }
              // Continue with other methods
            }
          }
          
          // If no TMDB ID in external_ids, check the direct column
          if (!tmdbId && movieData && movieData.tmdb_id) {
            tmdbId = String(movieData.tmdb_id);
            if (!imdbId) vidSrcId = tmdbId; // Only use if no IMDB ID was found
          }
          
          if (imdbId || tmdbId) {
            // Create VidSrc URL using current server
            const videoUrl = `https://${currentServer}/embed/movie/${vidSrcId}?controls=1`;
            setEmbedUrl(videoUrl);
            
            // Save a default version to the database for future use
            // We'll save using DEFAULT server but will display with current server
            try {
              const defaultUrl = `https://${VIDEO_SERVERS.DEFAULT}/embed/movie/${vidSrcId}?controls=1`;
              
              const { error: insertError } = await supabase
                .from('movie_sources')
                .upsert({
                  movie_id: movieId,
                  provider: 'vidsrc',
                  url: `https://vidsrc.to/embed/movie/${vidSrcId}`,
                  embed_url: defaultUrl,
                  is_default: true,
                }, { onConflict: 'movie_id,provider' });
                
              if (insertError && process.env.NODE_ENV !== 'production') {
                console.log('Failed to save source to database');
              }
              
              // Update has_sources flag
              await supabase
                .from('movies')
                .update({ has_sources: true })
                .eq('id', movieId);
                
              // If we found a direct tmdb_id but it's not in external_ids, update it
              if (movieData && movieData.tmdb_id && 
                  (!movieData.external_ids || !movieData.external_ids.tmdb_id)) {
                
                const updatedExternalIds = typeof movieData.external_ids === 'object' 
                  ? movieData.external_ids || {}
                  : {};
                
                updatedExternalIds.tmdb_id = movieData.tmdb_id;
                
                await supabase
                  .from('movies')
                  .update({ external_ids: updatedExternalIds })
                  .eq('id', movieId);
              }
                
            } catch (saveErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('Error saving source, continuing with playback');
              }
              // Don't rethrow - we still want to play the video even if saving fails
            }
          } else {
            throw new Error('No IMDb or TMDB ID found for this movie');
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        let errorMessage = 'Failed to load video source';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error fetching movie source:', errorMessage);
        }
        
        setError(true);
        if (onError) onError(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMovieSource();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [movieId, onError, retryCount, currentServer]);

  const handleIframeLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to load movie player iframe');
    }
    if (onError) onError('Failed to load movie player iframe');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    setRetryCount(prev => prev + 1);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error toggling fullscreen:', err);
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-md overflow-hidden embedded-player-container mx-auto"
      style={{
        width: '100%', 
        maxWidth: '100%', // Player fills container completely
        height: '100%',
        aspectRatio: '16/9'
      }}
      onMouseMove={() => {
        setShowControls(true);
        if (hideControlsTimeoutRef.current) {
          clearTimeout(hideControlsTimeoutRef.current);
        }
        hideControlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
      }}
      onMouseEnter={() => {
        setShowControls(true);
      }}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => {
        setShowControls(true);
        if (hideControlsTimeoutRef.current) {
          clearTimeout(hideControlsTimeoutRef.current);
        }
        hideControlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
      }}
    >


      {/* Server switch button - top right */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={toggleVideoServer}
          className="bg-black/70 hover:bg-black/90 text-white text-xs px-2 py-1 rounded flex items-center"
          title={`Switch to ${currentServer === VIDEO_SERVERS.DEFAULT ? 'alternate' : 'default'} server`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Server: {currentServer === VIDEO_SERVERS.DEFAULT ? 'Default' : 'Alternate'}
        </button>
      </div>

      {/* Fullscreen button - bottom right */}
      <div className={`absolute bottom-2 right-2 z-10 ${isFullscreen ? 'bottom-4 right-4' : ''}`}>
        <button
          onClick={toggleFullscreen}
          className={`bg-black/50 hover:bg-black/90 text-white rounded flex items-center transition-all duration-300 opacity-60 hover:opacity-100 ${
            isFullscreen
              ? 'text-base px-6 py-4'  // Larger when in fullscreen
              : 'text-sm px-5 py-3'     // Normal size
          }`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M9 15v4.5M9 15H4.5M9 15l-3.5 3.5M15 9h4.5M15 9V4.5M15 9l3.5-3.5M15 15h4.5M15 15v4.5M15 15l3.5 3.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>
      
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
            <p className="text-white">Loading {movieTitle || 'movie'}...</p>
            <p className="text-gray-400 text-xs">Using server: {currentServer}</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="mb-4 text-orange-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white font-bold mb-2">
              Playback Error
            </p>
            <p className="text-white mb-2">
              Unable to load {movieTitle || 'movie'}
            </p>
            <p className="text-gray-400 text-xs mb-4">
              Server: {currentServer}
            </p>
            <div className="flex justify-center space-x-2">
              <button 
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded flex items-center"
                onClick={handleRetry}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
              <button 
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center"
                onClick={toggleVideoServer}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Try Another Server
              </button>
            </div>
          </div>
        </div>
      )}
      
      {embedUrl && (
        <iframe
          ref={iframeRef}
          src={finalEmbedUrl || embedUrl}
          className="video-embed"
          frameBorder="0"
          allowFullScreen={allowFullScreen}
          allow={`${autoPlay ? "autoplay; " : ""}encrypted-media; picture-in-picture; web-share; fullscreen; clipboard-write`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            zIndex: (loading || error) ? 0 : 1,
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
};
