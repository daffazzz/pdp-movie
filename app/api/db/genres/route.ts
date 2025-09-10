import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cache, CacheKeys } from '@/lib/cache';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET: Fetch all genres with aggressive caching
export async function GET() {
  const cacheKey = CacheKeys.genres();
  
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
      .from('genres')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    // Cache genres for 24 hours (they rarely change)
    cache.setGenres(cacheKey, data || []);

    return NextResponse.json({
      data: data || [],
      error: null
    });
  } catch (error: any) {
    console.error('Error fetching genres:', error);
    return NextResponse.json({
      data: null,
      error: error.message || 'Failed to fetch genres'
    }, { status: 500 });
  }
}
