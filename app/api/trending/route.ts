import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cache, CacheKeys } from '@/lib/cache';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TMDB API configuration
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
}

// Function to get genre names from TMDB genre IDs with aggressive caching
async function getGenreNames(genreIds: number[], type: 'movie' | 'tv'): Promise<string[]> {
  const cacheKey = CacheKeys.genres(type);
  
  // Try to get from cache first
  let genreMap = cache.get<{[key: number]: string}>(cacheKey);
  
  if (!genreMap) {
    try {
      const url = `${TMDB_BASE_URL}/genre/${type}/list?api_key=${TMDB_API_KEY}&language=en-US`;
      const response = await fetch(url);
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('TMDB API returned non-JSON response:', text.substring(0, 500));
        genreMap = {};
        return genreIds.map(id => '').filter(Boolean);
      }
      
      const data = await response.json();
      
      if (data.genres) {
        genreMap = {};
        data.genres.forEach((genre: {id: number, name: string}) => {
          genreMap![genre.id] = genre.name;
        });
        
        // Cache genres for 24 hours
        cache.setGenres(cacheKey, genreMap);
      } else {
        genreMap = {};
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
      genreMap = {};
    }
  }
  
  return genreIds.map(id => genreMap![id]).filter(Boolean);
}

// Function to fetch trending movies from TMDB with aggressive caching
async function fetchTrendingMovies(page: number = 1): Promise<TMDBMovie[]> {
  const cacheKey = CacheKeys.trending('movie', page);
  
  // Try to get from cache first
  let cachedData = cache.getWithStats<TMDBMovie[]>(cacheKey);
  if (cachedData) {
    console.log(`Cache HIT for trending movies page ${page}`);
    return cachedData;
  }
  
  console.log(`Cache MISS for trending movies page ${page} - fetching from TMDB`);
  
  try {
    // Alternate between day and week trending based on page number
    const timeWindow = page % 2 === 1 ? 'day' : 'week';
    const url = `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}&language=en-US&page=${Math.ceil(page / 2)}`;
    const response = await fetch(url);
    
    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('TMDB API returned non-JSON response:', text.substring(0, 500));
      return [];
    }
    
    const data = await response.json();
    
    if (data.results) {
      // Cache the results for 10 minutes
      cache.setTrending(cacheKey, data.results);
      return data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
}

// Function to fetch trending TV series from TMDB with aggressive caching
async function fetchTrendingSeries(page: number = 1): Promise<TMDBSeries[]> {
  const cacheKey = CacheKeys.trending('tv', page);
  
  // Try to get from cache first
  let cachedData = cache.getWithStats<TMDBSeries[]>(cacheKey);
  if (cachedData) {
    console.log(`Cache HIT for trending TV series page ${page}`);
    return cachedData;
  }
  
  console.log(`Cache MISS for trending TV series page ${page} - fetching from TMDB`);
  
  try {
    // Alternate between day and week trending based on page number
    const timeWindow = page % 2 === 1 ? 'day' : 'week';
    const url = `${TMDB_BASE_URL}/trending/tv/${timeWindow}?api_key=${TMDB_API_KEY}&language=en-US&page=${Math.ceil(page / 2)}`;
    const response = await fetch(url);
    
    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('TMDB API returned non-JSON response:', text.substring(0, 500));
      return [];
    }
    
    const data = await response.json();
    
    if (data.results) {
      // Cache the results for 10 minutes
      cache.setTrending(cacheKey, data.results);
      return data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching trending series:', error);
    return [];
  }
}

// Function to check if movie exists in database and add if not
async function ensureMovieExists(tmdbMovie: TMDBMovie): Promise<string | null> {
  const cacheKey = `movie_exists:${tmdbMovie.id}`;
  
  // Check cache first
  let existingMovieId = cache.get<string>(cacheKey);
  if (existingMovieId) {
    return existingMovieId;
  }
  
  try {
    // Check if movie already exists
    const { data: existingMovie } = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', tmdbMovie.id)
      .single();
    
    if (existingMovie) {
      // Cache the existing movie ID for 1 hour
      cache.set(cacheKey, existingMovie.id, 60 * 60 * 1000);
      return existingMovie.id;
    }
    
    // Get genre names
    const genreNames = await getGenreNames(tmdbMovie.genre_ids, 'movie');
    
    // Add new movie
    const movieData = {
      title: tmdbMovie.title,
      description: tmdbMovie.overview || 'No description available',
      thumbnail_url: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${tmdbMovie.poster_path}` : '',
      backdrop_url: tmdbMovie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${tmdbMovie.backdrop_path}` : '',
      poster_url: tmdbMovie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${tmdbMovie.poster_path}` : '',
      video_url: `https://player.vidplus.to/embed/movie/${tmdbMovie.id}`,
      rating: tmdbMovie.vote_average,
      release_year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : new Date().getFullYear(),
      duration: '120 min', // Default duration
      genre: genreNames.length > 0 ? genreNames : ['Unknown'],
      director: 'Unknown',
      movie_cast: [],
      tmdb_id: tmdbMovie.id,
      external_ids: {
        tmdb_id: tmdbMovie.id
      },
      has_sources: true,
      is_trending: true
    };
    
    const { data: newMovie, error } = await supabase
      .from('movies')
      .insert(movieData)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error adding movie:', error);
      return null;
    }
    
    // Cache the new movie ID
    if (newMovie?.id) {
      cache.set(cacheKey, newMovie.id, 60 * 60 * 1000);
    }
    
    return newMovie?.id || null;
  } catch (error) {
    console.error('Error ensuring movie exists:', error);
    return null;
  }
}

// Function to check if series exists in database and add if not
async function ensureSeriesExists(tmdbSeries: TMDBSeries): Promise<string | null> {
  const cacheKey = `series_exists:${tmdbSeries.id}`;
  
  // Check cache first
  let existingSeriesId = cache.get<string>(cacheKey);
  if (existingSeriesId) {
    return existingSeriesId;
  }
  
  try {
    // Check if series already exists
    const { data: existingSeries } = await supabase
      .from('series')
      .select('id')
      .eq('tmdb_id', tmdbSeries.id)
      .single();
    
    if (existingSeries) {
      // Cache the existing series ID for 1 hour
      cache.set(cacheKey, existingSeries.id, 60 * 60 * 1000);
      return existingSeries.id;
    }
    
    // Get genre names
    const genreNames = await getGenreNames(tmdbSeries.genre_ids, 'tv');
    
    // Add new series
    const seriesData = {
      title: tmdbSeries.name,
      description: tmdbSeries.overview || 'No description available',
      thumbnail_url: tmdbSeries.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${tmdbSeries.poster_path}` : '',
      backdrop_url: tmdbSeries.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${tmdbSeries.backdrop_path}` : '',
      poster_url: tmdbSeries.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${tmdbSeries.poster_path}` : '',
      rating: tmdbSeries.vote_average,
      release_year: tmdbSeries.first_air_date ? new Date(tmdbSeries.first_air_date).getFullYear() : new Date().getFullYear(),
      seasons: 1, // Default to 1 season
      genre: genreNames.length > 0 ? genreNames : ['Unknown'],
      director: 'Unknown',
      cast: [],
      tmdb_id: tmdbSeries.id,
      is_trending: true
    };
    
    const { data: newSeries, error } = await supabase
      .from('series')
      .insert(seriesData)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error adding series:', error);
      return null;
    }
    
    // Cache the new series ID
    if (newSeries?.id) {
      cache.set(cacheKey, newSeries.id, 60 * 60 * 1000);
    }
    
    return newSeries?.id || null;
  } catch (error) {
    console.error('Error ensuring series exists:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!TMDB_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'TMDB API key not configured'
      }, { status: 500 });
    }
    
    // Get page parameter from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const contentType = searchParams.get('type') || 'all'; // 'movie', 'tv', or 'all'
    
    // Fetch trending content from TMDB based on content type
    let trendingMovies: TMDBMovie[] = [];
    let trendingSeries: TMDBSeries[] = [];
    
    if (contentType === 'all' || contentType === 'movie') {
      trendingMovies = await fetchTrendingMovies(page);
    }
    
    if (contentType === 'all' || contentType === 'tv') {
      trendingSeries = await fetchTrendingSeries(page);
    }
    
    // Ensure all trending movies exist in database
    const movieIds = await Promise.all(
      trendingMovies.map(movie => ensureMovieExists(movie))
    );
    
    // Ensure all trending series exist in database
    const seriesIds = await Promise.all(
      trendingSeries.map(series => ensureSeriesExists(series))
    );
    
    // Fetch the updated trending content from database
    const validMovieIds = movieIds.filter(Boolean);
    const validSeriesIds = seriesIds.filter(Boolean);
    
    // Cache key for final database results
    const dbCacheKey = `trending_db:${contentType}:${page}:${validMovieIds.length}:${validSeriesIds.length}`;
    
    // Try to get from cache first
    let cachedDbResult = cache.get<{movies: any[], series: any[]}>(dbCacheKey);
    
    if (cachedDbResult) {
      console.log(`Cache HIT for database results: ${contentType} page ${page}`);
      return NextResponse.json({
        success: true,
        data: {
          movies: cachedDbResult.movies || [],
          series: cachedDbResult.series || [],
          total_movies: cachedDbResult.movies?.length || 0,
          total_series: cachedDbResult.series?.length || 0,
          page: page,
          has_more: (cachedDbResult.movies?.length || 0) > 0 || (cachedDbResult.series?.length || 0) > 0,
          cached: true
        }
      });
    }
    
    console.log(`Cache MISS for database results - querying Supabase`);
    
    const { data: movies } = await supabase
      .from('movies')
      .select('*')
      .in('id', validMovieIds)
      .order('rating', { ascending: false });
    
    const { data: series } = await supabase
      .from('series')
      .select('*')
      .in('id', validSeriesIds)
      .order('rating', { ascending: false });
    
    // Cache the database results for 5 minutes
    const dbResult = { movies: movies || [], series: series || [] };
    cache.set(dbCacheKey, dbResult, 5 * 60 * 1000);
    
    return NextResponse.json({
      success: true,
      data: {
        movies: movies || [],
        series: series || [],
        total_movies: movies?.length || 0,
        total_series: series?.length || 0,
        page: page,
        has_more: (movies?.length || 0) > 0 || (series?.length || 0) > 0 // TMDB usually has more pages
      }
    });
    
  } catch (error: any) {
    console.error('Error in trending API:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
