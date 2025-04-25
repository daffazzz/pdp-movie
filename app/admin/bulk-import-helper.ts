/**
 * Helper functions for bulk importing movies/series from TMDB API
 */

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Discover movies by year or genre from TMDB
 * Note: TMDB API limits results to 20 items per page
 * @param params Parameters for discovery (year, genreId, page)
 * @returns Discovered movies
 */
export async function discoverMovies({ 
  year, 
  genreId, 
  page = 1,
  watchProvider,
  watchRegion
}: { 
  year?: number; 
  genreId?: number;
  page?: number;
  watchProvider?: string;
  watchRegion?: string;
}) {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&include_adult=false&sort_by=popularity.desc`;
    
    // Add year filter if provided
    if (year) {
      url += `&primary_release_year=${year}`;
    }
    
    // Add genre filter if provided
    if (genreId) {
      url += `&with_genres=${genreId}`;
    }
    
    // Add watch provider filter if both provider and region are provided
    if (watchProvider && watchRegion) {
      url += `&with_watch_providers=${watchProvider}&watch_region=${watchRegion}`;
    }
    
    console.log(`Discovering movies with params: year=${year}, genreId=${genreId}, page=${page}, provider=${watchProvider || 'none'}, region=${watchRegion || 'none'}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    
    return {
      results: data.results || [],
      total_pages: data.total_pages || 0,
      total_results: data.total_results || 0,
      page: data.page || 1
    };
  } catch (error: any) {
    console.error('Error discovering movies:', error);
    throw new Error(`Failed to discover movies: ${error.message}`);
  }
}

/**
 * Multi-page discover function for movies to get more than TMDB limit (20 per page)
 * @param params Parameters for discovery
 * @returns Array of movie results (up to 100)
 */
export async function discoverMoviesMultiPage({
  year,
  genreId,
  startPage = 1,
  maxResults = 100,
  watchProvider,
  watchRegion
}: {
  year?: number;
  genreId?: number;
  startPage?: number;
  maxResults?: number;
  watchProvider?: string;
  watchRegion?: string;
}) {
  try {
    // Get first page to check total pages available
    const firstPageResult = await discoverMovies({
      year,
      genreId,
      page: startPage,
      watchProvider,
      watchRegion
    });
    
    const results = [...firstPageResult.results];
    const totalPages = firstPageResult.total_pages;
    const totalResults = firstPageResult.total_results;
    
    // Calculate how many more pages we need to fetch to reach maxResults
    const resultsPerPage = 20; // TMDB API limit
    const neededResults = Math.min(maxResults - results.length, totalResults - results.length);
    const neededPages = Math.min(
      Math.ceil(neededResults / resultsPerPage),
      totalPages - startPage
    );
    
    // Fetch additional pages if needed
    const additionalPagePromises = [];
    for (let i = 1; i <= neededPages; i++) {
      additionalPagePromises.push(
        discoverMovies({
          year,
          genreId,
          page: startPage + i,
          watchProvider,
          watchRegion
        })
      );
    }
    
    // Get results from all additional pages
    const additionalPagesResults = await Promise.all(additionalPagePromises);
    for (const pageResult of additionalPagesResults) {
      results.push(...pageResult.results);
    }
    
    // Limit results to maxResults
    const limitedResults = results.slice(0, maxResults);
    
    return {
      results: limitedResults,
      total_pages: totalPages,
      total_results: totalResults,
      pages_fetched: 1 + additionalPagePromises.length
    };
  } catch (error: any) {
    console.error('Error fetching multiple pages of movies:', error);
    throw new Error(`Failed to fetch multiple pages: ${error.message}`);
  }
}

/**
 * Discover TV series by year or genre from TMDB
 * Note: TMDB API limits results to 20 items per page
 * @param params Parameters for discovery (year, genreId, page)
 * @returns Discovered TV series
 */
export async function discoverSeries({ 
  year, 
  genreId, 
  page = 1,
  watchProvider,
  watchRegion
}: { 
  year?: number; 
  genreId?: number;
  page?: number;
  watchProvider?: string;
  watchRegion?: string;
}) {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    let url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&include_adult=false&sort_by=popularity.desc`;
    
    // Add year filter if provided
    if (year) {
      url += `&first_air_date_year=${year}`;
    }
    
    // Add genre filter if provided
    if (genreId) {
      url += `&with_genres=${genreId}`;
    }
    
    // Add watch provider filter if both provider and region are provided
    if (watchProvider && watchRegion) {
      url += `&with_watch_providers=${watchProvider}&watch_region=${watchRegion}`;
    }
    
    console.log(`Discovering series with params: year=${year}, genreId=${genreId}, page=${page}, provider=${watchProvider || 'none'}, region=${watchRegion || 'none'}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    
    return {
      results: data.results || [],
      total_pages: data.total_pages || 0,
      total_results: data.total_results || 0,
      page: data.page || 1
    };
  } catch (error: any) {
    console.error('Error discovering series:', error);
    throw new Error(`Failed to discover series: ${error.message}`);
  }
}

/**
 * Multi-page discover function for series to get more than TMDB limit (20 per page)
 * @param params Parameters for discovery
 * @returns Array of series results (up to 100)
 */
export async function discoverSeriesMultiPage({
  year,
  genreId,
  startPage = 1,
  maxResults = 100,
  watchProvider,
  watchRegion
}: {
  year?: number;
  genreId?: number;
  startPage?: number;
  maxResults?: number;
  watchProvider?: string;
  watchRegion?: string;
}) {
  try {
    // Get first page to check total pages available
    const firstPageResult = await discoverSeries({
      year,
      genreId,
      page: startPage,
      watchProvider,
      watchRegion
    });
    
    const results = [...firstPageResult.results];
    const totalPages = firstPageResult.total_pages;
    const totalResults = firstPageResult.total_results;
    
    // Calculate how many more pages we need to fetch to reach maxResults
    const resultsPerPage = 20; // TMDB API limit
    const neededResults = Math.min(maxResults - results.length, totalResults - results.length);
    const neededPages = Math.min(
      Math.ceil(neededResults / resultsPerPage),
      totalPages - startPage
    );
    
    // Fetch additional pages if needed
    const additionalPagePromises = [];
    for (let i = 1; i <= neededPages; i++) {
      additionalPagePromises.push(
        discoverSeries({
          year,
          genreId,
          page: startPage + i,
          watchProvider,
          watchRegion
        })
      );
    }
    
    // Get results from all additional pages
    const additionalPagesResults = await Promise.all(additionalPagePromises);
    for (const pageResult of additionalPagesResults) {
      results.push(...pageResult.results);
    }
    
    // Limit results to maxResults
    const limitedResults = results.slice(0, maxResults);
    
    return {
      results: limitedResults,
      total_pages: totalPages,
      total_results: totalResults,
      pages_fetched: 1 + additionalPagePromises.length
    };
  } catch (error: any) {
    console.error('Error fetching multiple pages of series:', error);
    throw new Error(`Failed to fetch multiple pages: ${error.message}`);
  }
}

/**
 * Get TV series genre list from TMDB
 * @returns TV series genre mapping object
 */
export async function getTMDBTVGenres() {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    const url = `${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}&language=en-US`;
    
    console.log('Fetching TMDB TV genres');
    
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
    console.error('Error fetching TMDB TV genres:', error);
    throw new Error(`Failed to get TV genres: ${error.message}`);
  }
}

export { TMDB_IMAGE_BASE_URL };

/**
 * Get list of available watch providers (streaming services) from TMDB
 * @param type Type of content: 'movie' or 'tv'
 * @returns Object mapping provider ID to provider name and logo
 */
export async function getWatchProviders(type: 'movie' | 'tv' = 'movie') {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    const url = `${TMDB_BASE_URL}/watch/providers/${type}?api_key=${TMDB_API_KEY}&language=en-US`;
    
    console.log(`Fetching watch providers for ${type}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    
    // Create a mapping of provider ID to provider details
    const providers: {[key: string]: {id: number, name: string, logo_path: string}} = {};
    
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((provider: any) => {
        if (provider.provider_id && provider.provider_name) {
          providers[provider.provider_id] = {
            id: provider.provider_id,
            name: provider.provider_name,
            logo_path: provider.logo_path ? `${TMDB_IMAGE_BASE_URL}/original${provider.logo_path}` : ''
          };
        }
      });
    }
    
    return providers;
  } catch (error: any) {
    console.error(`Error fetching watch providers:`, error);
    throw new Error(`Failed to get watch providers: ${error.message}`);
  }
}

/**
 * Get available regions for watch providers from TMDB
 * @returns Array of available regions with their names and codes
 */
export async function getAvailableRegions() {
  try {
    // Check if API key is set
    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not set. Check your environment variables.');
    }

    const url = `${TMDB_BASE_URL}/watch/providers/regions?api_key=${TMDB_API_KEY}&language=en-US`;
    
    console.log('Fetching available regions for watch providers');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === false) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    
    // Create a structured list of regions
    const regions: {iso_3166_1: string, english_name: string}[] = [];
    
    if (data.results && Array.isArray(data.results)) {
      regions.push(...data.results);
    }
    
    // Sort regions by name
    regions.sort((a, b) => a.english_name.localeCompare(b.english_name));
    
    return regions;
  } catch (error: any) {
    console.error('Error fetching available regions:', error);
    throw new Error(`Failed to get available regions: ${error.message}`);
  }
} 