import { supabase } from './supabaseClient';
import * as db from './db';

const useLocalPg = process.env.USE_LOCAL_PG === 'true';

/**
 * Database service to handle operations with either Supabase or local PostgreSQL
 */
export const dbService = {
  /**
   * Get all movies
   */
  async getMovies() {
    if (useLocalPg) {
      const result = await db.query('SELECT * FROM movies ORDER BY created_at DESC');
      return { data: result.rows, error: null };
    } else if (supabase) {
      return await supabase
        .from('movies')
        .select('*')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '')
        .order('created_at', { ascending: false });
    }
    return { data: null, error: 'Database client not available' };
  },

  /**
   * Get all TV series
   */
  async getSeries() {
    if (useLocalPg) {
      // Check if series table exists
      try {
        const tableExists = await db.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'series')"
        );
        
        if (tableExists.rows[0].exists) {
          const result = await db.query('SELECT * FROM series ORDER BY created_at DESC');
          return { data: result.rows, error: null };
        } else {
          console.log('Series table does not exist in local database');
          return { data: [], error: null };
        }
      } catch (error) {
        console.error('Error checking for series table:', error);
        return { data: [], error: 'Error checking for series table' };
      }
    } else if (supabase) {
      return await supabase
        .from('series')
        .select('*')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '')
        .order('created_at', { ascending: false });
    }
    return { data: [], error: 'Database client not available' };
  },

  /**
   * Get movie by ID
   */
  async getMovieById(id: string) {
    if (useLocalPg) {
      const result = await db.query('SELECT * FROM movies WHERE id = $1', [id]);
      return { data: result.rows[0] || null, error: null };
    } else if (supabase) {
      return await supabase.from('movies').select('*').eq('id', id).single();
    }
    return { data: null, error: 'Database client not available' };
  },

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genre: string) {
    if (useLocalPg) {
      const result = await db.query("SELECT * FROM movies WHERE $1 = ANY(genre)", [genre]);
      return { data: result.rows, error: null };
    } else if (supabase) {
      return await supabase.from('movies').select('*').contains('genre', [genre]);
    }
    return { data: null, error: 'Database client not available' };
  },

  /**
   * Search movies
   */
  async searchMovies(query: string) {
    if (useLocalPg) {
      const result = await db.query(
        "SELECT * FROM movies WHERE title ILIKE $1 OR description ILIKE $1",
        [`%${query}%`]
      );
      return { data: result.rows, error: null };
    } else if (supabase) {
      return await supabase
        .from('movies')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }
    return { data: null, error: 'Database client not available' };
  },

  /**
   * Get subtitles for a movie
   */
  async getSubtitles(movieId: string) {
    if (useLocalPg) {
      const result = await db.query('SELECT * FROM subtitles WHERE movie_id = $1', [movieId]);
      return { data: result.rows, error: null };
    } else if (supabase) {
      return await supabase.from('subtitles').select('*').eq('movie_id', movieId);
    }
    return { data: null, error: 'Database client not available' };
  },

  /**
   * Get all genres
   */
  async getGenres() {
    if (useLocalPg) {
      const result = await db.query('SELECT * FROM genres ORDER BY name');
      return { data: result.rows, error: null };
    } else if (supabase) {
      return await supabase.from('genres').select('*').order('name');
    }
    return { data: null, error: 'Database client not available' };
  }
}; 