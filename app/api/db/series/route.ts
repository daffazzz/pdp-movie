import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cache, CacheKeys } from '@/lib/cache';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET: Fetch all TV series with aggressive caching
export async function GET() {
  const cacheKey = CacheKeys.series();
  
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
      .from('series')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Cache for 30 minutes
    cache.setSeries(cacheKey, data || []);

    return NextResponse.json({
      data: data || [],
      error: null
    });
  } catch (error: any) {
    console.error('Error fetching series:', error);
    return NextResponse.json({
      data: [],
      error: error.message || 'Failed to fetch series'
    }, { status: 500 });
  }
}

// POST: Fetch series by ID
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({
        data: null,
        error: 'Series ID is required'
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: data,
      error: null
    });
  } catch (error: any) {
    console.error('Error fetching series by ID:', error);
    return NextResponse.json({
      data: null,
      error: error.message || 'Failed to fetch series'
    }, { status: 500 });
  }
}
