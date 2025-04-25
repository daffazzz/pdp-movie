'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './MoviePlayer.module.css';

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
  height = '500px',
  autoPlay = false,
  allowFullScreen = true,
  onError
}) => {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Safely handle logging to prevent excessive console activity
  const safeLog = (message: string, ...args: any[]) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(message, ...args);
      }
    } catch (e) {
      // Silently ignore any console errors
    }
  };

  useEffect(() => {
    let isMounted = true; // For preventing state updates after unmount
    
    const fetchMovieSource = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        setError(null);
        setIframeLoaded(false);

        // First, try to get the source from movie_sources table
        const { data: sourceData, error: sourceError } = await supabase
          .from('movie_sources')
          .select('embed_url, provider')
          .eq('movie_id', movieId)
          .eq('is_default', true)
          .single();

        if (!isMounted) return;

        // If we have a source in the database, use it directly
        if (!sourceError && sourceData && sourceData.embed_url) {
          safeLog(`Using source from database: ${sourceData.provider}`);
          setEmbedUrl(sourceData.embed_url);
        } else {
          safeLog('Checking for external IDs');
          
          // Get both tmdb_id column and external_ids
          const { data: movieData, error: movieError } = await supabase
            .from('movies')
            .select('external_ids, title, tmdb_id')
            .eq('id', movieId)
            .single();
          
          if (!isMounted) return;
          
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
              safeLog('Error parsing external_ids:', parseErr);
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
                
              if (insertError) safeLog('Failed to save source to database');
              
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
              safeLog('Error saving source, continuing with playback');
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
        
        safeLog('Error fetching movie source:', errorMessage);
        setError(errorMessage);
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
  }, [movieId, onError]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  const handleIframeError = () => {
    const errorMsg = 'Failed to load video player';
    setError(errorMsg);
    if (onError) onError(errorMsg);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer} style={{ height }}>
        <div className={styles.spinner}></div>
        <p>Loading video player...</p>
      </div>
    );
  }

  if (error || !embedUrl) {
    return (
      <div className={styles.errorContainer} style={{ height }}>
        <p className={styles.errorText}>Error: {error || 'No video source available'}</p>
        <p>Please try again later or contact support if the problem persists.</p>
      </div>
    );
  }

  return (
    <div className={styles.playerContainer}>
      <div className={styles.embedWrapper} style={{ height }}>
        {!iframeLoaded && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Loading video from VidSrc...</p>
          </div>
        )}
        <iframe
          src={embedUrl}
          className={styles.videoIframe}
          frameBorder="0"
          allowFullScreen={allowFullScreen}
          allow={`${autoPlay ? "autoplay; " : ""}encrypted-media; picture-in-picture`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Movie Player"
          sandbox="allow-forms allow-scripts allow-same-origin allow-presentation"
        ></iframe>
      </div>
    </div>
  );
}; 