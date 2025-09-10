import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as db from '@/lib/server/db';

// Get environment variables with safer fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const useLocalPg = process.env.USE_LOCAL_PG === 'true';

// Create Supabase client if not using local PG
const supabase = !useLocalPg && supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET() {
  try {
    if (useLocalPg) {
      const result = await db.query('SELECT * FROM movies ORDER BY created_at DESC');
      return NextResponse.json({ data: result.rows, error: null });
    } else if (supabase) {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '')
        .order('created_at', { ascending: false });
      
      return NextResponse.json({ data, error });
    } else {
      return NextResponse.json({ data: null, error: 'Database client not available' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json({ data: null, error: 'Failed to fetch movies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ data: null, error: 'Movie ID is required' }, { status: 400 });
    }
    
    if (useLocalPg) {
      const result = await db.query('SELECT * FROM movies WHERE id = $1', [id]);
      return NextResponse.json({ data: result.rows[0] || null, error: null });
    } else if (supabase) {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single();
      
      return NextResponse.json({ data, error });
    } else {
      return NextResponse.json({ data: null, error: 'Database client not available' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching movie by ID:', error);
    return NextResponse.json({ data: null, error: 'Failed to fetch movie' }, { status: 500 });
  }
} 