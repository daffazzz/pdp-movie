"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import Hero from '../../../components/Hero';
import GenreMenu from '../../../components/GenreMenu';
import GenreRecommendations from '../../../components/GenreRecommendations';
import { FaRandom } from 'react-icons/fa';

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

export default function GenreMoviesPage() {
  const params = useParams();
  const genreId = params?.genre as string;
  
  const [selectedGenre, setSelectedGenre] = useState<string | null>(genreId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<FeaturedContent | null>(null);
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  
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
            
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
            } else if (genre.toLowerCase() === 'sci-fi & fantasy') {
              genreSet.add('Sci-Fi');
              genreSet.add('Fantasy');
            } else if (genre.toLowerCase() === 'science fiction') {
              genreSet.add('Sci-Fi');
            } else {
              genreSet.add(genre);
            }
          });
        } else if (typeof movie.genre === 'string') {
          movie.genre.split(',').forEach((g: string) => {
            const genre = g.trim();
            
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
            } else if (genre.toLowerCase() === 'sci-fi & fantasy') {
              genreSet.add('Sci-Fi');
              genreSet.add('Fantasy');
            } else if (genre.toLowerCase() === 'science fiction') {
              genreSet.add('Sci-Fi');
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
        // Normalize ID for special genres
        let genreId;
        if (genre === "Science Fiction" || genre === "Sci-Fi") {
          genreId = "sci-fi";
        } else {
          genreId = genre.toLowerCase().replace(/[\s&]+/g, '-'); // Convert to lowercase and handle ampersands
        }
        return {
          id: genreId,
          name: genre // Keep original name for display
        };
      });
  };
  
  useEffect(() => {
    const fetchMoviesByGenre = async () => {
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
        
        // Normalize genre ID for consistency
        let normalizedGenreId = genreId;
        if (normalizedGenreId === 'science-fiction') {
          normalizedGenreId = 'sci-fi';
        }
        
        // Filter movies by selected genre
        let currentGenre = extractedGenres.find(g => g.id === normalizedGenreId);
        
        // Special handling for sci-fi variations in URL
        if (!currentGenre && normalizedGenreId === 'sci-fi') {
          currentGenre = extractedGenres.find(g => 
            g.id === 'sci-fi' || 
            g.name === 'Science Fiction' || 
            g.name === 'Sci-Fi'
          );
        }
        
        if (!currentGenre) {
          throw new Error(`Genre ${genreId} not found`);
        }
        
        // Update selected genre to the normalized version for consistency
        setSelectedGenre(normalizedGenreId);
        
        // Filter movies by genre
        const genreMovies = allMoviesData?.filter(movie => {
          if (!movie.genre) return false;
          
          // Convert to array if it's not already
          const movieGenres = Array.isArray(movie.genre) 
            ? movie.genre 
            : movie.genre.split(',').map((g: string) => g.trim());
          
          // More flexible matching for special genres like Sci-Fi
          return movieGenres.some((g: string) => {
            const trimmedGenre = g.trim();
            
            if (currentGenre.name === 'Sci-Fi' || currentGenre.name === 'Science Fiction') {
              // Match both "Sci-Fi", "Science Fiction", and "Sci-Fi & Fantasy"
              return (
                trimmedGenre.toLowerCase() === 'sci-fi' || 
                trimmedGenre.toLowerCase() === 'science fiction' || 
                trimmedGenre.toLowerCase().includes('sci-fi')
              );
            }
            
            // Default case: direct genre name matching
            return trimmedGenre === currentGenre.name;
          });
        }) || [];
        
        // Set featured movie from the genre
        const featured = selectFeaturedMovie(genreMovies);
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
      } catch (err: any) {
        console.error('Error fetching movies:', err);
        setError(err.message || 'An error occurred while fetching movies');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoviesByGenre();
  }, [genreId]);
  
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
                useRouting={true}
                contentType="movie"
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
              {/* Genre Recommendations - Enhanced to always include Netflix content for each genre */}
              <GenreRecommendations 
                selectedGenre={genreId} 
                contentType="movie" 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
