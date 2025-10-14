"use client";

import { useState, useEffect } from 'react';
import MovieRow from './MovieRow';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface DiverseRecommendationsProps {
  contentType: 'movie' | 'tvshow';
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

const transformTMDBData = (item: any) => ({
  id: item.id,
  tmdb_id: item.id,
  title: item.title || item.name,
  thumbnail_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
  rating: item.vote_average,
  contentType: item.media_type === 'movie' ? 'movie' : 'tvshow',
});

const DiverseRecommendations: React.FC<DiverseRecommendationsProps> = ({ contentType }) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const discoverEndpoint = contentType === 'movie' ? 'movie' : 'tv';
        const recommendationEndpoints = {
            movie: [
                { title: 'Popular Movies', endpoint: 'movie/popular' },
                { title: 'Top Rated Movies', endpoint: 'movie/top_rated' },
                { title: 'Upcoming Movies', endpoint: 'movie/upcoming' },
                { title: 'Now Playing Movies', endpoint: 'movie/now_playing' },
            ],
            tvshow: [
                { title: 'Popular TV Shows', endpoint: 'tv/popular' },
                { title: 'Top Rated TV Shows', endpoint: 'tv/top_rated' },
                { title: 'TV Shows On The Air', endpoint: 'tv/on_the_air' },
                { title: 'TV Shows Airing Today', endpoint: 'tv/airing_today' },
            ]
        };

        const endpoints = recommendationEndpoints[contentType];
        const promises = endpoints.map(e => fetchFromTMDB(e.endpoint));
        const results = await Promise.all(promises);

        const recommendationData = results.map((res, i) => ({
            title: endpoints[i].title,
            endpoint: endpoints[i].endpoint,
            content: res.results.map(transformTMDBData)
        }));

        console.log('Diverse recommendations:', recommendationData);

        setRecommendations(recommendationData);

      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [contentType]);

  const fetchMore = (endpoint: string) => async (page: number) => {
    const res = await fetchFromTMDB(endpoint, `page=${page}`);
    return res.results.map(transformTMDBData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {recommendations.map((category, index) => (
        <MovieRow
          key={`${category.title}-${index}`}
          title={category.title}
          movies={category.content}
          limit={20}
          contentType={contentType}
          fetchMore={fetchMore(category.endpoint)}
        />
      ))}
    </div>
  );
};

export default DiverseRecommendations;