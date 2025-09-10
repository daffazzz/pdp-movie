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
      const result = await db.query('SELECT * FROM genres ORDER BY name');
      return NextResponse.json({ data: result.rows, error: null });
    } else if (supabase) {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .order('name');
      
      return NextResponse.json({ data, error });
    } else {
      return NextResponse.json({ data: null, error: 'Database client not available' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching genres:', error);
    return NextResponse.json({ data: null, error: 'Failed to fetch genres' }, { status: 500 });
  }
} 