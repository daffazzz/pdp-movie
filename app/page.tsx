"use client";

import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import LazyMovieRow from './components/LazyMovieRow';
import DiverseRecommendations from './components/DiverseRecommendations';
import TrendingRecommendations from './components/TrendingRecommendations';
import { FaRandom } from 'react-icons/fa';
import { dbClient } from '../lib/dbClient';

// Define types for our data
interface Movie {
  id: string;
  title: string;
  description?: string;
  overview?: string;
  thumbnail_url: string;
  backdrop_url: string;
  poster_url: string;
  video_url?: string;
  rating: number;
  release_year: number;
  duration?: string;
  genre?: string[];
  director?: string;
  movie_cast?: string[];
  created_at?: string;
  popularity?: number;
  is_trending?: boolean;
  tmdb_id?: number;
}

interface Series {
  id: string;
  title: string;
  description?: string;
  overview?: string;
  thumbnail_url: string;
  backdrop_url: string;
  poster_url: string;
  video_url?: string;
  tmdb_id?: number;
  rating: number;
  release_year: number;
  seasons?: number;
  genre?: string[];
  director?: string;
  cast?: string[];
  created_at?: string;
  popularity?: number;
  is_trending?: boolean;
}

interface HistoryItem {
  id: string;
  title: string;
  thumbnail_url: string;
  type: 'movie' | 'tvshow';
  watched_at: string;
}

// Define a type for content with contentType
type ContentWithType = 
  | (Movie & { contentType: 'movie' })
  | (Series & { contentType: 'tvshow' });

// Function to get the first item from an array
const getFirstItem = <T,>(array: T[]): T | null => {
  if (!array || array.length === 0) return null;
  return array[0];
};

// Function to get a random item from an array
const getRandomItem = <T,>(array: T[]): T | null => {
  if (!array || array.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

// Function to select a featured media with weighted probability based on rating
const selectFeaturedContent = (items: any[]) => {
  if (!items || items.length === 0) return null;
  
  // Filter items with backdrop images
  const itemsWithBackdrops = items.filter(item => 
    item.backdrop_url && item.backdrop_url.trim() !== ''
  );
  
  if (itemsWithBackdrops.length === 0) return null;
  
  // Create a weighted list where higher rated items appear more times
  const weightedList: any[] = [];
  
  itemsWithBackdrops.forEach(item => {
    // Convert rating to a number between 1-10 or default to 5
    const rating = item.rating ? parseFloat(item.rating) : 5;
    const normalizedRating = Math.max(1, Math.min(10, rating));
    
    // Add item to the list multiple times based on rating (higher rating = more entries)
    const weight = Math.max(1, Math.floor(normalizedRating));
    for (let i = 0; i < weight; i++) {
      weightedList.push(item);
    }
    
    // Add popular/trending items extra weight
    if (item.is_trending || item.popularity > 0.7) {
      for (let i = 0; i < 3; i++) {
        weightedList.push(item);
      }
    }
    
    // Add newest items extra weight
    const createdAt = new Date(item.created_at || Date.now());
    const isRecent = (Date.now() - createdAt.getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days
    if (isRecent) {
      for (let i = 0; i < 2; i++) {
        weightedList.push(item);
      }
    }
  });
  
  // Select first item from weighted list (highest priority)
  return getFirstItem(weightedList);
};

// Constants for paging to reduce initial load time
const MOVIE_ROW_LIMIT = 10; // Show only 10 items per row by default

export default function Home() {
  // State to store the currently featured content
  const [featuredContent, setFeaturedContent] = useState<{
    id: string;
    title: string;
    overview: string;
    backdrop_url: string;
    poster_url?: string;
    contentType: 'movie' | 'tvshow';
    tmdb_id?: number;
    video_url?: string;
  } | null>(null);
  
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'tvshows'>('all');
  const [tvSeries, setTvSeries] = useState<any[]>([]);
  const [historyMovies, setHistoryMovies] = useState<HistoryItem[]>([]);
  const [historyTvShows, setHistoryTvShows] = useState<HistoryItem[]>([]);
  const [historyCombined, setHistoryCombined] = useState<HistoryItem[]>([]);
  
  // Function to select a new random featured content (movie or TV show)
  const refreshFeaturedContent = () => {
    if (allMovies.length === 0 && allSeries.length === 0) return;
    
    setRefreshing(true);
    
    // Get current content ID to avoid selecting the same one
    const currentId = featuredContent?.id;
    
    // Combine movies and series into a single array with type identifier
    const allContent = [
      ...allMovies.map(movie => ({ ...movie, contentType: 'movie' })),
      ...allSeries.map(series => ({ ...series, contentType: 'tvshow' }))
    ];
    
    // Filter to only content with backdrop images
    const contentWithBackdrops = allContent.filter(item => 
      item.backdrop_url && item.backdrop_url.trim() !== ''
    );
    
    // If no content with backdrops, return
    if (contentWithBackdrops.length === 0) {
      setRefreshing(false);
      return;
    }
    
    // Create a copy of the array to avoid modifying the original
    let availableContent = [...contentWithBackdrops];
    
    // If we have a current featured content, filter it out to avoid showing the same one
    if (currentId) {
      availableContent = availableContent.filter(content => content.id !== currentId);
    }
    
    // If we filtered out all content (only one item), use the full array
    if (availableContent.length === 0) {
      availableContent = contentWithBackdrops;
    }
    
    // Select a random item from the available content
    const randomIndex = Math.floor(Math.random() * availableContent.length);
    const randomContent = availableContent[randomIndex];
    
    if (randomContent) {
      // Check if video_url is missing or invalid
      const hasValidVideoUrl = randomContent.video_url && 
          (randomContent.video_url.includes('youtube.com') || 
           randomContent.video_url.includes('youtu.be'));
      
      // Use a type guard to ensure contentType is properly typed
      const contentType = randomContent.contentType === 'movie' ? 'movie' : 'tvshow';
      
      setFeaturedContent({
        id: randomContent.id,
        title: randomContent.title,
        overview: randomContent.description || randomContent.overview || 'No description available',
        backdrop_url: randomContent.backdrop_url,
        poster_url: randomContent.poster_url,
        contentType: contentType,
        tmdb_id: randomContent.tmdb_id,
        video_url: hasValidVideoUrl ? randomContent.video_url : undefined // Send undefined instead of fallback
      });
      
      console.log('Featured content refreshed with video URL:', 
        hasValidVideoUrl ? randomContent.video_url : 'No valid trailer available');
    }
    
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      
      try {
        // Fetch all movies using dbClient
        const { data: moviesData, error } = await dbClient.getMovies();
        
        if (error) {
          throw error;
        }

        console.log(`Home: Fetched ${moviesData?.length || 0} movies from database`);

        // Fetch all TV Series using dbClient
        const { data: seriesData, error: seriesError } = await dbClient.getSeries();
          
        if (seriesError) {
          console.error('Error fetching TV series:', seriesError);
        }

        console.log(`Home: Fetched ${seriesData?.length || 0} TV series from database`);

        // Store all movies for later use with refresh button
        setAllMovies(moviesData || []);

        // Filter series to only include those with a valid tmdb_id
        const validSeriesData = (seriesData || []).filter((series: Series) => 
          series.tmdb_id !== null && series.tmdb_id !== undefined
        );

        console.log(`Home: Filtered to ${validSeriesData.length} valid TV series with tmdb_id`);

        // Store all series for later use
        setAllSeries(validSeriesData || []);

        // Format TV series for the MovieRow component
        const formattedSeries = validSeriesData
          .filter((series: Series) => series.thumbnail_url && series.thumbnail_url.trim() !== '')
          .map((series: Series) => ({
            id: series.id,
            title: series.title,
            thumbnail_url: series.thumbnail_url || series.poster_url,
            rating: series.rating,
            tmdb_id: series.tmdb_id
          }));
        
        // Set TV series data
        setTvSeries(formattedSeries);
        console.log(`Home: Formatted ${formattedSeries.length} TV series for display`);

        // Set featured content to a random movie or TV show with backdrop image
        // Combine movies and series with backdrop images
        const contentWithBackdrops: ContentWithType[] = [
          ...(moviesData || [])
            .filter((m: Movie) => m.backdrop_url && m.backdrop_url.trim() !== '')
            .map((movie: Movie) => ({ ...movie, contentType: 'movie' as const })),
          ...(validSeriesData || [])
            .filter((s: Series) => s.backdrop_url && s.backdrop_url.trim() !== '')
            .map((series: Series) => ({ ...series, contentType: 'tvshow' as const }))
        ];
        
        if (contentWithBackdrops.length > 0) {
          // Select a random item from the content with backdrops
          const randomIndex = Math.floor(Math.random() * contentWithBackdrops.length);
          const randomContent = contentWithBackdrops[randomIndex];
          
          if (randomContent) {
            // Check if video_url is missing or invalid
            const hasValidVideoUrl = randomContent.video_url && 
                (randomContent.video_url.includes('youtube.com') || 
                 randomContent.video_url.includes('youtu.be'));
            
            // Use a type guard to ensure contentType is properly typed
            const contentType = randomContent.contentType === 'movie' ? 'movie' : 'tvshow';
            
            setFeaturedContent({
              id: randomContent.id,
              title: randomContent.title,
              overview: randomContent.description || randomContent.overview || 'No description available',
              backdrop_url: randomContent.backdrop_url,
              poster_url: randomContent.poster_url,
              contentType: contentType,
              tmdb_id: randomContent.tmdb_id,
              video_url: hasValidVideoUrl ? randomContent.video_url : undefined // Send undefined instead of fallback
            });
            
            console.log('Featured content set with video URL:', 
              hasValidVideoUrl ? randomContent.video_url : 'No valid trailer available');
          }
        }
        
        // Set trending movies
        const trending = (moviesData || [])
          .filter((movie: Movie) => 
            (movie.is_trending || (movie.popularity || 0) > 0.6) && 
            movie.thumbnail_url && 
            movie.thumbnail_url.trim() !== ''
          )
          .sort((a: Movie, b: Movie) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10);
          
        setTrendingMovies(trending.map((movie: Movie) => ({
          id: movie.id,
          title: movie.title,
          thumbnail_url: movie.thumbnail_url,
          rating: movie.rating
        })));
        
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, []);

  useEffect(() => {
    const updateHistory = () => {
      if (typeof window !== 'undefined') {
        const historyStr = localStorage.getItem('movie_history');
        if (historyStr) {
          try {
            const parsed = JSON.parse(historyStr);
            const movieIds = new Set(allMovies.map((m: any) => m.id));
            const seriesIds = new Set(allSeries.map((s: any) => s.id));
            const movies = parsed.filter((item: any) => movieIds.has(item.id)).map((item: any) => ({ ...item, type: 'movie' }));
            const tvshows = parsed.filter((item: any) => seriesIds.has(item.id)).map((item: any) => ({ ...item, type: 'tvshow' }));
            setHistoryMovies(movies);
            setHistoryTvShows(tvshows);
            // Gabungkan dan urutkan
            const combined = [...movies, ...tvshows].sort((a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime());
            setHistoryCombined(combined);
          } catch (e) {
            setHistoryMovies([]);
            setHistoryTvShows([]);
            setHistoryCombined([]);
          }
        } else {
          setHistoryMovies([]);
          setHistoryTvShows([]);
          setHistoryCombined([]);
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
  }, [allMovies, allSeries]);

  // Handler hapus history
  const handleDeleteHistory = (id: string) => {
    if (typeof window === 'undefined') return;
    const historyStr = localStorage.getItem('movie_history');
    if (!historyStr) return;
    try {
      let parsed = JSON.parse(historyStr);
      parsed = parsed.filter((item: any) => item.id !== id);
      localStorage.setItem('movie_history', JSON.stringify(parsed));
      // Update state
      setHistoryCombined((prev: any[]) => prev.filter((item) => item.id !== id));
      setHistoryMovies((prev: any[]) => prev.filter((item) => item.id !== id));
      setHistoryTvShows((prev: any[]) => prev.filter((item) => item.id !== id));
    } catch {}
  };

  return (
    <div className="relative pt-0 bg-gray-900">
      {/* Combined Hero and Content Section */}
      <div className="relative">
        {/* Hero Background */}
        <div className="relative">
          <Hero 
            id={featuredContent?.id}
            title={featuredContent?.title}
            overview={featuredContent?.overview}
            backdrop_url={featuredContent?.backdrop_url}
            poster_url={featuredContent?.poster_url}
            contentType={featuredContent?.contentType}
            tmdb_id={featuredContent?.tmdb_id}
            video_url={featuredContent?.video_url}
          />
          {/* Refresh button - only show when content is loaded */}
          {featuredContent && (
            <button
              onClick={refreshFeaturedContent}
              disabled={refreshing || isLoading}
              className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
              title="Show different movie or TV show"
              aria-label="Show different content"
            >
              <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        {/* Content Area integrated with Hero */}
        <div className="relative z-[90] w-full max-w-full mx-auto px-2 md:px-4 mt-[-30vh] movie-row-container">
          {/* Content Filter Tabs */}
          <div className="bg-transparent shadow-none rounded-t-lg mb-0">
            <div className="flex justify-center py-4">
              <div className="flex space-x-6">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-3 font-medium transition-all duration-300 ${activeTab === 'all' 
                    ? 'text-white border-b-2 border-red-600 scale-105' 
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-600'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveTab('movies')}
                  className={`px-5 py-3 font-medium transition-all duration-300 ${activeTab === 'movies' 
                    ? 'text-white border-b-2 border-red-600 scale-105' 
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-600'}`}
                >
                  Movies
                </button>
                <button 
                  onClick={() => setActiveTab('tvshows')}
                  className={`px-5 py-3 font-medium transition-all duration-300 ${activeTab === 'tvshows' 
                    ? 'text-white border-b-2 border-red-600 scale-105' 
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-600'}`}
                >
                  TV Shows
                </button>
              </div>
            </div>
            <div className="w-full h-px bg-gray-800/50 mt-0"></div>
          </div>
          {/* Section History - di bawah filter tab */}
          {historyCombined && historyCombined.length > 0 && (
            <LazyMovieRow
              title="Lanjutkan menonton..."
              movies={historyCombined}
              limit={10}
              onDeleteHistory={handleDeleteHistory}
            />
          )}
          
          {/* Content Section */}
          <div className="bg-transparent rounded-b-lg shadow-none pb-20">
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="pt-6">
                {/* Movies Section */}
                {(activeTab === 'all' || activeTab === 'movies') && (
                  <div className="mb-8">
                    <h2 className="text-xl md:text-2xl font-bold px-2 md:px-4 mb-4 flex items-center border-l-4 border-red-600 pl-3">
                      Movies
                    </h2>
                    {/* Trending Movies */}
                    <div className="mb-6">
                      <TrendingRecommendations contentType="movie" />
                    </div>
                    {/* Use the DiverseRecommendations component */}
                    <DiverseRecommendations contentType="movie" />
                  </div>
                )}
                
                {/* Divider - only show if both sections are visible */}
                {activeTab === 'all' && (
                  <div className="w-full max-w-full mx-auto px-2 md:px-4">
                    <div className="h-px bg-gray-800/50 my-8"></div>
                  </div>
                )}
                
                {/* TV Series Section */}
                {(activeTab === 'all' || activeTab === 'tvshows') && (
                  <div className={`${activeTab === 'tvshows' ? 'mt-0' : 'mt-10'}`}>
                    <h2 className="text-xl md:text-2xl font-bold px-2 md:px-4 mb-6 flex items-center border-l-4 border-blue-600 pl-3">
                      TV Shows
                    </h2>
                    {/* Trending TV Shows */}
                    <div className="mb-6">
                      <TrendingRecommendations contentType="tvshow" />
                    </div>
                    {tvSeries.length > 0 ? (
                      <>
                        {/* Use DiverseRecommendations for TV Shows */}
                        <div className="pb-10">
                          <DiverseRecommendations contentType="tvshow" />
                        </div>
                      </>
                    ) : (
                      <div className="px-2 md:px-4 py-6 text-gray-400 text-center bg-gray-800/20 rounded-lg">
                        No TV shows available at the moment.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
