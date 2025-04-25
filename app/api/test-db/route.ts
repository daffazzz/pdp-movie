import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Test connection by getting database schema
    const { data: tableInfo, error: tableError } = await supabase
      .from('movies')
      .select('*')
      .limit(1);

    if (tableError) {
      // If there's an error, check if table exists
      return NextResponse.json({
        success: false,
        error: `Database error: ${tableError.message}`,
        supabaseUrl: supabaseUrl.substring(0, 10) + '...',
        supabaseKeyValid: !!supabaseKey,
        suggestion: "Table 'movies' might not exist or has permission issues. Check your Supabase setup."
      }, { status: 500 });
    }

    // Get table columns info
    const { data: columnsInfo, error: columnsError } = await supabase
      .rpc('get_table_info', { table_name: 'movies' })
      .single();

    // Fallback if RPC not available
    const manualColumnsCheck = tableInfo && tableInfo.length > 0 
      ? Object.keys(tableInfo[0]).map(column => ({ column_name: column }))
      : [];

    return NextResponse.json({
      success: true,
      env: {
        supabaseUrl: supabaseUrl.substring(0, 10) + '...',
        supabaseKeyValid: !!supabaseKey,
        tmdbApiKeyValid: !!process.env.NEXT_PUBLIC_TMDB_API_KEY
      },
      tableInfo: {
        exists: true,
        rowCount: tableInfo ? tableInfo.length : 0,
        columns: columnsInfo || manualColumnsCheck
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false, 
      error: error.message,
      supabaseUrl: supabaseUrl.substring(0, 10) + '...',
      supabaseKeyValid: !!supabaseKey
    }, { status: 500 });
  }
} 