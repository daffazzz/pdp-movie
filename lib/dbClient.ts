/**
 * Client-side database service
 * Uses API routes to interact with the database
 */
export const dbClient = {
  /**
   * Get all movies
   */
  async getMovies() {
    try {
      const response = await fetch('/api/db/movies');
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 500));
        return { data: null, error: `API returned non-JSON response. Status: ${response.status}` };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching movies:', error);
      return { data: null, error: 'Failed to fetch movies' };
    }
  },

  /**
   * Get movie by ID
   */
  async getMovieById(id: string) {
    try {
      const response = await fetch('/api/db/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 500));
        return { data: null, error: `API returned non-JSON response. Status: ${response.status}` };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching movie by ID:', error);
      return { data: null, error: 'Failed to fetch movie' };
    }
  },

  /**
   * Get all TV series
   */
  async getSeries() {
    try {
      const response = await fetch('/api/db/series');
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 500));
        return { data: [], error: `API returned non-JSON response. Status: ${response.status}` };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching series:', error);
      return { data: [], error: 'Failed to fetch series' };
    }
  },

  /**
   * Get series by ID
   */
  async getSeriesById(id: string) {
    try {
      const response = await fetch('/api/db/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 500));
        return { data: null, error: `API returned non-JSON response. Status: ${response.status}` };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching series by ID:', error);
      return { data: null, error: 'Failed to fetch series' };
    }
  },

  /**
   * Get all genres
   */
  async getGenres() {
    try {
      const response = await fetch('/api/db/genres');
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 500));
        return { data: null, error: `API returned non-JSON response. Status: ${response.status}` };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching genres:', error);
      return { data: null, error: 'Failed to fetch genres' };
    }
  }
}; 