import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cache, CacheKeys } from '@/lib/cache';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET: Fetch all movies with aggressive caching
export async function GET() {
  const cacheKey = CacheKeys.movies();
  
  // Try cache first
  const cachedData = cache.getWithStats<any[]>(cacheKey);
  if (cachedData) {
    return NextResponse.json({
      data: cachedData,
      error: null,
      cached: true
    });
  }
  
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Cache for 30 minutes
    cache.setMovies(cacheKey, data || []);

    return NextResponse.json({
      data: data || [],
      error: null
    });
  } catch (error: any) {
    console.error('Error fetching movies:', error);
    return NextResponse.json({
      data: null,
      error: error.message || 'Failed to fetch movies'
    }, { status: 500 });
  }
}

// POST: Fetch movie by ID with caching
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({
        data: null,
        error: 'Movie ID is required'
      }, { status: 400 });
    }

    const cacheKey = CacheKeys.movieDetails(id);
    
    // Try cache first
    const cachedData = cache.getWithStats<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        data: cachedData,
        error: null,
        cached: true
      });
    }

    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    // Cache movie details for 1 hour
    cache.setMovieDetails(cacheKey, data);

    return NextResponse.json({
      data: data,
      error: null
    });
  } catch (error: any) {
    console.error('Error fetching movie by ID:', error);
    return NextResponse.json({
      data: null,
      error: error.message || 'Failed to fetch movie'
    }, { status: 500 });
  }
}
