import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    
    if (!TMDB_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'TMDB API key not found in environment variables',
        suggestion: 'Make sure NEXT_PUBLIC_TMDB_API_KEY is set in .env.local'
      }, { status: 500 });
    }

    // Test TMDB API connection by making a simple request
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    
    const data = await response.json();
    
    if (data.success === false) {
      return NextResponse.json({
        success: false,
        error: `TMDB API error: ${data.status_message || 'Unknown error'}`,
        tmdbApiKey: TMDB_API_KEY.substring(0, 5) + '...',
        suggestion: 'Check if your TMDB API key is valid'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      tmdbApiKeyValid: true,
      tmdbApiKey: TMDB_API_KEY.substring(0, 5) + '...',
      sampleData: {
        totalResults: data.total_results,
        totalPages: data.total_pages,
        firstMovie: data.results && data.results.length > 0 ? {
          title: data.results[0].title,
          id: data.results[0].id,
          releaseDate: data.results[0].release_date
        } : null
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      tmdbApiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY 
        ? process.env.NEXT_PUBLIC_TMDB_API_KEY.substring(0, 5) + '...' 
        : 'Not found'
    }, { status: 500 });
  }
} 