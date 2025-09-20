'use client';

import React, { useEffect, useState, useRef } from 'react';
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

interface EpisodePlayerProps {
  // Original props
  embedUrl?: string;
  videoUrl?: string;
  showTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  
  // New props that match how it's used in the TVShows page
  seriesId?: string;
  season?: number;
  episode?: number;
  height?: string;
  onError?: (errorMsg: string) => void;
}

/**
 * EpisodePlayer - Specialized component for TV show episode playback
 * 
 * This component handles TV show episode playback with proper error handling
 * and domain standardization. It ensures episodes use the appropriate video domain
 * which is compatible with the movie player implementation.
 * 
 * It can be used in two ways:
 * 1. Direct URL mode: Pass embedUrl/videoUrl directly
 * 2. Database fetch mode: Pass seriesId, season, and episode to fetch URLs from the database
 */
const EpisodePlayer: React.FC<EpisodePlayerProps> = ({
  // Original props
  embedUrl,
  videoUrl,
  showTitle,
  seasonNumber,
  episodeNumber,
  
  // New props
  seriesId,
  season,
  episode,
  height = '360px', // Default fixed height
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [playerUrl, setPlayerUrl] = useState('');
  const [finalPlayerUrl, setFinalPlayerUrl] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [seriesTitle, setSeriesTitle] = useState(showTitle || '');
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
  
  // Format URL to use the currently selected server
  const formatServerUrl = (url: string, targetServer: string) => {
    if (!url) return url;
    
    // Replace any existing server domain with the target server
    if (url.includes(VIDEO_SERVERS.DEFAULT)) {
      return url.replace(`https://${VIDEO_SERVERS.DEFAULT}/embed/tv/`, `https://${targetServer}/embed/tv/`);
    } else if (url.includes(VIDEO_SERVERS.ALTERNATE)) {
      return url.replace(`https://${VIDEO_SERVERS.ALTERNATE}/embed/tv/`, `https://${targetServer}/embed/tv/`);
    }
    
    // If it's a different format, try to extract the ID and create a new URL
    const matchTv = url.match(/\/embed\/tv\/([^?&]+)/);
    if (matchTv && matchTv[1]) {
      return `https://${targetServer}/embed/tv/${matchTv[1]}`;
    }
    
    // Return original if we can't determine how to format it
    return url;
  };
  
  // Ensure controls=1 parameter is always present
  useEffect(() => {
    if (!playerUrl) return;
    
    let url = playerUrl;
    
    // Add or replace controls parameter
    if (url.includes('controls=')) {
      url = url.replace(/controls=[0-9]/, 'controls=1');
    } else {
      url = url.includes('?') ? `${url}&controls=1` : `${url}?controls=1`;
    }
    
    setFinalPlayerUrl(url);
  }, [playerUrl]);
  
  // Normalize props to handle both usage patterns
  const finalSeason = seasonNumber || season || 1;
  const finalEpisode = episodeNumber || episode || 1;
  
  // Fetch episode from database if seriesId is provided
  useEffect(() => {
    async function fetchEpisodeData() {
      if (!seriesId) return;
      
      try {
        // Fetch the series info first to get the title
        if (!seriesTitle) {
          const { data: seriesData, error: seriesError } = await supabase
            .from('series')
            .select('title')
            .eq('id', seriesId)
            .single();
            
          if (seriesError) throw seriesError;
          if (seriesData) setSeriesTitle(seriesData.title);
        }
        
        // Fetch the episode
        const { data: episodeData, error: episodeError } = await supabase
          .from('episodes')
          .select('embed_url, video_url, title')
          .eq('series_id', seriesId)
          .eq('season', finalSeason)
          .eq('episode', finalEpisode)
          .single();
          
        if (episodeError) {
          console.error('Error fetching episode:', episodeError);
          setError(true);
          if (onError) onError(`Failed to fetch episode: ${episodeError.message}`);
          return;
        }
        
        if (episodeData) {
          if (episodeData.title) setEpisodeTitle(episodeData.title);
          
          // Prefer embed_url over video_url
          let finalUrl = episodeData.embed_url || episodeData.video_url;
          
          // Format URL for the current server
          finalUrl = formatServerUrl(finalUrl, currentServer);
          
          // Add controls=1 parameter to URL if not already present
          if (finalUrl && !finalUrl.includes('controls=')) {
            finalUrl = finalUrl.includes('?') ? `${finalUrl}&controls=1` : `${finalUrl}?controls=1`;
          } else if (finalUrl && finalUrl.includes('controls=0')) {
            // Convert controls=0 to controls=1 if present
            finalUrl = finalUrl.replace('controls=0', 'controls=1');
          }
          
          setPlayerUrl(finalUrl);
        } else {
          setError(true);
          console.error(`Episode not found: S${finalSeason}E${finalEpisode}`);
          if (onError) onError(`Episode not found: S${finalSeason}E${finalEpisode}`);
        }
      } catch (err: any) {
        console.error('Error in episode player:', err);
        setError(true);
        if (onError) onError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    // If direct URL is provided, use it
    if (embedUrl || videoUrl) {
      handleDirectUrl();
    } else if (seriesId) {
      // Otherwise fetch from database
      fetchEpisodeData();
    } else {
      // No data source provided
      setError(true);
      setLoading(false);
      console.error('No episode source provided: need either URL or seriesId + season + episode');
      if (onError) onError('No episode source provided');
    }
  }, [seriesId, finalSeason, finalEpisode, embedUrl, videoUrl, retryCount, currentServer]);
  
  // Handle direct URL usage pattern
  const handleDirectUrl = () => {
    // Format the URL for the current server
    let finalUrl = embedUrl || videoUrl;
    
    if (finalUrl) {
      finalUrl = formatServerUrl(finalUrl, currentServer);
      
      // Ensure we have a valid URL
      if (!finalUrl) {
        setError(true);
        setLoading(false);
        console.error('No valid embed or video URL provided');
        if (onError) onError('No valid embed or video URL provided');
        return;
      }
      
      // Add controls=1 parameter to URL if not already present
      if (finalUrl && !finalUrl.includes('controls=')) {
        finalUrl = finalUrl.includes('?') ? `${finalUrl}&controls=1` : `${finalUrl}?controls=1`;
      } else if (finalUrl && finalUrl.includes('controls=0')) {
        // Convert controls=0 to controls=1 if present
        finalUrl = finalUrl.replace('controls=0', 'controls=1');
      }
      
      setPlayerUrl(finalUrl);
    } else {
      setError(true);
      setLoading(false);
      console.error('No valid embed or video URL provided');
      if (onError) onError('No valid embed or video URL provided');
    }
  };
  
  const handleIframeLoad = () => {
    setLoading(false);
    setError(false);
  };
  
  const handleIframeError = () => {
    setLoading(false);
    setError(true);
    console.error('Failed to load episode player iframe');
    if (onError) onError('Failed to load episode player iframe');
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
      console.error('Error toggling fullscreen:', err);
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

  // Display title for the episode
  const displayTitle = seriesTitle || showTitle || 'Episode';
  const displaySeason = finalSeason;
  const displayEpisode = finalEpisode;
  const displayEpisodeTitle = episodeTitle || '';

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
            <p className="text-white">Loading {displayTitle} S{displaySeason}E{displayEpisode}...</p>
            {displayEpisodeTitle && <p className="text-gray-400 text-sm">{displayEpisodeTitle}</p>}
            <p className="text-gray-400 text-xs mt-2">Using server: {currentServer}</p>
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
              Unable to load {displayTitle} Season {displaySeason} Episode {displayEpisode}
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
      
      {playerUrl && (
        <iframe
          ref={iframeRef}
          src={finalPlayerUrl || playerUrl}
          className="video-embed"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen; clipboard-write"
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

export default EpisodePlayer;
