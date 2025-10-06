"use client";

import { useState, useEffect } from 'react';
import MovieRow from '../components/MovieRow';
import { supabase } from '../../lib/supabaseClient';
import Hero from '../components/Hero';
import GenreMenu from '../components/GenreMenu';
import GenreRecommendations from '../components/GenreRecommendations';
import DiverseRecommendations from '../components/DiverseRecommendations';
import TrendingRecommendations from '../components/TrendingRecommendations';
import { FaRandom } from 'react-icons/fa';
import LazyMovieRow from '../components/LazyMovieRow';

// Constants for optimized data loading
const TV_ROW_LIMIT = 10; // Default number of TV shows to show per row

// Function to select a featured series (highest rated with backdrop)
const selectFeaturedSeries = (seriesList: any[]) => {
  if (!seriesList || seriesList.length === 0) return null;
  
  // Filter series with backdrop images
  const seriesWithBackdrops = seriesList.filter(series => 
    series.backdrop_url && series.backdrop_url.trim() !== ''
  );
  
  if (seriesWithBackdrops.length === 0) return null;
  
  // Sort by rating (highest first)
  const sortedSeries = [...seriesWithBackdrops].sort((a, b) => b.rating - a.rating);
  
  // Return the highest rated series
  return sortedSeries[0];
};

// Interface untuk tipe data series
interface Series {
  id: string;
  tmdb_id: number;
  title: string;
  description: string;
  poster_url?: string;
  backdrop_url?: string;
  thumbnail_url?: string;
  rating: number;
  release_year?: number;
  genre?: string[];
  created_at: string;
}

interface FeaturedContent {
  id: string;
  title: string;
  overview: string;
  backdrop_url: string;
  poster_url?: string;
  contentType: 'movie' | 'tvshow';
  tmdb_id?: number;
}

interface Genre {
  id: string;
  name: string;
}

export default function TVShowsPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [trendingTvShows, setTrendingTvShows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredSeries, setFeaturedSeries] = useState<FeaturedContent | null>(null);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [historyTvShows, setHistoryTvShows] = useState<any[]>([]);
  
  // Function to refresh the featured content
  const refreshFeaturedContent = () => {
    if (allSeries.length === 0) return;
    
    setRefreshing(true);
    
    // Get current content ID to avoid selecting the same one
    const currentId = featuredSeries?.id;
    
    // Filter to only series with backdrop images
    const seriesWithBackdrops = allSeries.filter(item => 
      item.backdrop_url && item.backdrop_url.trim() !== ''
    );
    
    if (seriesWithBackdrops.length === 0) {
      setRefreshing(false);
      return;
    }
    
    // Try to find different content
    let attempts = 0;
    let randomSeries;
    
    // Find the next highest rated series that's different from current
    randomSeries = seriesWithBackdrops.find(series => series.id !== currentId) || seriesWithBackdrops[0];
    
    if (randomSeries) {
      setFeaturedSeries({
        id: randomSeries.id,
        title: randomSeries.title,
        overview: randomSeries.description || 'No description available',
        backdrop_url: randomSeries.backdrop_url,
        poster_url: randomSeries.poster_url,
        contentType: 'tvshow',
        tmdb_id: randomSeries.tmdb_id
      });
    }
    
    setTimeout(() => setRefreshing(false), 600);
  };
  
  // Extract unique genres from the database
  const extractGenresFromSeries = (seriesData: any[]): Genre[] => {
    const genreSet = new Set<string>();
    
    // Collect all unique genres
    seriesData.forEach(show => {
      if (show.genre) {
        if (Array.isArray(show.genre)) {
          show.genre.forEach((g: string) => {
            const genre = g.trim();
            
            // Pisahkan genre gabungan 
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
            } else if (genre.toLowerCase() === 'sci-fi & fantasy') {
              genreSet.add('Sci-Fi');
              genreSet.add('Fantasy');
            } else if (genre.toLowerCase() === 'war & politics') {
              genreSet.add('War');
              genreSet.add('Politics');
            } else {
              genreSet.add(genre);
            }
          });
        } else if (typeof show.genre === 'string') {
          show.genre.split(',').forEach((g: string) => {
            const genre = g.trim();
            
            // Pisahkan genre gabungan
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
            } else if (genre.toLowerCase() === 'sci-fi & fantasy') {
              genreSet.add('Sci-Fi');
              genreSet.add('Fantasy');
            } else if (genre.toLowerCase() === 'war & politics') {
              genreSet.add('War');
              genreSet.add('Politics');
            } else {
              genreSet.add(genre);
            }
          });
        }
      }
    });
    
    // Convert to array and format as Genre objects with id and name
    return Array.from(genreSet)
      .filter(genre => genre) // Filter out empty strings
      .sort() // Sort alphabetically
      .map(genre => {
        // Normalisasi ID untuk genre
        let genreId = genre.toLowerCase().replace(/[\s&]+/g, '-');
        
        // Handle special case for Sci-Fi
        if (genre === "Sci-Fi") {
          genreId = "sci-fi";
        }
        
        return {
          id: genreId,
          name: genre // Keep original name for display
        };
      });
  };
  
  useEffect(() => {
    const fetchSeries = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if Supabase client is available
        if (!supabase) {
          console.error('Supabase client is not initialized');
          setError('Database connection is not available. Please check your internet connection.');
          setIsLoading(false);
          return;
        }
        
        // Fetch all series
        const { data: allSeriesData, error } = await (supabase as NonNullable<typeof supabase>)
          .from('series')
          .select('*')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'eq', '')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }

        // Store all series for featured content refresh
        setAllSeries(allSeriesData || []);
        
        // Extract genres from the database
        const extractedGenres = extractGenresFromSeries(allSeriesData || []);
        setGenres(extractedGenres);
        
        // Set featured series
        const featured = selectFeaturedSeries(allSeriesData || []);
        if (featured) {
          setFeaturedSeries({
            id: featured.id,
            title: featured.title,
            overview: featured.description || 'No description available',
            backdrop_url: featured.backdrop_url,
            poster_url: featured.poster_url,
            contentType: 'tvshow',
            tmdb_id: featured.tmdb_id
          });
        }

        // Set trending TV shows
        const trending = allSeriesData
          ?.filter(show => 
            (show.is_trending || show.popularity > 0.6) && 
            show.thumbnail_url && 
            show.thumbnail_url.trim() !== ''
          )
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10) || [];
          
        setTrendingTvShows(trending.map(show => ({
          id: show.id,
          title: show.title,
          thumbnail_url: show.thumbnail_url || show.poster_url,
          rating: show.rating,
          tmdb_id: show.tmdb_id
        })));

      } catch (err: any) {
        console.error('Error fetching series:', err);
        setError(err.message || 'An error occurred while fetching series');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeries();
  }, []);

  useEffect(() => {
    const updateHistory = () => {
      if (typeof window !== 'undefined') {
        const historyStr = localStorage.getItem('movie_history');
        if (historyStr) {
          try {
            const parsed = JSON.parse(historyStr);
            const seriesIds = new Set(allSeries.map((s: any) => s.id));
            const tvshows = parsed.filter((item: any) => seriesIds.has(item.id)).map((item: any) => ({ ...item, type: 'tvshow' }));
            const sorted = tvshows.sort((a: any, b: any) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime());
            setHistoryTvShows(sorted);
          } catch (e) {
            setHistoryTvShows([]);
          }
        } else {
          setHistoryTvShows([]);
        }
      }
    };
    updateHistory();
    window.addEventListener('focus', updateHistory);
    document.addEventListener('visibilitychange', updateHistory);
    return () => {
      window.removeEventListener('focus', updateHistory);
      document.removeEventListener('visibilitychange', updateHistory);
    };
  }, [allSeries]);
  
  // Handler hapus history
  const handleDeleteHistory = (id: string) => {
    if (typeof window === 'undefined') return;
    const historyStr = localStorage.getItem('movie_history');
    if (!historyStr) return;
    try {
      let parsed = JSON.parse(historyStr);
      parsed = parsed.filter((item: any) => item.id !== id);
      localStorage.setItem('movie_history', JSON.stringify(parsed));
      setHistoryTvShows((prev: any[]) => prev.filter((item) => item.id !== id));
    } catch {}
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        <Hero 
          id={featuredSeries?.id}
          title={featuredSeries?.title}
          overview={featuredSeries?.overview}
          backdrop_url={featuredSeries?.backdrop_url}
          poster_url={featuredSeries?.poster_url}
          contentType="tvshow"
          tmdb_id={featuredSeries?.tmdb_id}
        />
        
        {/* Refresh button - only show when content is loaded */}
        {featuredSeries && (
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing || isLoading}
            className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
            title="Show different TV show"
            aria-label="Show different TV show"
          >
            <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      
      {/* Main Content */}
      <div className="relative z-[40] w-full max-w-full mx-auto px-2 md:px-4 mt-[-30vh]">
        {/* Genre Menu - Dropdown at top right */}
        <div className="mb-6 flex justify-end relative z-[80]">
          <div className="bg-gray-800 bg-opacity-70 backdrop-blur-md rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white whitespace-nowrap">Genre:</h3>
              <GenreMenu 
                genres={genres} 
                selectedGenre={selectedGenre} 
                onSelectGenre={setSelectedGenre} 
                horizontal={false}
                useRouting={true}
                contentType="tvshow"
              />
            </div>
          </div>
        </div>
        {/* Section History TV Show */}
        {historyTvShows && historyTvShows.length > 0 && (
          <div className="mb-8">
            <LazyMovieRow
              title="Lanjutkan menonton TV Show..."
              movies={historyTvShows}
              limit={10}
              onDeleteHistory={handleDeleteHistory}
            />
          </div>
        )}
        
        {/* TV Shows Content */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-12 h-12 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-blue-900/30 text-blue-200 px-4 py-3 rounded-lg">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Show either genre-specific recommendations or diverse recommendations */}
              {selectedGenre ? (
                <GenreRecommendations 
                  selectedGenre={selectedGenre} 
                  contentType="tvshow" 
                />
              ) : (
                <>
                  {/* Trending TV Shows - Always show at top */}
                  <div className="mb-6">
                    <TrendingRecommendations contentType="tvshow" />
                  </div>
                  {/* Diverse Recommendations */}
                  <DiverseRecommendations contentType="tvshow" />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 