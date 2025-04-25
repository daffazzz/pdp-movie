/**
 * Helper functions for interacting with TMDB API
 */

// TMDB API configuration
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Search for movies in TMDB
 * @param query Search term
 * @returns Search results
 */
export async function searchTMDBMovies(query: string) {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodedQuery}&page=1&include_adult=false`;
    
    console.log(`Searching TMDB for: ${query}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    
    return data.results || [];
  } catch (error: any) {
    console.error('Error searching TMDB:', error);
    throw new Error(`Failed to search TMDB: ${error.message}`);
  }
}

/**
 * Get detailed information about a movie from TMDB
 * @param movieId TMDB movie ID
 * @returns Movie details
 */
export async function getTMDBMovieDetails(movieId: number) {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos`;
    
    console.log(`Fetching TMDB details for movie ID: ${movieId}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    
    return data;
  } catch (error: any) {
    console.error(`Error fetching TMDB movie details for ID ${movieId}:`, error);
    throw new Error(`Failed to get movie details: ${error.message}`);
  }
}

/**
 * Get genre list from TMDB
 * @returns Genre mapping object
 */
export async function getTMDBGenres() {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    const url = `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`;
    
    console.log('Fetching TMDB genres');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    
    const genreMapping: {[key: number]: string} = {};
    
    if (data.genres && Array.isArray(data.genres)) {
      data.genres.forEach((genre: {id: number, name: string}) => {
        genreMapping[genre.id] = genre.name;
      });
    }
    
    return genreMapping;
  } catch (error: any) {
    console.error('Error fetching TMDB genres:', error);
    throw new Error(`Failed to get genres: ${error.message}`);
  }
}

export { TMDB_IMAGE_BASE_URL }; 