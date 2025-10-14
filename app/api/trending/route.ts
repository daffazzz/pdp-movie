import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const fetchFromTMDB = async (endpoint: string, params: string = '') => {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${TMDB_BASE_URL}/${endpoint}${separator}api_key=${TMDB_API_KEY}&language=en-US&${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from TMDB: ${endpoint}`);
    }
    return response.json();
  };

const transformTMDBData = (item: any, contentType: 'movie' | 'tvshow') => ({
    id: item.id,
    tmdb_id: item.id,
    title: item.title || item.name,
    thumbnail_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
    rating: item.vote_average,
    contentType,
});

export async function GET(request: NextRequest) {
  try {
    if (!TMDB_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'TMDB API key not configured'
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const contentType = searchParams.get('type') || 'all';

    let movies: any[] = [];
    let series: any[] = [];

    if (contentType === 'all' || contentType === 'movie') {
        const trendingMovies = await fetchFromTMDB('trending/movie/week', `page=${page}`);
        movies = trendingMovies.results.map((m: any) => transformTMDBData(m, 'movie'));
    }

    if (contentType === 'all' || contentType === 'tv') {
        const trendingSeries = await fetchFromTMDB('trending/tv/week', `page=${page}`);
        series = trendingSeries.results.map((s: any) => transformTMDBData(s, 'tvshow'));
    }

    return NextResponse.json({
      success: true,
      data: {
        movies,
        series,
        page,
        has_more: true // Assume there are always more pages for simplicity
      }
    });

  } catch (error: any) {
    console.error('Error in trending API:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}