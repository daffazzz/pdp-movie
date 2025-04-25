import { supabase } from '@/src/lib/supabase';
import { Movie } from '@/src/types';

// Get all movies
export const getAllMovies = async (): Promise<Movie[]> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return [];
  }

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from('movies')
    .select('*')
    .order('title');

  if (error) {
    console.error('Error fetching movies:', error);
    return [];
  }

  return data || [];
};

// Get featured movies (high rating)
export const getFeaturedMovies = async (): Promise<Movie[]> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return [];
  }

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from('movies')
    .select('*')
    .gte('rating', 4.0)
    .order('rating', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching featured movies:', error);
    return [];
  }

  return data || [];
};

// Get movies by genre
export const getMoviesByGenre = async (genre: string): Promise<Movie[]> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return [];
  }

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from('movies')
    .select('*')
    .filter('genre', 'cs', `{"${genre}"}`)
    .order('title');

  if (error) {
    console.error(`Error fetching movies by genre ${genre}:`, error);
    return [];
  }

  return data || [];
};

// Get a single movie by id
export const getMovieById = async (id: string): Promise<Movie | null> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return null;
  }

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from('movies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching movie with ID ${id}:`, error);
    return null;
  }

  return data;
};

// Search movies by title or description
export const searchMovies = async (query: string): Promise<Movie[]> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return [];
  }

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from('movies')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('title');

  if (error) {
    console.error(`Error searching movies with query ${query}:`, error);
    return [];
  }

  return data || [];
}; 