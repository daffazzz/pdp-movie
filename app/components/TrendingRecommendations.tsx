"use client";

import { useState, useEffect, useCallback } from 'react';
import MovieRow from './MovieRow';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TrendingRecommendationsProps {
  contentType?: 'all' | 'movie' | 'tvshow';
}

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

const TrendingRecommendations: React.FC<TrendingRecommendationsProps> = ({ 
  contentType = 'all' 
}) => {
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        if (contentType === 'all' || contentType === 'movie') {
            const trendingMovies = await fetchFromTMDB('trending/movie/week');
            setMovies(trendingMovies.results.map((m: any) => transformTMDBData(m, 'movie')));
            console.log('Trending movies:', trendingMovies.results);
        }
        if (contentType === 'all' || contentType === 'tvshow') {
            const trendingSeries = await fetchFromTMDB('trending/tv/week');
            setSeries(trendingSeries.results.map((s: any) => transformTMDBData(s, 'tvshow')));
            console.log('Trending series:', trendingSeries.results);
        }
    } catch (err: any) {
      console.error('Error fetching trending content:', err);
      setError('Failed to fetch trending content');
    } finally {
      setIsLoading(false);
    }
  }, [contentType]);

  useEffect(() => {
    fetchTrendingContent();
  }, [fetchTrendingContent]);

  const fetchMore = (type: 'movie' | 'tvshow') => async (page: number) => {
    const endpoint = type === 'movie' ? 'trending/movie/week' : 'trending/tv/week';
    const res = await fetchFromTMDB(endpoint, `page=${page}`);
    return res.results.map((item: any) => transformTMDBData(item, type));
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="text-center text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const showMovies = (contentType === 'all' || contentType === 'movie') && movies.length > 0;
  const showSeries = (contentType === 'all' || contentType === 'tvshow') && series.length > 0;

  return (
    <div className="space-y-8">
      {showMovies && (
        <MovieRow
          title="🔥 Trending Movies Now"
          movies={movies}
          contentType="movie"
          fetchMore={fetchMore('movie')}
        />
      )}
      
      {showSeries && (
        <MovieRow
          title="🔥 Trending TV Shows Now"
          movies={series}
          contentType="tvshow"
          fetchMore={fetchMore('tvshow')}
        />
      )}
    </div>
  );
};

export default TrendingRecommendations;