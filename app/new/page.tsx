"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlay, FaInfoCircle, FaPlus, FaFilter, FaChevronDown, FaCalendarAlt, FaStar, FaRegClock, FaRandom } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface FilterOptions {
  timeframe: 'week' | 'month' | 'year' | 'all';
  sortBy: 'newest' | 'rating' | 'popular';
  genre: string | null;
}

// Helper function to filter movies by time period
function getTimeFilteredMovies(movies: Movie[], timeframe: 'week' | 'month' | 'year'): Movie[] {
  if (!movies || movies.length === 0) return [];
  
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (timeframe) {
    case 'week':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return movies.filter(movie => {
    if (!movie.created_at) return false;
    const movieDate = new Date(movie.created_at);
    return movieDate >= cutoffDate;
  });
}

// Helper function to extract unique genres from movies
function extractGenres(movies: Movie[]): string[] {
  const genreSet = new Set<string>();
  
  movies.forEach(movie => {
    if (movie.genre) {
      if (Array.isArray(movie.genre)) {
        movie.genre.forEach(g => {
          if (g && typeof g === 'string' && g.trim() !== '') {
            genreSet.add(g.trim());
          }
        });
      } else if (typeof movie.genre === 'string' && movie.genre.trim() !== '') {
        genreSet.add(movie.genre.trim());
      }
    }
  });
  
  return Array.from(genreSet).sort();
}

// Helper function to select a featured movie
function selectFeaturedMovie(movies: Movie[]): Movie | null {
  if (!movies || movies.length === 0) return null;
  
  // Filter for movies with backdrop images and good rating
  const eligibleMovies = movies.filter(
    movie => movie.backdrop_url && movie.rating >= 7
  );
  
  if (eligibleMovies.length === 0) {
    // Fall back to any movie with a backdrop
    const withBackdrops = movies.filter(movie => movie.backdrop_url);
    return withBackdrops.length > 0 ? withBackdrops[0] : null;
  }
  
  // Pick the highest rated movie
  return eligibleMovies[0];
}

// Movie type definition
interface Movie {
  id: string;
  title: string;
  description?: string;
  overview?: string;
  thumbnail_url?: string;
  backdrop_url?: string;
  poster_url?: string;
  genre?: string[] | string;
  rating: number;
  created_at: string;
  tmdb_id?: string;
  // Add other fields as needed
}

// Constants for pagination and limiting displayed items
const ITEMS_PER_PAGE = 24; // Number of movies per page in grid view
const MAX_MOVIES_PER_ROW = 15; // Maximum movies to display in each row
const INITIAL_FETCH_LIMIT = 100; // Limit initial fetch from database

export default function NewAndPopularPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'new' | 'popular'>('new');
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    timeframe: 'month',
    sortBy: 'newest',
    genre: null
  });
  const [genres, setGenres] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMovies, setTotalMovies] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  // Get filtered and sorted movies based on all applied filters
  const filteredMovies = useMemo(() => {
    if (!allMovies || allMovies.length === 0) return [];
    
    // Only show movies with thumbnails
    let filtered = allMovies.filter(movie => 
      movie.thumbnail_url && movie.thumbnail_url.trim() !== ''
    );
    
    // Apply time filter
    if (filters.timeframe !== 'all') {
      filtered = getTimeFilteredMovies(filtered, filters.timeframe);
    }
    
    // Apply genre filter
    if (filters.genre) {
      filtered = filtered.filter(movie => 
        movie.genre && 
        Array.isArray(movie.genre) && 
        movie.genre.some(g => g.trim() === filters.genre)
      );
    }
    
    // Apply sorting
    let sorted = [...filtered];
    switch (filters.sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        // Using rating as a proxy for popularity in this context
        sorted.sort((a, b) => b.rating - a.rating);
        break;
    }
    
    // Update total count for pagination
    setTotalMovies(sorted.length);
    
    return sorted;
  }, [allMovies, filters]);
  
  // Get paginated movies for current page
  const paginatedMovies = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMovies.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredMovies, currentPage]);

  // Categorize new releases by when they were added - limit to improve performance
  const thisWeekReleases = useMemo(() => 
    getTimeFilteredMovies(allMovies, 'week').slice(0, MAX_MOVIES_PER_ROW), 
    [allMovies]
  );
  
  const thisMonthReleases = useMemo(() => 
    getTimeFilteredMovies(allMovies, 'month').slice(0, MAX_MOVIES_PER_ROW), 
    [allMovies]
  );

  // Top rated content for the "Popular" tab - limited for performance
  const topRatedMovies = useMemo(() => {
    return [...allMovies]
      .filter(movie => movie.thumbnail_url && movie.thumbnail_url.trim() !== '')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, MAX_MOVIES_PER_ROW);
  }, [allMovies]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if Supabase client is available
        if (!supabase) {
          throw new Error('Supabase client is not initialized. Check your environment variables.');
        }
        
        // Fetch movies with pagination on initial load to improve performance
        const query = supabase
          .from('movies')
          .select('*')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'eq', '');
          
        // Apply limit for initial load
        if (initialLoad) {
          query.limit(INITIAL_FETCH_LIMIT);
        }
        
        // Always sort by recently added first for initial display
        query.order('created_at', { ascending: false });
        
        const { data: moviesData, error } = await query;
        
        if (error) {
          throw error;
        }

        const formattedMovies = (moviesData || []) as Movie[];
        setAllMovies(formattedMovies);
        setInitialLoad(false);
        
        // Extract genres
        const extractedGenres = extractGenres(formattedMovies);
        setGenres(extractedGenres);
        
        // Select a featured movie
        const featured = selectFeaturedMovie(formattedMovies);
        if (featured) {
          setFeaturedMovie(featured);
        }
      } catch (err: any) {
        console.error('Error fetching movies:', err);
        setError(err.message || 'An error occurred while fetching movies');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [initialLoad]);

  // Load more data if we're close to the end of our initial fetch
  useEffect(() => {
    const loadMoreIfNeeded = async () => {
      // If we've used more than 80% of our initial fetch limit, fetch more
      if (
        !initialLoad && 
        !isLoading && 
        currentPage > 1 && 
        filteredMovies.length > 0 && 
        filteredMovies.length < totalMovies &&
        (currentPage * ITEMS_PER_PAGE) > (allMovies.length * 0.8)
      ) {
        try {
          setIsLoading(true);
          
          if (!supabase) {
            throw new Error('Supabase client is not initialized');
          }
          
          const { data: moreMovies, error } = await supabase
            .from('movies')
            .select('*')
            .not('thumbnail_url', 'is', null)
            .not('thumbnail_url', 'eq', '')
            .order('created_at', { ascending: false })
            .range(allMovies.length, allMovies.length + INITIAL_FETCH_LIMIT - 1);
            
          if (error) {
            throw error;
          }
          
          if (moreMovies && moreMovies.length > 0) {
            setAllMovies(prev => [...prev, ...(moreMovies as Movie[])]);
          }
        } catch (err: any) {
          console.error('Error loading more movies:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadMoreIfNeeded();
  }, [currentPage, filteredMovies.length, totalMovies, allMovies.length, initialLoad, isLoading]);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  // Pagination controls
  const totalPages = Math.ceil(totalMovies / ITEMS_PER_PAGE);
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Function to refresh featured movie
  const refreshFeaturedMovie = () => {
    setRefreshing(true);
    
    // Filter for movies with backdrop images
    const eligibleMovies = allMovies.filter(movie => 
      movie.backdrop_url && 
      movie.id !== featuredMovie?.id // Exclude current featured movie
    );
    
    if (eligibleMovies.length > 0) {
      // Pick the first movie
      const randomIndex = 0;
      setFeaturedMovie(eligibleMovies[randomIndex]);
    }
    
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  // Pagination UI component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-center mt-8 items-center space-x-2">
        <button 
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-md ${currentPage === 1 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          First
        </button>
        
        <button 
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-md ${currentPage === 1 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          Prev
        </button>
        
        <span className="px-3 py-1 bg-gray-800 rounded-md text-white">
          {currentPage} of {totalPages}
        </span>
        
        <button 
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-md ${currentPage === totalPages 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          Next
        </button>
        
        <button 
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-md ${currentPage === totalPages 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-800 text-white hover:bg-gray-700'}`}
        >
          Last
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Featured New Release */}
      <div className="relative">
        {featuredMovie && (
          <Hero 
            id={featuredMovie.id}
            title={featuredMovie.title}
            overview={featuredMovie.description || featuredMovie.overview || 'No description available'}
            backdrop_url={featuredMovie.backdrop_url || ''}
            poster_url={featuredMovie.poster_url}
            contentType="movie"
            tmdb_id={featuredMovie.tmdb_id}
          />
        )}
        
        {/* Refresh button for featured content */}
        {featuredMovie && (
          <button
            onClick={refreshFeaturedMovie}
            disabled={refreshing || isLoading}
            className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
            title="Show different movie"
            aria-label="Show different movie"
          >
            <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      
      {/* Main Content Area */}
      <div className="relative z-40 w-full max-w-full mx-auto px-4 md:px-6 pt-4 mt-[-30vh]">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {activeTab === 'new' ? 'New Releases' : 'Popular Content'}
              </h1>
              <p className="text-gray-400 mt-1">
                {activeTab === 'new' 
                  ? 'Discover the latest additions to our catalog'
                  : 'Top-rated movies that everyone is watching'}
              </p>
            </div>
      
      {/* Tabs */}
            <div className="mt-4 md:mt-0 flex space-x-3">
        <button
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'new' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('new')}
        >
                New
        </button>
        <button
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'popular' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('popular')}
        >
          Popular
        </button>
              
              {/* Filter Button */}
              <button
                onClick={toggleFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-md transition-all"
              >
                <FaFilter size={14} />
                Filter
                <FaChevronDown size={10} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="bg-gray-800/70 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Time Period Filter */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center">
                  <FaCalendarAlt className="mr-2" size={14} />
                  Time Period
                </label>
                <select
                  value={filters.timeframe}
                  onChange={(e) => setFilters({...filters, timeframe: e.target.value as any})}
                  className="bg-gray-700 text-white rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              
              {/* Sort By Filter */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center">
                  <FaStar className="mr-2" size={14} />
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
                  className="bg-gray-700 text-white rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="rating">Highest Rated</option>
                  <option value="popular">Most Popular</option>
                </select>
      </div>
      
              {/* Genre Filter */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center">
                  <FaRegClock className="mr-2" size={14} />
                  Genre
                </label>
                <select
                  value={filters.genre || ''}
                  onChange={(e) => setFilters({...filters, genre: e.target.value || null})}
                  className="bg-gray-700 text-white rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Genres</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
        </div>
      )}
      
          {/* Loading State */}
          {isLoading && initialLoad && (
            <div className="flex justify-center items-center py-16">
              <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
      )}
      
          {/* Error State */}
          {error && (
            <div className="bg-red-900/30 border border-red-600/50 text-white p-4 rounded-md mb-6">
              <p className="font-medium">Error: {error}</p>
              <p className="text-sm mt-1 text-gray-300">Please try refreshing the page.</p>
            </div>
          )}
          
          {/* New Releases Content */}
          {!initialLoad && !error && activeTab === 'new' && (
            <div className="space-y-10">
              {/* Movies matching all filters */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4 border-l-4 border-red-600 pl-3">
                  {filters.genre ? `${filters.genre} Movies` : 'All New Releases'}
                  {filters.timeframe !== 'all' && ` - ${filters.timeframe === 'week' ? 'This Week' : filters.timeframe === 'month' ? 'This Month' : 'This Year'}`}
                  {totalMovies > 0 && ` (${totalMovies})`}
                </h2>
                
                {paginatedMovies.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-400">No movies match your current filters.</p>
                      <button
                      onClick={() => setFilters({timeframe: 'month', sortBy: 'newest', genre: null})}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 staggered-fade-in">
                      {paginatedMovies.map((movie) => (
                        <div key={movie.id} className="animate-fadeIn">
                          <MovieCard
                            id={movie.id}
                            title={movie.title}
                            thumbnail_url={movie.thumbnail_url || ''}
                            rating={movie.rating}
                            type="movie"
                            tmdb_id={movie.tmdb_id}
                          />
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination Controls */}
                    <PaginationControls />
                    
                    {/* Loading indicator for pagination */}
                    {isLoading && !initialLoad && (
                      <div className="flex justify-center py-4">
                        <div className="w-8 h-8 border-t-2 border-red-600 border-solid rounded-full animate-spin"></div>
                </div>
                    )}
                  </>
                )}
              </div>
              
              {/* This Week's Releases - if not already filtered to this week */}
              {filters.timeframe !== 'week' && filters.genre === null && thisWeekReleases.length > 0 && (
                <div className="animate-slideInFade" style={{ animationDelay: '0.2s' }}>
                  <MovieRow 
                    title={`Added This Week (${thisWeekReleases.length})`}
                    movies={thisWeekReleases.map(movie => ({
                      id: movie.id,
                      title: movie.title,
                      thumbnail_url: movie.thumbnail_url || '',
                      rating: movie.rating,
                      tmdb_id: movie.tmdb_id
                    }))} 
                    limit={10}
                    contentType="movie"
                  />
                    </div>
              )}
              
              {/* This Month's Releases - if not already filtered to this month */}
              {filters.timeframe !== 'month' && filters.genre === null && thisMonthReleases.length > 0 && (
                <div className="animate-slideInFade" style={{ animationDelay: '0.4s' }}>
                  <MovieRow 
                    title={`Added This Month (${thisMonthReleases.length})`}
                    movies={thisMonthReleases.map(movie => ({
                      id: movie.id,
                      title: movie.title,
                      thumbnail_url: movie.thumbnail_url || '',
                      rating: movie.rating,
                      tmdb_id: movie.tmdb_id
                    }))} 
                    limit={10}
                    contentType="movie"
                  />
                </div>
              )}
                  </div>
          )}
          
          {/* Popular Content */}
          {!initialLoad && !error && activeTab === 'popular' && (
            <div className="space-y-10">
              {filters.genre ? (
                <>
                  <h2 className="text-xl font-bold text-white mb-4 border-l-4 border-red-600 pl-3">
                    Popular {filters.genre} Movies {totalMovies > 0 && `(${totalMovies})`}
                  </h2>
                  
                  {paginatedMovies.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-gray-400">No popular movies found in the {filters.genre} genre.</p>
                      <button
                        onClick={() => setFilters({...filters, genre: null})}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Show All Genres
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 staggered-fade-in">
                        {paginatedMovies.map((movie) => (
                          <div key={movie.id} className="animate-fadeIn">
                            <MovieCard
                              id={movie.id}
                              title={movie.title}
                              thumbnail_url={movie.thumbnail_url || ''}
                              rating={movie.rating}
                              type="movie"
                              tmdb_id={movie.tmdb_id}
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination Controls */}
                      <PaginationControls />
                      
                      {/* Loading indicator for pagination */}
                      {isLoading && !initialLoad && (
                        <div className="flex justify-center py-4">
                          <div className="w-8 h-8 border-t-2 border-red-600 border-solid rounded-full animate-spin"></div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="animate-slideInFade">
                    <MovieRow 
                      title={`Top Rated (${topRatedMovies.length})`}
                      movies={topRatedMovies.map(movie => ({
                        id: movie.id,
                        title: movie.title,
                        thumbnail_url: movie.thumbnail_url || '',
                        rating: movie.rating,
                        tmdb_id: movie.tmdb_id
                      }))} 
                      limit={10}
                      contentType="movie"
                    />
                  </div>
                  
                  {/* Genre-specific popular content - limit to 3 genres for performance */}
                  {genres.slice(0, 3).map((genre, index) => {
                    const genreMovies = allMovies.filter(
                      movie => 
                        movie.thumbnail_url && 
                        movie.thumbnail_url.trim() !== '' && 
                        movie.genre && 
                        Array.isArray(movie.genre) && 
                        movie.genre.includes(genre)
                    )
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, MAX_MOVIES_PER_ROW);
                    
                    if (genreMovies.length < 5) return null;
                    
                    return (
                      <div key={genre} className="animate-slideInFade" style={{ animationDelay: `${0.2 * (index + 1)}s` }}>
                        <MovieRow 
                          title={`Popular ${genre} (${genreMovies.length})`}
                          movies={genreMovies.map(movie => ({
                            id: movie.id,
                            title: movie.title,
                            thumbnail_url: movie.thumbnail_url || '',
                            rating: movie.rating,
                            tmdb_id: movie.tmdb_id
                          }))} 
                          limit={10}
                          contentType="movie"
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 

// Hero Component
interface HeroProps {
  id: string;
  title: string;
  overview: string;
  backdrop_url: string;
  poster_url?: string;
  contentType: 'movie' | 'series';
  tmdb_id?: string;
}

function Hero({ id, title, overview, backdrop_url, poster_url, contentType, tmdb_id }: HeroProps) {
  const router = useRouter();

  const goToDetails = () => {
    router.push(`/${contentType}/${id}`);
  };

  const truncateOverview = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="relative w-full h-[80vh] overflow-hidden">
      {/* Backdrop Image */}
      <div className="absolute inset-0 w-full h-full">
        {backdrop_url ? (
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background z-10"></div>
            <div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${backdrop_url})` }}
            ></div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900"></div>
        )}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end z-20 p-6 md:p-12 lg:p-16">
        <div className="max-w-3xl animate-fadeIn">
          <h1 className="text-3xl md:text-5xl font-bold text-white text-shadow-lg mb-3">{title}</h1>
          <p className="text-gray-200 text-shadow mb-6 md:text-lg line-clamp-3">{truncateOverview(overview)}</p>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={goToDetails}
              className="flex items-center gap-2 px-5 py-2 bg-white text-gray-900 rounded-md font-medium hover:bg-gray-200 transition-colors animate-zoomIn"
              style={{ animationDelay: '0.2s' }}
            >
              <FaPlay size={16} />
              <span>Watch Now</span>
            </button>
            
                    <button
              onClick={goToDetails}
              className="flex items-center gap-2 px-5 py-2 bg-gray-700/60 text-white rounded-md font-medium hover:bg-gray-600/60 transition-colors animate-zoomIn backdrop-blur-sm"
              style={{ animationDelay: '0.3s' }}
                    >
              <FaInfoCircle size={16} />
              <span>More Info</span>
                    </button>
                  </div>
                </div>
      </div>
    </div>
  );
}

// MovieCard Component
interface MovieCardProps {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  type: 'movie' | 'series';
  tmdb_id?: string;
}

function MovieCard({ id, title, thumbnail_url, rating, type, tmdb_id }: MovieCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    router.push(`/${type}/${id}`);
  };

  return (
    <div 
      className="relative group cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative overflow-hidden rounded-lg aspect-[2/3] bg-gray-800 shadow-lg">
        {thumbnail_url ? (
          <img 
            src={thumbnail_url} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <span className="text-gray-400">{title}</span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`}>
          <FaPlay className="text-white mb-2" size={24} />
          <div className="text-center px-2">
            <h3 className="text-white font-medium line-clamp-2">{title}</h3>
            {rating > 0 && (
              <div className="flex items-center justify-center mt-1 text-yellow-400">
                <FaStar size={12} className="mr-1" />
                <span className="text-sm">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// MovieRow Component
interface MovieRowProps {
  title: string;
  movies: {
    id: string;
    title: string;
    thumbnail_url: string;
    rating: number;
    tmdb_id?: string;
  }[];
  contentType: 'movie' | 'series';
  limit?: number;
  onViewMore?: () => void;
}

function MovieRow({ title, movies, contentType, limit = 10, onViewMore }: MovieRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };
  
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  // Return null if no movies to display
  if (!movies || movies.length === 0) return null;
  
  // Limit number of movies displayed
  const displayedMovies = limit ? movies.slice(0, limit) : movies;
  const hasMore = movies.length > (limit || 0);
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        
        {hasMore && onViewMore && (
          <button
            onClick={onViewMore}
            className="text-gray-400 hover:text-white text-sm flex items-center"
          >
            View All
          </button>
        )}
      </div>
      
      <div className="relative group">
        {/* Left Arrow - hidden on mobile */}
        {showLeftArrow && (
          <button 
            onClick={() => scroll('left')}
            className="hidden md:flex absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black rounded-full p-2 text-white hover:shadow-lg transition-all duration-200"
            aria-label="Scroll left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* Movie Grid */}
        <div 
          ref={scrollContainerRef}
          className="flex space-x-3 overflow-x-scroll no-scrollbar pb-4"
          onScroll={handleScroll}
        >
          {displayedMovies.map((movie) => (
            <div key={movie.id} className="flex-shrink-0 w-36 md:w-48">
              <MovieCard
                id={movie.id}
                title={movie.title}
                thumbnail_url={movie.thumbnail_url}
                rating={movie.rating}
                type={contentType as 'movie' | 'series'}
                tmdb_id={movie.tmdb_id}
              />
            </div>
          ))}
          
          {/* View More Card */}
          {hasMore && !onViewMore && (
            <div className="flex-shrink-0 w-36 md:w-48">
              <div 
                className="relative overflow-hidden rounded-lg aspect-[2/3] bg-gray-800/60 shadow-lg cursor-pointer hover:bg-gray-700/60 transition-colors flex flex-col items-center justify-center"
                onClick={() => {
                  // Add your view more logic here
                }}
              >
                <FaPlus className="text-white mb-2" size={24} />
                <span className="text-white text-sm font-medium">View More</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Arrow - hidden on mobile */}
        {showRightArrow && (
          <button 
            onClick={() => scroll('right')}
            className="hidden md:flex absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-black rounded-full p-2 text-white hover:shadow-lg transition-all duration-200"
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
} 