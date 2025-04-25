"use client";

import { useState, useEffect } from 'react';
import MovieRow from '../components/MovieRow';
import LazyMovieRow from '../components/LazyMovieRow';
import { supabase } from '../../lib/supabaseClient';
import Hero from '../components/Hero';
import GenreMenu from '../components/GenreMenu';
import GenreRecommendations from '../components/GenreRecommendations';
import { FaRandom } from 'react-icons/fa';

// Constants for optimized data loading
const TV_ROW_LIMIT = 10; // Default number of TV shows to show per row
const INITIAL_TV_PER_GENRE = 20; // Number of TV shows to load initially per genre

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
  
  // Return one of the top 5 series randomly
  const topSeries = sortedSeries.slice(0, 5);
  const randomIndex = Math.floor(Math.random() * topSeries.length);
  return topSeries[randomIndex];
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
  const [series, setSeries] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredSeries, setFeaturedSeries] = useState<FeaturedContent | null>(null);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  
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
    
    do {
      const randomIndex = Math.floor(Math.random() * seriesWithBackdrops.length);
      randomSeries = seriesWithBackdrops[randomIndex];
      attempts++;
    } while (
      randomSeries && 
      currentId && 
      randomSeries.id === currentId && 
      attempts < 5
    );
    
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
          show.genre.forEach((g: string) => genreSet.add(g.trim()));
        } else if (typeof show.genre === 'string') {
          show.genre.split(',').forEach((g: string) => genreSet.add(g.trim()));
        }
      }
    });
    
    // Convert to array and format as Genre objects with id and name
    return Array.from(genreSet)
      .filter(genre => genre) // Filter out empty strings
      .sort() // Sort alphabetically
      .map(genre => ({
        id: genre.toLowerCase().replace(/\s+/g, '-'), // Convert "Sci-Fi" to "sci-fi"
        name: genre // Keep original name for display
      }));
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

        // Format series for display
        const formatSeries = (seriesList: any[]) => {
          return seriesList.map(show => ({
            id: show.id,
            title: show.title,
            thumbnail_url: show.poster_url || show.thumbnail_url,
            rating: show.rating,
            tmdb_id: show.tmdb_id
          }));
        };

        // Group series by genre
        const seriesMap: Record<string, any[]> = {};
        
        // Add the all series category
        seriesMap['all'] = formatSeries(allSeriesData || []);
        
        // Group by genre
        extractedGenres.forEach(genre => {
          const genreName = genre.name;
          const genreSeries = allSeriesData?.filter(show => {
            // Match genre with more flexibility
            if (!show.genre) return false;
            
            // Direct genre name matching
            if (Array.isArray(show.genre)) {
              return show.genre.some((g: string) => g.trim() === genreName);
            } else if (typeof show.genre === 'string') {
              return show.genre.split(',').some((g: string) => g.trim() === genreName);
            }
            
            return false;
          }) || [];
          
          if (genreSeries.length > 0) {
            seriesMap[genre.id] = formatSeries(genreSeries);
          }
        });
        
        // Add popular category based on rating
        const popularSeries = [...(allSeriesData || [])]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, INITIAL_TV_PER_GENRE);
        seriesMap['popular'] = formatSeries(popularSeries);
        
        // Add recent category
        const recentSeries = [...(allSeriesData || [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, INITIAL_TV_PER_GENRE);
        seriesMap['recent'] = formatSeries(recentSeries);
        
        setSeries(seriesMap);
      } catch (err: any) {
        console.error('Error fetching series:', err);
        setError(err.message || 'An error occurred while fetching series');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeries();
  }, []);
  
  return (
    <div className="relative pt-0 bg-gray-900">
      {/* Hero Section */}
      {featuredSeries && (
        <div className="relative">
          <Hero 
            title={featuredSeries.title}
            overview={featuredSeries.overview}
            backdrop_url={featuredSeries.backdrop_url}
            poster_url={featuredSeries.poster_url}
            id={featuredSeries.id}
            contentType="tvshow"
          />
          
          {/* Refresh button */}
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing}
            className={`absolute top-4 right-4 z-[60] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition ${
              refreshing ? 'animate-spin' : ''
            }`}
            aria-label="Show different featured series"
          >
            <FaRandom size={18} />
          </button>
        </div>
      )}
      
      {/* Content Area - with negative top margin to raise content */}
      <div className="relative z-[90] w-full max-w-full mx-auto px-3 md:px-8 mt-[-25vh] movie-row-container">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl md:text-3xl font-bold">TV Shows</h1>
          
          {/* Genre dropdown */}
          <GenreMenu 
            genres={genres}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
          />
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-md mb-4">
            <p>Error: {error}</p>
            <p className="text-sm mt-1">Please try refreshing the page.</p>
          </div>
        )}
        
        {/* Series listings */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Always show popular and recent categories */}
            {selectedGenre === null && (
              <>
                {series['popular']?.length > 0 && (
                  <MovieRow 
                    title="Popular TV Shows"
                    movies={series['popular']}
                    contentType="tvshow"
                    limit={TV_ROW_LIMIT}
                  />
                )}
                
                {series['recent']?.length > 0 && (
                  <MovieRow 
                    title="Recently Added"
                    movies={series['recent']}
                    contentType="tvshow"
                    limit={TV_ROW_LIMIT}
                  />
                )}
                
                {/* Show all genres with lazy loading */}
                {genres.map((genre) => (
                  series[genre.id] && series[genre.id].length > 0 && (
                    <LazyMovieRow 
                      key={genre.id} 
                      title={genre.name} 
                      movies={series[genre.id]}
                      contentType="tvshow"
                      limit={TV_ROW_LIMIT}
                    />
                  )
                ))}
              </>
            )}
            
            {/* Show series for selected genre */}
            {selectedGenre && series[selectedGenre] && (
              series[selectedGenre].length > 0 ? (
                <>
                  <MovieRow 
                    title={genres.find(g => g.id === selectedGenre)?.name || selectedGenre} 
                    movies={series[selectedGenre]} 
                    contentType="tvshow"
                    limit={20} // Show more series when a specific genre is selected
                  />
                  
                  {/* Add recommendations based on selected genre */}
                  <GenreRecommendations 
                    selectedGenre={genres.find(g => g.id === selectedGenre)?.name || selectedGenre}
                    contentType="tvshow"
                  />
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No TV shows available for this genre yet.</p>
                </div>
              )
            )}
            
            {/* Message when no series are available */}
            {Object.values(series).every(arr => arr.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">No TV shows available yet.</p>
                <p className="text-gray-500">Add some TV shows from the Admin Panel.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 