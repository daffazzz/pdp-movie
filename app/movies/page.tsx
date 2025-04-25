"use client";

import { useState, useEffect } from 'react';
import MovieRow from '../components/MovieRow';
import { supabase } from '../../lib/supabaseClient';
import Hero from '../components/Hero';
import GenreMenu from '../components/GenreMenu';
import { FaRandom } from 'react-icons/fa';

// Genres yang tersedia
const genres = [
  { id: 'action', name: 'Action' },
  { id: 'drama', name: 'Drama' },
  { id: 'sci-fi', name: 'Sci-Fi' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'horror', name: 'Horror' },
  { id: 'thriller', name: 'Thriller' },
  { id: 'romance', name: 'Romance' },
  { id: 'adventure', name: 'Adventure' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'animation', name: 'Animation' },
  { id: 'crime', name: 'Crime' },
  { id: 'documentary', name: 'Documentary' },
  { id: 'family', name: 'Family' },
  { id: 'history', name: 'History' },
  { id: 'music', name: 'Music' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'war', name: 'War' },
  { id: 'western', name: 'Western' },
];

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
  contentType: 'movie' | 'tvshow';
}

export default function MoviesPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [movies, setMovies] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<FeaturedContent | null>(null);
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
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
        contentType: 'movie'
      });
    }
    
    setTimeout(() => setRefreshing(false), 600);
  };
  
  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all movies
        const { data: allMoviesData, error } = await supabase
          .from('movies')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }

        // Store all movies for featured content refresh
        setAllMovies(allMoviesData || []);
        
        // Set featured movie
        const featured = selectFeaturedMovie(allMoviesData || []);
        if (featured) {
          setFeaturedMovie({
            id: featured.id,
            title: featured.title,
            overview: featured.description || featured.overview || 'No description available',
            backdrop_url: featured.backdrop_url,
            contentType: 'movie'
          });
        }

        // Format movies for display
        const formatMovies = (movieList: any[]) => {
          return movieList.map(movie => ({
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
        genres.forEach(genre => {
          const genreName = genre.name;
          const genreMovies = allMoviesData?.filter(movie => {
            if (!movie.genre) return false;
            
            // Convert to array if it's not already
            const movieGenres = Array.isArray(movie.genre) 
              ? movie.genre 
              : movie.genre.split(',').map((g: string) => g.trim());
            
            // Convert both to lowercase for case-insensitive comparison
            const normalizedMovieGenres = movieGenres.map((g: string) => g.toLowerCase());
            const currentGenre = genreName.toLowerCase();
            
            // Special case handling
            if (genreName === 'Sci-Fi') {
              return normalizedMovieGenres.some((g: string) => 
                g.includes('sci-fi') || g.includes('science fiction')
              );
            }
            
            // For other genres, check if any genre includes the current genre name
            return normalizedMovieGenres.some((g: string) => 
              g.includes(currentGenre) || currentGenre.includes(g)
            );
          }) || [];
          
          moviesMap[genre.id] = formatMovies(genreMovies);
        });
        
        // Add popular category based on rating
        const popularMovies = [...(allMoviesData || [])]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 20);
        moviesMap['popular'] = formatMovies(popularMovies);
        
        // Add recent category
        const recentMovies = [...(allMoviesData || [])]
          .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 20);
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
    <div className="relative pt-0 bg-gray-900">
      {/* Hero Section */}
      {featuredMovie && (
        <div className="relative">
          <Hero 
            title={featuredMovie.title}
            overview={featuredMovie.overview}
            backdrop_url={featuredMovie.backdrop_url}
            id={featuredMovie.id}
            contentType="movie"
          />
          
          {/* Refresh button */}
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing}
            className={`absolute top-4 right-4 z-[60] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition ${
              refreshing ? 'animate-spin' : ''
            }`}
            aria-label="Show different featured movie"
          >
            <FaRandom size={18} />
          </button>
        </div>
      )}
      
      {/* Content Area - dengan margin top negative untuk menaikkan konten */}
      <div className="relative z-[90] w-full max-w-full mx-auto px-3 md:px-8 mt-[-25vh] movie-row-container">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl md:text-3xl font-bold">Movies</h1>
          
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
        
        {/* Movie listings */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Always show popular and recent categories */}
            {selectedGenre === null && (
              <>
                {movies['popular']?.length > 0 && (
                  <MovieRow 
                    title="Popular Movies"
                    movies={movies['popular']}
                    contentType="movie"
                  />
                )}
                
                {movies['recent']?.length > 0 && (
                  <MovieRow 
                    title="Recently Added"
                    movies={movies['recent']}
                    contentType="movie"
                  />
                )}
                
                {/* Show all genres */}
                {genres.map((genre) => (
                  movies[genre.id] && movies[genre.id].length > 0 && (
                    <MovieRow 
                      key={genre.id} 
                      title={genre.name} 
                      movies={movies[genre.id]}
                      contentType="movie"
                    />
                  )
                ))}
              </>
            )}
            
            {/* Show movies for selected genre */}
            {selectedGenre && movies[selectedGenre] && (
              movies[selectedGenre].length > 0 ? (
                <MovieRow 
                  title={genres.find(g => g.id === selectedGenre)?.name || selectedGenre} 
                  movies={movies[selectedGenre]} 
                  contentType="movie"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No movies available for this genre yet.</p>
                </div>
              )
            )}
            
            {/* Message when no movies are available */}
            {Object.values(movies).every(arr => arr.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">No movies available yet.</p>
                <p className="text-gray-500">Add some movies from the Admin Panel.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 