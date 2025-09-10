import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// Function to get genre names from TMDB genre IDs
async function getGenreNames(genreIds: number[], type: 'movie' | 'tv'): Promise<string[]> {
  try {
    const url = `${TMDB_BASE_URL}/genre/${type}/list?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await fetch(url);
    
    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('TMDB API returned non-JSON response:', text.substring(0, 500));
      return [];
    }
    
    const data = await response.json();
    
    if (data.genres) {
      const genreMap: {[key: number]: string} = {};
      data.genres.forEach((genre: {id: number, name: string}) => {
        genreMap[genre.id] = genre.name;
      });
      
      return genreIds.map(id => genreMap[id]).filter(Boolean);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}

// Function to fetch trending movies from TMDB
async function fetchTrendingMovies(page: number = 1): Promise<TMDBMovie[]> {
  try {
    const url = `${TMDB_BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
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
      return data.results; // Return all results from the page
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
}

// Function to fetch trending TV series from TMDB
async function fetchTrendingSeries(page: number = 1): Promise<TMDBSeries[]> {
  try {
    const url = `${TMDB_BASE_URL}/trending/tv/day?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
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
      return data.results; // Return all results from the page
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching trending series:', error);
    return [];
  }
}

// Function to check if movie exists in database and add if not
async function ensureMovieExists(tmdbMovie: TMDBMovie): Promise<string | null> {
  try {
    // Check if movie already exists
    const { data: existingMovie } = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', tmdbMovie.id)
      .single();
    
    if (existingMovie) {
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
    
    return newMovie?.id || null;
  } catch (error) {
    console.error('Error ensuring movie exists:', error);
    return null;
  }
}

// Function to check if series exists in database and add if not
async function ensureSeriesExists(tmdbSeries: TMDBSeries): Promise<string | null> {
  try {
    // Check if series already exists
    const { data: existingSeries } = await supabase
      .from('series')
      .select('id')
      .eq('tmdb_id', tmdbSeries.id)
      .single();
    
    if (existingSeries) {
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
