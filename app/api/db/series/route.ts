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
      // Check if series table exists
      try {
        const tableExists = await db.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'series')"
        );
        
        if (tableExists.rows[0].exists) {
          const result = await db.query('SELECT * FROM series ORDER BY created_at DESC');
          return NextResponse.json({ data: result.rows, error: null });
        } else {
          console.log('Series table does not exist in local database');
          return NextResponse.json({ data: [], error: null });
        }
      } catch (error) {
        console.error('Error checking for series table:', error);
        return NextResponse.json({ data: [], error: 'Error checking for series table' });
      }
    } else if (supabase) {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '')
        .order('created_at', { ascending: false });
      
      return NextResponse.json({ data, error });
    } else {
      return NextResponse.json({ data: [], error: 'Database client not available' });
    }
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json({ data: [], error: 'Failed to fetch series' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ data: null, error: 'Series ID is required' }, { status: 400 });
    }
    
    if (useLocalPg) {
      const result = await db.query('SELECT * FROM series WHERE id = $1', [id]);
      return NextResponse.json({ data: result.rows[0] || null, error: null });
    } else if (supabase) {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('id', id)
        .single();
      
      return NextResponse.json({ data, error });
    } else {
      return NextResponse.json({ data: null, error: 'Database client not available' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching series by ID:', error);
    return NextResponse.json({ data: null, error: 'Failed to fetch series' }, { status: 500 });
  }
} 