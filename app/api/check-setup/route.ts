import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results: any = {
    environment: {
      status: 'checking',
      details: {}
    },
    supabase: {
      status: 'checking',
      details: {}
    },
    tmdb: {
      status: 'checking',
      details: {}
    }
  };

  // 1. Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

  results.environment.details = {
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'Not set',
    supabaseKeyPresent: !!supabaseKey,
    tmdbApiKeyPresent: !!tmdbApiKey,
  };

  if (supabaseUrl && supabaseKey && tmdbApiKey) {
    results.environment.status = 'success';
  } else {
    results.environment.status = 'error';
    results.environment.message = 'Some environment variables are missing';
  }

  // 2. Check Supabase connection and table structure
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Check connection by getting user info (doesn't require auth)
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        results.supabase.status = 'error';
        results.supabase.message = `Auth error: ${authError.message}`;
      } else {
        // Check if movies table exists
        const { data: tableInfo, error: tableError } = await supabase
          .from('movies')
          .select('*')
          .limit(1);
        
        if (tableError) {
          results.supabase.status = 'error';
          results.supabase.message = `Table error: ${tableError.message}`;
          
          // Check if it's a permissions issue (RLS)
          if (tableError.message.includes('permission denied')) {
            results.supabase.details.rls = 'RLS policy might be blocking access. Try running fix_rls_issues.sql';
          }
          
          // Check if it's a missing table issue
          if (tableError.message.includes('does not exist')) {
            results.supabase.details.table = 'Table "movies" does not exist. Run the schema.sql file to create it.';
          }
        } else {
          results.supabase.status = 'success';
          results.supabase.details.tableExists = true;
          results.supabase.details.columns = tableInfo && tableInfo.length > 0 
            ? Object.keys(tableInfo[0])
            : [];
            
          // Check if required columns exist
          const requiredColumns = ['id', 'tmdb_id', 'title', 'status', 'genre', 'movie_cast'];
          const missingColumns = requiredColumns.filter(col => 
            !results.supabase.details.columns.includes(col)
          );
          
          if (missingColumns.length > 0) {
            results.supabase.details.missingColumns = missingColumns;
            results.supabase.message = `Missing columns: ${missingColumns.join(', ')}`;
            results.supabase.status = 'warning';
          }
        }
      }
    } catch (error: any) {
      results.supabase.status = 'error';
      results.supabase.message = `Unexpected error: ${error.message}`;
    }
  } else {
    results.supabase.status = 'error';
    results.supabase.message = 'Supabase credentials are missing';
  }

  // 3. Check TMDB API connection
  if (tmdbApiKey) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}&language=en-US&page=1`
      );
      
      const data = await response.json();
      
      if (data.success === false) {
        results.tmdb.status = 'error';
        results.tmdb.message = `API error: ${data.status_message}`;
      } else {
        results.tmdb.status = 'success';
        results.tmdb.details = {
          totalResults: data.total_results,
          totalPages: data.total_pages,
          firstMovie: data.results && data.results.length > 0 ? {
            title: data.results[0].title,
            id: data.results[0].id
          } : null
        };
      }
    } catch (error: any) {
      results.tmdb.status = 'error';
      results.tmdb.message = `Unexpected error: ${error.message}`;
    }
  } else {
    results.tmdb.status = 'error';
    results.tmdb.message = 'TMDB API key is missing';
  }

  // 4. Generate overall status and suggestions
  let status = 'success';
  const suggestions = [];
  
  if (results.environment.status === 'error') {
    status = 'error';
    suggestions.push('Add missing environment variables to .env.local');
  }
  
  if (results.supabase.status === 'error') {
    status = 'error';
    
    if (results.supabase.details.rls) {
      suggestions.push('Fix RLS issues with the provided SQL script');
    }
    
    if (results.supabase.details.table) {
      suggestions.push('Create the movies table with the schema SQL');
    }
  }
  
  if (results.supabase.status === 'warning') {
    if (status !== 'error') status = 'warning';
    suggestions.push('Add missing columns to the movies table');
  }
  
  if (results.tmdb.status === 'error') {
    status = 'error';
    suggestions.push('Verify TMDB API key is correct');
  }

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    results,
    suggestions
  });
} 