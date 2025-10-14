"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import MovieCard from '@/app/components/MovieCard';
import GenreMenu from '@/app/components/GenreMenu';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
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

const transformTMDBData = (item: any) => ({
  id: item.id.toString(),
  tmdb_id: item.id,
  title: item.name || item.title,
  thumbnail_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
  rating: item.vote_average,
  type: 'tvshow' as const,
});

export default function TVShowGenrePage() {
  const params = useParams();
  const genreIdString = params?.id as string;
  const genreId = genreIdString ? parseInt(genreIdString, 10) : null;
  const [shows, setShows] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [genreName, setGenreName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastShowElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const fetchShowsByGenre = async () => {
      if (!genreId) return;
      setIsLoading(true);
      setError(null);
      setPage(1);
      setShows([]);
      setHasMore(true);
      try {
        const [genreData, showsData] = await Promise.all([
          fetchFromTMDB('genre/tv/list'),
          fetchFromTMDB('discover/tv', `with_genres=${genreId}&page=1`),
        ]);

        const allGenres = genreData.genres;
        setGenres(allGenres);

        const currentGenre = allGenres.find((g: any) => g.id === genreId);
        setGenreName(currentGenre?.name || '');

        setShows(showsData.results.map(transformTMDBData));
        setHasMore(showsData.page < showsData.total_pages);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShowsByGenre();
  }, [genreId]);

  useEffect(() => {
    const loadMoreShows = async () => {
      if (!genreId || page === 1 || !hasMore) return;
      setIsLoadingMore(true);
      try {
        const showsData = await fetchFromTMDB('discover/tv', `with_genres=${genreId}&page=${page}`);
        setShows(prev => [...prev, ...showsData.results.map(transformTMDBData)]);
        setHasMore(showsData.page < showsData.total_pages);
      } catch (err: any) {
        console.error('Error loading more shows:', err);
      } finally {
        setIsLoadingMore(false);
      }
    };

    loadMoreShows();
  }, [page, genreId, hasMore]);

  return (
    <div className="min-h-screen bg-background pt-24 px-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">{genreName ? `${genreName} TV Shows` : 'TV Shows'}</h1>
            <GenreMenu genres={genres} selectedGenre={genreId} onSelectGenre={() => {}} useRouting={true} contentType="tvshow" />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-12 h-12 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-blue-900/30 text-blue-200 px-4 py-3 rounded-lg">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {shows.map((show, index) => {
                if (shows.length === index + 1) {
                  return (
                    <div key={show.id} ref={lastShowElementRef}>
                      <MovieCard {...show} />
                    </div>
                  );
                } else {
                  return <MovieCard key={show.id} {...show} />;
                }
              })}
            </div>
            {isLoadingMore && (
              <div className="flex justify-center items-center py-8">
                <div className="w-10 h-10 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
              </div>
            )}
            {!hasMore && shows.length > 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>No more shows to load</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
