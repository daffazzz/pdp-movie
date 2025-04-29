"use client";

import { useState, useEffect, Suspense } from 'react';
import MovieRow from '../components/MovieRow';
import LazyMovieRow from '../components/LazyMovieRow';
import { supabase } from '../../lib/supabaseClient';
import Hero from '../components/Hero';
import GenreMenu from '../components/GenreMenu';
import GenreRecommendations from '../components/GenreRecommendations';
import DiverseRecommendations from '../components/DiverseRecommendations';
import { FaRandom } from 'react-icons/fa';

// Constants for optimized data loading
const MOVIE_ROW_LIMIT = 10; // Default number of movies to show per row
const INITIAL_MOVIES_PER_GENRE = 20; // Number of movies to load initially per genre

// Function to select a featured movie (highest rated with backdrop)
const selectFeaturedMovie = (moviesList: any[]) => {
  if (!moviesList || moviesList.length === 0) return null;
  
  // Filter movies with backdrop images
  const moviesWithBackdrops = moviesList.filter(movie => 
    movie.backdrop_url && movie.backdrop_url.trim() !== ''
  );
  
  if (moviesWithBackdrops.length === 0) return null;
  
  // Sort by rating (highest first)
  const sortedMovies = [...moviesWithBackdrops].sort((a, b) => b.rating - a.rating);
  
  // Return one of the top 5 movies randomly
  const topMovies = sortedMovies.slice(0, 5);
  const randomIndex = Math.floor(Math.random() * topMovies.length);
  return topMovies[randomIndex];
};

interface FeaturedContent {
  id: string;
  title: string;
  overview: string;
  backdrop_url: string;
  poster_url?: string;
  contentType: 'movie' | 'tvshow';
}

interface Genre {
  id: string;
  name: string;
}

export default function MoviesPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [movies, setMovies] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<FeaturedContent | null>(null);
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  
  // Function to refresh the featured content
  const refreshFeaturedContent = () => {
    if (allMovies.length === 0) return;
    
    setRefreshing(true);
    
    // Get current content ID to avoid selecting the same one
    const currentId = featuredMovie?.id;
    
    // Filter to only movies with backdrop images
    const moviesWithBackdrops = allMovies.filter(item => 
      item.backdrop_url && item.backdrop_url.trim() !== ''
    );
    
    if (moviesWithBackdrops.length === 0) {
      setRefreshing(false);
      return;
    }
    
    // Try to find different content
    let attempts = 0;
    let randomMovie;
    
    do {
      const randomIndex = Math.floor(Math.random() * moviesWithBackdrops.length);
      randomMovie = moviesWithBackdrops[randomIndex];
      attempts++;
    } while (
      randomMovie && 
      currentId && 
      randomMovie.id === currentId && 
      attempts < 5
    );
    
    if (randomMovie) {
      setFeaturedMovie({
        id: randomMovie.id,
        title: randomMovie.title,
        overview: randomMovie.description || randomMovie.overview || 'No description available',
        backdrop_url: randomMovie.backdrop_url,
        poster_url: randomMovie.poster_url,
        contentType: 'movie'
      });
    }
    
    setTimeout(() => setRefreshing(false), 600);
  };
  
  // Extract unique genres from the database
  const extractGenresFromMovies = (moviesData: any[]): Genre[] => {
    const genreSet = new Set<string>();
    
    // Collect all unique genres
    moviesData.forEach(movie => {
      if (movie.genre) {
        if (Array.isArray(movie.genre)) {
          movie.genre.forEach((g: string) => {
            const genre = g.trim();
            
            // Pisahkan "Action & Adventure" menjadi "Action" dan "Adventure" terpisah
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
            } else {
              genreSet.add(genre);
            }
          });
        } else if (typeof movie.genre === 'string') {
          movie.genre.split(',').forEach((g: string) => {
            const genre = g.trim();
            
            // Pisahkan "Action & Adventure" menjadi "Action" dan "Adventure" terpisah
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
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
        // Normalisasi ID untuk genre "Science Fiction"
        let genreId;
        if (genre === "Science Fiction") {
          genreId = "science-fiction";
        } else {
          genreId = genre.toLowerCase().replace(/[\s&]+/g, '-'); // Convert "Sci-Fi" to "sci-fi" and handle ampersands
        }
        return {
          id: genreId,
          name: genre // Keep original name for display
        };
      });
  };
  
  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if Supabase client is available
        if (!supabase) {
          throw new Error('Supabase client is not initialized. Check your environment variables.');
        }
        
        // Use a non-null assertion since we've checked above
        const { data: allMoviesData, error } = await (supabase as NonNullable<typeof supabase>)
          .from('movies')
          .select('*')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'eq', '')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }

        // Store all movies for featured content refresh
        setAllMovies(allMoviesData || []);
        
        // Extract genres from the database
        const extractedGenres = extractGenresFromMovies(allMoviesData || []);
        setGenres(extractedGenres);
        
        // Set featured movie
        const featured = selectFeaturedMovie(allMoviesData || []);
        if (featured) {
          setFeaturedMovie({
            id: featured.id,
            title: featured.title,
            overview: featured.description || featured.overview || 'No description available',
            backdrop_url: featured.backdrop_url,
            poster_url: featured.poster_url,
            contentType: 'movie'
          });
        }

        // Set trending movies
        const trending = allMoviesData
          ?.filter(movie => 
            (movie.is_trending || movie.popularity > 0.6) && 
            movie.thumbnail_url && 
            movie.thumbnail_url.trim() !== ''
          )
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10) || [];
          
        setTrendingMovies(trending.map(movie => ({
          id: movie.id,
          title: movie.title,
          thumbnail_url: movie.thumbnail_url || movie.poster_url,
          rating: movie.rating
        })));

        // Format movies for display
        const formatMovies = (movieList: any[]) => {
          return movieList
            .filter(movie => movie.thumbnail_url && movie.thumbnail_url.trim() !== '')
            .map(movie => ({
              id: movie.id,
              title: movie.title,
              thumbnail_url: movie.thumbnail_url || movie.poster_url,
              rating: movie.rating
            }));
        };

        // Group movies by genre
        const moviesMap: Record<string, any[]> = {};
        
        // Add the all movies category
        moviesMap['all'] = formatMovies(allMoviesData || []);
        
        // Group by genre
        extractedGenres.forEach(genre => {
          const genreName = genre.name;
          const genreId = genre.id;
          const genreMovies = allMoviesData?.filter(movie => {
            if (!movie.genre) return false;
            
            // Convert to array if it's not already
            const movieGenres = Array.isArray(movie.genre) 
              ? movie.genre 
              : movie.genre.split(',').map((g: string) => g.trim());
            
            // Direct genre name matching
            return movieGenres.some((g: string) => g.trim() === genreName);
          }) || [];
          
          if (genreMovies.length > 0) {
            moviesMap[genreId] = formatMovies(genreMovies);
          }
        });
        
        // Add popular category based on rating
        const popularMovies = [...(allMoviesData || [])]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, INITIAL_MOVIES_PER_GENRE);
        moviesMap['popular'] = formatMovies(popularMovies);
        
        // Add recent category
        const recentMovies = [...(allMoviesData || [])]
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, INITIAL_MOVIES_PER_GENRE);
        moviesMap['recent'] = formatMovies(recentMovies);
        
        setMovies(moviesMap);
      } catch (err: any) {
        console.error('Error fetching movies:', err);
        setError(err.message || 'An error occurred while fetching movies');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative">
        <Hero 
          id={featuredMovie?.id}
          title={featuredMovie?.title}
          overview={featuredMovie?.overview}
          backdrop_url={featuredMovie?.backdrop_url}
          poster_url={featuredMovie?.poster_url}
          contentType="movie"
        />
        
        {/* Refresh button - only show when content is loaded */}
        {featuredMovie && (
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing || isLoading}
            className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
            title="Show different movie"
            aria-label="Show different movie"
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
              />
            </div>
          </div>
        </div>
        
        {/* Movie Content */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Show either genre-specific recommendations or diverse recommendations */}
              {selectedGenre ? (
                <GenreRecommendations 
                  selectedGenre={selectedGenre} 
                  contentType="movie" 
                />
              ) : (
                <>
                  {/* Diverse Recommendations */}
                  <DiverseRecommendations contentType="movie" />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 