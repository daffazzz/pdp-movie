"use client";

import { useState, useEffect } from 'react';
import MovieRow from './MovieRow';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface GenreRecommendationsProps {
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

const transformTMDBData = (item: any, contentType: 'movie' | 'tvshow') => ({
  id: item.id,
  tmdb_id: item.id,
  title: item.title || item.name,
  thumbnail_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
  rating: item.vote_average,
  type: contentType,
});

const GenreRecommendations: React.FC<GenreRecommendationsProps> = ({ contentType }) => {
  const [genreRecommendations, setGenreRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGenreRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const discoverEndpoint = contentType === 'movie' ? 'discover/movie' : 'discover/tv';

        // Popular genres for movies and TV shows
        const genreConfig = {
          movie: [
            { title: '🎬 Action & Adventure', genreIds: '28,12', sortBy: 'popularity.desc' },
            { title: '😂 Comedy Movies', genreIds: '35', sortBy: 'popularity.desc' },
            { title: '😱 Horror & Thriller', genreIds: '27,53', sortBy: 'popularity.desc' },
            { title: '🚀 Sci-Fi & Fantasy', genreIds: '878,14', sortBy: 'vote_average.desc&vote_count.gte=1000' },
            { title: '💕 Romance & Drama', genreIds: '10749,18', sortBy: 'vote_average.desc&vote_count.gte=500' },
            { title: '🎭 Award-Winning Films', genreIds: '', sortBy: 'vote_average.desc&vote_count.gte=5000' },
          ],
          tvshow: [
            { title: '🎬 Action & Adventure Shows', genreIds: '10759', sortBy: 'popularity.desc' },
            { title: '😂 Comedy Series', genreIds: '35', sortBy: 'popularity.desc' },
            { title: '🔍 Mystery & Crime', genreIds: '9648,80', sortBy: 'popularity.desc' },
            { title: '🚀 Sci-Fi & Fantasy Shows', genreIds: '10765', sortBy: 'vote_average.desc&vote_count.gte=500' },
            { title: '💕 Drama Series', genreIds: '18', sortBy: 'vote_average.desc&vote_count.gte=500' },
            { title: '🎭 Top Rated Series', genreIds: '', sortBy: 'vote_average.desc&vote_count.gte=1000' },
          ]
        };

        const genres = genreConfig[contentType];
        const promises = genres.map(g => {
          const genreParam = g.genreIds ? `with_genres=${g.genreIds}&` : '';
          return fetchFromTMDB(discoverEndpoint, `${genreParam}sort_by=${g.sortBy}`);
        });

        const results = await Promise.all(promises);

        const genreData = results.map((res, i) => ({
          title: genres[i].title,
          genreIds: genres[i].genreIds,
          sortBy: genres[i].sortBy,
          content: res.results.map((item: any) => transformTMDBData(item, contentType))
        }));

        setGenreRecommendations(genreData);

      } catch (error) {
        console.error('Error fetching genre recommendations:', error);
        setError('Failed to load genre recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenreRecommendations();
  }, [contentType]);

  const fetchMore = (genreIds: string, sortBy: string) => async (page: number) => {
    const discoverEndpoint = contentType === 'movie' ? 'discover/movie' : 'discover/tv';
    const genreParam = genreIds ? `with_genres=${genreIds}&` : '';
    const res = await fetchFromTMDB(discoverEndpoint, `${genreParam}sort_by=${sortBy}&page=${page}`);
    return res.results.map((item: any) => transformTMDBData(item, contentType));
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
      {genreRecommendations.map((category, index) => (
        <MovieRow
          key={`${category.title}-${index}`}
          title={category.title}
          movies={category.content}
          limit={20}
          contentType={contentType}
          fetchMore={fetchMore(category.genreIds, category.sortBy)}
        />
      ))}
    </div>
  );
};

export default GenreRecommendations;
