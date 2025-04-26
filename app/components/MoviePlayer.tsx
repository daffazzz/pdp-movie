'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface MoviePlayerProps {
  movieId: string;
  height?: string;
  autoPlay?: boolean;
  allowFullScreen?: boolean;
  onError?: (error: string) => void;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  movieId, 
  height = '0',
  autoPlay = false,
  allowFullScreen = true,
  onError
}) => {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const [movieTitle, setMovieTitle] = useState<string>('');

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

          // Convert any vidsrc.to URLs to player.vidsrc.co
          let finalUrl = sourceData.embed_url;
          if (finalUrl && finalUrl.includes('vidsrc.to')) {
            finalUrl = finalUrl.replace('https://vidsrc.to/embed/movie/', 'https://player.vidsrc.co/embed/movie/');
            
            // Update the database with the corrected URL
            await supabase
              .from('movie_sources')
              .update({ embed_url: finalUrl })
              .eq('movie_id', movieId)
              .eq('provider', sourceData.provider);
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
            // Create VidSrc URL using correct format
            const videoUrl = `https://player.vidsrc.co/embed/movie/${vidSrcId}`;
            setEmbedUrl(videoUrl);
            
            // Save this source to the database for future use
            try {
              const { error: insertError } = await supabase
                .from('movie_sources')
                .upsert({
                  movie_id: movieId,
                  provider: 'vidsrc',
                  url: `https://vidsrc.to/embed/movie/${vidSrcId}`,
                  embed_url: videoUrl,
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
  }, [movieId, onError, retryCount]);

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

  return (
    <div 
      className="w-full relative bg-black rounded-md overflow-hidden"
      style={{
        height: height || '0',
        paddingBottom: height ? undefined : '56.25%' // 16:9 aspect ratio
      }}
    >
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
            <p className="text-white">Loading {movieTitle || 'movie'}...</p>
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
            <p className="text-white mb-4">
              Unable to load {movieTitle || 'movie'}
            </p>
            <button 
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center mx-auto"
              onClick={handleRetry}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Playback
            </button>
          </div>
        </div>
      )}
      
      {embedUrl && (
        <iframe
          src={embedUrl}
          frameBorder="0"
          allowFullScreen={allowFullScreen}
          allow={`${autoPlay ? "autoplay; " : ""}encrypted-media; picture-in-picture; web-share; fullscreen; clipboard-write`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: loading || error ? 0 : 1,
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
}; 