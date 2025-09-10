'use client';

import { useState, useEffect, useCallback } from 'react';
import InfiniteScrollMovieRow from './InfiniteScrollMovieRow';
import { cache, CacheKeys } from '@/lib/cache';

interface TrendingContent {
  movies: any[];
  series: any[];
  total_movies: number;
  total_series: number;
  page: number;
  has_more: boolean;
}

interface TrendingRecommendationsProps {
  contentType?: 'all' | 'movie' | 'tvshow';
}

const TrendingRecommendations: React.FC<TrendingRecommendationsProps> = ({ 
  contentType = 'all' 
}) => {
  const [trendingContent, setTrendingContent] = useState<TrendingContent>({
    movies: [],
    series: [],
    total_movies: 0,
    total_series: 0,
    page: 1,
    has_more: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch trending content (initial load)
  const fetchTrendingContent = useCallback(async (reset: boolean = true) => {
    try {
      if (reset) {
        setIsLoading(true);
        setCurrentPage(1);
      }
      setError(null);
      
      const typeParam = contentType === 'tvshow' ? 'tv' : contentType;
      const cacheKey = `trending_component:${typeParam}:1`;
      
      // Try client-side cache first
      const cachedData = cache.getWithStats<TrendingContent>(cacheKey);
      if (cachedData && reset) {
        console.log(`Client cache HIT for trending ${typeParam}`);
        // Ensure we don't have duplicate movies in cached data
        const uniqueMovies = Array.from(
          new Map(cachedData.movies.map(movie => [movie.id, movie])).values()
        );
        
        const uniqueSeries = Array.from(
          new Map(cachedData.series.map(series => [series.id, series])).values()
        );
        
        setTrendingContent({
          movies: uniqueMovies,
          series: uniqueSeries,
          total_movies: uniqueMovies.length,
          total_series: uniqueSeries.length,
          page: cachedData.page,
          has_more: cachedData.has_more
        });
        setCurrentPage(1);
        setIsLoading(false);
        return;
      }
      
      console.log(`Client cache MISS for trending ${typeParam} - fetching from API`);
      
      const response = await fetch(`/api/trending?page=1&type=${typeParam}`);
      
      // Check content type before parsing JSON
      const contentTypeHeader = response.headers.get('content-type');
      if (!contentTypeHeader || !contentTypeHeader.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 500));
        throw new Error(`API returned non-JSON response. Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Ensure we don't have duplicate movies before setting state
        const uniqueMovies = Array.from(
          new Map(result.data.movies.map(movie => [movie.id, movie])).values()
        );
        
        const uniqueSeries = Array.from(
          new Map(result.data.series.map(series => [series.id, series])).values()
        );
        
        setTrendingContent({
          movies: uniqueMovies,
          series: uniqueSeries,
          total_movies: uniqueMovies.length,
          total_series: uniqueSeries.length,
          page: result.data.page,
          has_more: result.data.has_more
        });
        setCurrentPage(1);
        
        // Cache the result for 5 minutes
        cache.setTrending(cacheKey, {
          movies: uniqueMovies,
          series: uniqueSeries,
          total_movies: uniqueMovies.length,
          total_series: uniqueSeries.length,
          page: result.data.page,
          has_more: result.data.has_more
        });
      } else {
        setError(result.error || 'Failed to fetch trending content');
      }
    } catch (err: any) {
      console.error('Error fetching trending content:', err);
      setError('Failed to fetch trending content');
    } finally {
      setIsLoading(false);
    }
  }, [contentType]);

  // Load more trending content
  const loadMoreContent = useCallback(async () => {
    if (isLoadingMore || !trendingContent.has_more) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const typeParam = contentType === 'tvshow' ? 'tv' : contentType;
      const cacheKey = `trending_component:${typeParam}:${nextPage}`;
      
      // Try client-side cache first
      const cachedData = cache.getWithStats<{movies: any[], series: any[], total_movies: number, total_series: number, has_more: boolean}>(cacheKey);
      if (cachedData) {
        console.log(`Client cache HIT for trending ${typeParam} page ${nextPage}`);
        // Append cached data to existing content
        setTrendingContent(prev => {
          // Create a Set of existing movie IDs for quick lookup
          const existingMovieIds = new Set(prev.movies.map(m => m.id));
          const existingSeriesIds = new Set(prev.series.map(s => s.id));
          
          // Filter out duplicates from cached data
          const newMovies = cachedData.movies.filter(movie => !existingMovieIds.has(movie.id));
          const newSeries = cachedData.series.filter(series => !existingSeriesIds.has(series.id));
          
          // Combine and deduplicate all movies and series
          const allMovies = [...prev.movies, ...newMovies];
          const allSeries = [...prev.series, ...newSeries];
          
          // Final deduplication to ensure no duplicates
          const uniqueMovies = Array.from(
            new Map(allMovies.map(movie => [movie.id, movie])).values()
          );
          
          const uniqueSeries = Array.from(
            new Map(allSeries.map(series => [series.id, series])).values()
          );
          
          return {
            movies: uniqueMovies,
            series: uniqueSeries,
            total_movies: uniqueMovies.length,
            total_series: uniqueSeries.length,
            page: nextPage,
            has_more: cachedData.has_more
          };
        });
        setCurrentPage(nextPage);
        setIsLoadingMore(false);
        return;
      }
      
      console.log(`Client cache MISS for trending ${typeParam} page ${nextPage} - fetching from API`);
      
      const response = await fetch(`/api/trending?page=${nextPage}&type=${typeParam}`);
      
      // Check content type before parsing JSON
      const contentTypeHeader = response.headers.get('content-type');
      if (!contentTypeHeader || !contentTypeHeader.includes('application/json')) {
        const text = await response.text();
        console.error('API returned non-JSON response:', text.substring(0, 500));
        throw new Error(`API returned non-JSON response. Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Append new content to existing content, but avoid duplicates
        setTrendingContent(prev => {
          // Create a Set of existing movie IDs for quick lookup
          const existingMovieIds = new Set(prev.movies.map(m => m.id));
          const existingSeriesIds = new Set(prev.series.map(s => s.id));
          
          // Filter out duplicates from new data
          const newMovies = result.data.movies.filter(movie => !existingMovieIds.has(movie.id));
          const newSeries = result.data.series.filter(series => !existingSeriesIds.has(series.id));
          
          // Combine and deduplicate all movies and series
          const allMovies = [...prev.movies, ...newMovies];
          const allSeries = [...prev.series, ...newSeries];
          
          // Final deduplication to ensure no duplicates
          const uniqueMovies = Array.from(
            new Map(allMovies.map(movie => [movie.id, movie])).values()
          );
          
          const uniqueSeries = Array.from(
            new Map(allSeries.map(series => [series.id, series])).values()
          );
          
          return {
            movies: uniqueMovies,
            series: uniqueSeries,
            total_movies: uniqueMovies.length,
            total_series: uniqueSeries.length,
            page: result.data.page,
            has_more: result.data.has_more
          };
        });
        setCurrentPage(nextPage);
        
        // Cache the new page data
        cache.setTrending(cacheKey, result.data);
      }
    } catch (err: any) {
      console.error('Error loading more trending content:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [contentType, currentPage, isLoadingMore, trendingContent.has_more]);

  useEffect(() => {
    fetchTrendingContent();
  }, [fetchTrendingContent]); // Reset when contentType changes

  // Show loading state
  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
        <p className="text-center text-gray-400 mt-4">Loading trending content...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="py-8">
        <div className="text-center text-red-400">
          <p>Error loading trending content: {error}</p>
          <button
            onClick={fetchTrendingContent}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if we have content to show
  const hasMovies = trendingContent.movies.length > 0;
  const hasSeries = trendingContent.series.length > 0;
  const showMovies = (contentType === 'all' || contentType === 'movie') && hasMovies;
  const showSeries = (contentType === 'all' || contentType === 'tvshow') && hasSeries;

  if (!showMovies && !showSeries) {
    return (
      <div className="py-8">
        <div className="text-center text-gray-400">
          <p>No trending content available at the moment.</p>
          <button
            onClick={fetchTrendingContent}
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showMovies && (
        <InfiniteScrollMovieRow
          title="🔥 Trending Movies Now"
          movies={trendingContent.movies}
          contentType="movie"
          onLoadMore={loadMoreContent}
          isLoadingMore={isLoadingMore}
          hasMore={trendingContent.has_more}
        />
      )}
      
      {showSeries && (
        <InfiniteScrollMovieRow
          title="🔥 Trending TV Shows Now"
          movies={trendingContent.series}
          contentType="tvshow"
          onLoadMore={loadMoreContent}
          isLoadingMore={isLoadingMore}
          hasMore={trendingContent.has_more}
        />
      )}
    </div>
  );
};

export default TrendingRecommendations;
