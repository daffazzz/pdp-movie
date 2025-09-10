import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// TMDB API configuration
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface SearchResult {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  tmdb_id?: number;
  contentType: 'movie' | 'tvshow';
}

/**
 * Searches database for movies and TV shows
 * @param query Search query
 * @returns Promise resolving to an array of search results
 */
export async function searchDatabase(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    let searchResults: SearchResult[] = [];

    // 1. Search in movies table
    const searchMovies = async () => {
      let movieResults: any[] = [];

      // First try: Using the filter method on title
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .filter('title', 'ilike', `%${query}%`)
          .order('title');

        if (!error && data && data.length > 0) {
          movieResults = data.map(movie => ({
            id: movie.id,
            title: movie.title,
            thumbnail_url: movie.thumbnail_url || movie.poster_url || '/images/placeholder.jpg',
            rating: movie.rating || 0,
            tmdb_id: movie.tmdb_id,
            contentType: 'movie' as const
          }));
        }
      } catch (err) {
        console.error('Movie title search error:', err);
      }

      // Second try: Using filter on overview if no results yet
      if (movieResults.length === 0) {
        try {
          const { data, error } = await supabase
            .from('movies')
            .select('*')
            .filter('description', 'ilike', `%${query}%`)
            .order('title');
          
          if (!error && data && data.length > 0) {
            movieResults = data.map(movie => ({
              id: movie.id,
              title: movie.title,
              thumbnail_url: movie.thumbnail_url || movie.poster_url || '/images/placeholder.jpg',
              rating: movie.rating || 0,
              tmdb_id: movie.tmdb_id,
              contentType: 'movie' as const
            }));
          }
        } catch (err) {
          console.error('Movie overview search error:', err);
        }
      }

      return movieResults;
    };

    // 2. Search in TV shows table (series)
    const searchTvShows = async () => {
      let tvResults: any[] = [];

      // First try: Using the filter method on title
      try {
        const { data, error } = await supabase
          .from('series')
          .select('*')
          .filter('title', 'ilike', `%${query}%`)
          .order('title');

        if (!error && data && data.length > 0) {
          tvResults = data.map(show => ({
            id: show.id,
            title: show.title,
            thumbnail_url: show.thumbnail_url || show.poster_url || '/images/placeholder.jpg',
            rating: show.rating || 0,
            tmdb_id: show.tmdb_id,
            contentType: 'tvshow' as const
          }));
        }
      } catch (err) {
        console.error('TV show title search error:', err);
      }

      // Second try: Using filter on overview if no results yet
      if (tvResults.length === 0) {
        try {
          const { data, error } = await supabase
            .from('series')
            .select('*')
            .filter('description', 'ilike', `%${query}%`)
            .order('title');
          
          if (!error && data && data.length > 0) {
            tvResults = data.map(show => ({
              id: show.id,
              title: show.title,
              thumbnail_url: show.thumbnail_url || show.poster_url || '/images/placeholder.jpg',
              rating: show.rating || 0,
              tmdb_id: show.tmdb_id,
              contentType: 'tvshow' as const
            }));
          }
        } catch (err) {
          console.error('TV show description search error:', err);
        }
      }

      return tvResults;
    };

    // 3. Execute both searches in parallel
    const [movieResults, tvShowResults] = await Promise.all([
      searchMovies(),
      searchTvShows()
    ]);

    // 4. Combine results
    searchResults = [...movieResults, ...tvShowResults];

    // 5. Sort results by title
    searchResults.sort((a, b) => a.title.localeCompare(b.title));

    return searchResults;
  } catch (err: any) {
    console.error('Error performing database search:', err);
    throw new Error(`Database search failed: ${err.message}`);
  }
}

/**
 * Search for movies on TMDB and filter to only those that exist in our database
 * @param query Search query
 * @returns Promise resolving to an array of search results
 */
export async function searchTMDBMovies(query: string): Promise<SearchResult[]> {
  if (!query.trim() || !TMDB_API_KEY) {
    return [];
  }

  try {
    // Search TMDB for movies
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`
    );
    
    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('TMDB API returned non-JSON response:', text.substring(0, 500));
      throw new Error(`TMDB API returned non-JSON response. Status: ${response.status}`);
    }
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Extract all TMDB IDs from the search results
    const tmdbIds = data.results.map((movie: any) => movie.id);
    
    // Find which of these TMDB movies exist in our database
    const { data: existingMovies, error } = await supabase
      .from('movies')
      .select('id, title, tmdb_id, thumbnail_url, poster_url, rating')
      .in('tmdb_id', tmdbIds);
    
    if (error) {
      console.error('Error checking for existing movies:', error);
      return [];
    }
    
    // Create a map of TMDB IDs to our database entries
    const existingMoviesMap = new Map();
    existingMovies?.forEach(movie => {
      existingMoviesMap.set(movie.tmdb_id, movie);
    });
    
    // Filter and map TMDB results to only include movies that exist in our database
    const results: SearchResult[] = data.results
      .filter((movie: any) => existingMoviesMap.has(movie.id))
      .map((movie: any) => {
        const dbMovie = existingMoviesMap.get(movie.id);
        return {
          id: dbMovie.id,
          title: dbMovie.title,
          thumbnail_url: dbMovie.thumbnail_url || dbMovie.poster_url || '/images/placeholder.jpg',
          rating: dbMovie.rating || 0,
          tmdb_id: movie.id,
          contentType: 'movie' as const
        };
      });
    
    return results;
  } catch (err: any) {
    console.error('Error performing TMDB movie search:', err);
    return [];
  }
}

/**
 * Search for TV shows on TMDB and filter to only those that exist in our database
 * @param query Search query
 * @returns Promise resolving to an array of search results
 */
export async function searchTMDBTvShows(query: string): Promise<SearchResult[]> {
  if (!query.trim() || !TMDB_API_KEY) {
    return [];
  }

  try {
    // Search TMDB for TV shows
    const response = await fetch(
      `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`
    );
    
    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('TMDB API returned non-JSON response:', text.substring(0, 500));
      throw new Error(`TMDB API returned non-JSON response. Status: ${response.status}`);
    }
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Extract all TMDB IDs from the search results
    const tmdbIds = data.results.map((tvShow: any) => tvShow.id);
    
    // Find which of these TMDB TV shows exist in our database
    const { data: existingTvShows, error } = await supabase
      .from('series')
      .select('id, title, tmdb_id, thumbnail_url, poster_url, rating')
      .in('tmdb_id', tmdbIds);
    
    if (error) {
      console.error('Error checking for existing TV shows:', error);
      return [];
    }
    
    // Create a map of TMDB IDs to our database entries
    const existingTvShowsMap = new Map();
    existingTvShows?.forEach(tvShow => {
      existingTvShowsMap.set(tvShow.tmdb_id, tvShow);
    });
    
    // Filter and map TMDB results to only include TV shows that exist in our database
    const results: SearchResult[] = data.results
      .filter((tvShow: any) => existingTvShowsMap.has(tvShow.id))
      .map((tvShow: any) => {
        const dbTvShow = existingTvShowsMap.get(tvShow.id);
        return {
          id: dbTvShow.id,
          title: dbTvShow.title,
          thumbnail_url: dbTvShow.thumbnail_url || dbTvShow.poster_url || '/images/placeholder.jpg',
          rating: dbTvShow.rating || 0,
          tmdb_id: tvShow.id,
          contentType: 'tvshow' as const
        };
      });
    
    return results;
  } catch (err: any) {
    console.error('Error performing TMDB TV show search:', err);
    return [];
  }
}

/**
 * Combined search that searches both database and TMDB
 * @param query Search query
 * @returns Promise resolving to an array of combined, deduplicated search results
 */
export async function enhancedSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    // Search in database and TMDB in parallel
    const [dbResults, tmdbMovieResults, tmdbTvResults] = await Promise.all([
      searchDatabase(query),
      searchTMDBMovies(query),
      searchTMDBTvShows(query)
    ]);

    // Create a set of IDs to track duplicates
    const seenIds = new Set<string>();
    
    // Add all database results first
    const combinedResults: SearchResult[] = [];
    
    dbResults.forEach(result => {
      seenIds.add(result.id);
      combinedResults.push(result);
    });
    
    // Add TMDB movie results that aren't already included
    tmdbMovieResults.forEach(result => {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        combinedResults.push(result);
      }
    });
    
    // Add TMDB TV show results that aren't already included
    tmdbTvResults.forEach(result => {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        combinedResults.push(result);
      }
    });
    
    // Sort by title
    return combinedResults.sort((a, b) => a.title.localeCompare(b.title));
  } catch (err: any) {
    console.error('Error performing enhanced search:', err);
    throw new Error(`Enhanced search failed: ${err.message}`);
  }
} 