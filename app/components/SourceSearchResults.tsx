'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './SourceSearchResults.module.css';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface VideoSource {
  id: number;
  movie_id: string;
  provider: string;
  available: boolean;
  url: string;
  embed_url?: string;
  qualities?: Record<string, string>;
  default_quality?: string;
  status: string;
  is_selected: boolean;
  description?: string;
}

interface SourceSearchResultsProps {
  movieId: string;
  onComplete: (savedSources: any) => void;
  onCancel: () => void;
}

export const SourceSearchResults: React.FC<SourceSearchResultsProps> = ({ movieId, onComplete, onCancel }) => {
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<number[]>([]);

  // Search for sources when component mounts
  useEffect(() => {
    searchSources();
  }, []);

  // Function to search for sources
  const searchSources = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the Supabase function
      // For now, we'll simulate a 2 second delay and return fake data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get TMDb or IMDB ID if available, otherwise use movieId
      const { data: movieData, error: movieError } = await supabase
        .from('movies')
        .select('external_ids, title')
        .eq('id', movieId)
        .single();
      
      // Default to movieId if no external IDs available
      let imdbId = '';
      let tmdbId = '';
      let movieTitle = 'Unknown Movie';
      
      if (!movieError && movieData) {
        // Check if we have external IDs
        if (movieData.external_ids && typeof movieData.external_ids === 'object') {
          // Get IMDB ID if available
          if (movieData.external_ids.imdb_id) {
            imdbId = movieData.external_ids.imdb_id;
          }
          // Get TMDB ID if available
          if (movieData.external_ids.tmdb_id) {
            tmdbId = movieData.external_ids.tmdb_id.toString();
          }
        }
        
        if (movieData.title) {
          movieTitle = movieData.title;
        }
      }
      
      // Prepare the ID for VidSrc - prefer IMDB ID with "tt" prefix
      let vidSrcId = tmdbId; // Default to TMDB ID
      if (imdbId && imdbId.startsWith('tt')) {
        vidSrcId = imdbId; // Use IMDB ID if available with "tt" prefix
      }
      
      // Simulate search results
      const mockSources: VideoSource[] = [
        {
          id: 1,
          movie_id: movieId,
          provider: 'vidsrc',
          available: true,
          url: `https://vidsrc.to/embed/movie/${vidSrcId}`,
          embed_url: `https://player.vidsrc.co/embed/movie/${vidSrcId}`,
          status: 'found',
          is_selected: true,
          description: 'High-quality streaming service with HD quality.'
        }
      ];
      
      // Add additional sources only if we have valid IDs
      if (vidSrcId) {
        // Add secondary provider options
        mockSources.push(
          {
            id: 2,
            movie_id: movieId,
            provider: 'vidsrc pro',
            available: true,
            url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
            embed_url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
            status: 'found',
            is_selected: false,
            description: 'Premium version with better streaming quality.'
          },
          {
            id: 3,
            movie_id: movieId,
            provider: 'embedlinks',
            available: true,
            url: `https://embedlinks.org/movie/${vidSrcId}`,
            embed_url: `https://embedlinks.org/movie/${vidSrcId}`,
            status: 'found',
            is_selected: false,
            description: 'Alternative streaming source with multiple options.'
          },
          {
            id: 4,
            movie_id: movieId,
            provider: 'multiembed',
            available: true,
            url: imdbId ? `https://multiembed.mov/directstream.php?video_id=${imdbId}` : `https://multiembed.mov/directstream.php?tmdb=${tmdbId}`,
            embed_url: imdbId ? `https://multiembed.mov/directstream.php?video_id=${imdbId}` : `https://multiembed.mov/directstream.php?tmdb=${tmdbId}`,
            status: 'found',
            is_selected: false,
            description: 'Multiple server options and qualities.'
          }
        );
      }
      
      setSources(mockSources);
      
      // Pre-select VidSrc by default
      setSelectedSources([1]);
      
      setError(null);
    } catch (err) {
      console.error('Error searching for sources:', err);
      setError('Failed to search for video sources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle source selection
  const toggleSourceSelection = (sourceId: number) => {
    setSelectedSources(prev => {
      if (prev.includes(sourceId)) {
        return prev.filter(id => id !== sourceId);
      } else {
        return [...prev, sourceId];
      }
    });
  };

  // Save selected sources
  const saveSelectedSources = async () => {
    try {
      const selectedSourceObjects = sources.filter(source => 
        selectedSources.includes(source.id)
      );
      
      // In a real implementation, you would save these to Supabase
      // For example:
      if (selectedSourceObjects.length > 0) {
        const sourcesToSave = selectedSourceObjects.map(source => ({
          movie_id: movieId,
          provider: source.provider,
          url: source.url,
          embed_url: source.embed_url || source.url,
          created_at: new Date().toISOString()
        }));
        
        // Uncomment this to actually save to Supabase:
        // const { data, error } = await supabase
        //   .from('movie_sources')
        //   .upsert(sourcesToSave, { onConflict: 'movie_id,provider' });
        
        // if (error) throw error;
      }
      
      // Pass the selected sources back to the parent component
      onComplete(selectedSourceObjects);
    } catch (err) {
      console.error('Error saving sources:', err);
      setError('Failed to save sources. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Searching for video sources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <div className={styles.buttonContainer}>
          <button 
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={searchSources}
          >
            Try Again
          </button>
          <button 
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className={styles.noResultsContainer}>
        <p className={styles.noResultsText}>No video sources found for this movie.</p>
        <div className={styles.buttonContainer}>
          <button 
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Available Video Sources</h2>
      
      <div className={styles.sourcesList}>
        {sources.map(source => (
          <div 
            key={source.id} 
            className={`${styles.sourceItem} ${selectedSources.includes(source.id) ? styles.selected : ''}`}
          >
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                id={`source-${source.id}`}
                checked={selectedSources.includes(source.id)}
                onChange={() => toggleSourceSelection(source.id)}
                className={styles.checkbox}
              />
              <label htmlFor={`source-${source.id}`} className={styles.sourceLabel}>
                {source.provider.toUpperCase()}
              </label>
            </div>
            
            <div className={styles.sourceDetails}>
              {source.description && (
                <p className={styles.sourceDescription}>{source.description}</p>
              )}
              {source.qualities ? (
                <div className={styles.qualities}>
                  {Object.keys(source.qualities).map(quality => (
                    <span 
                      key={quality} 
                      className={`${styles.qualityBadge} ${quality === source.default_quality ? styles.defaultQuality : ''}`}
                    >
                      {quality}
                    </span>
                  ))}
                </div>
              ) : (
                source.embed_url && <span className={styles.embedBadge}>Embed Available</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.buttonContainer}>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={saveSelectedSources}
          disabled={selectedSources.length === 0}
        >
          Save Selected Sources
        </button>
      </div>
    </div>
  );
};

