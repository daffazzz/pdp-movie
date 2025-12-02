"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import MovieCard from '@/app/components/MovieCard';
import GenreMenu from '@/app/components/GenreMenu';
import CountryMenu from '@/app/components/CountryMenu';

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
  title: item.title || item.name,
  thumbnail_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
  rating: item.vote_average,
  type: 'movie' as const,
});

export default function MovieGenrePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const genreIdString = params?.id as string;
  const genreId = genreIdString ? parseInt(genreIdString, 10) : null;
  const countryCode = searchParams?.get('country');
  const [movies, setMovies] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [genreName, setGenreName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useCallback((node: HTMLDivElement | null) => {
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
    const fetchMoviesByGenre = async () => {
      if (!genreId) return;
      setIsLoading(true);
      setError(null);
      setPage(1);
      setMovies([]);
      setHasMore(true);
      try {
        const [genreData, countriesData, moviesData] = await Promise.all([
          fetchFromTMDB('genre/movie/list'),
          fetchFromTMDB('configuration/countries'),
          fetchFromTMDB('discover/movie', `with_genres=${genreId}&page=1${countryCode ? `&with_origin_country=${countryCode}` : ''}`),
        ]);

        const allGenres = genreData.genres;
        setGenres(allGenres);
        setCountries(countriesData);

        const currentGenre = allGenres.find((g: any) => g.id === genreId);
        setGenreName(currentGenre?.name || '');

        setMovies(moviesData.results.map(transformTMDBData));
        setHasMore(moviesData.page < moviesData.total_pages);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoviesByGenre();
  }, [genreId, countryCode]);

  useEffect(() => {
    const loadMoreMovies = async () => {
      if (!genreId || page === 1 || !hasMore) return;
      setIsLoadingMore(true);
      try {
        const moviesData = await fetchFromTMDB('discover/movie', `with_genres=${genreId}&page=${page}${countryCode ? `&with_origin_country=${countryCode}` : ''}`);
        setMovies(prev => [...prev, ...moviesData.results.map(transformTMDBData)]);
        setHasMore(moviesData.page < moviesData.total_pages);
      } catch (err: any) {
        console.error('Error loading more movies:', err);
      } finally {
        setIsLoadingMore(false);
      }
    };

    loadMoreMovies();
  }, [page, genreId, hasMore, countryCode]);

  return (
    <div className="min-h-screen bg-background pt-24 px-4">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-white">{genreName ? `${genreName} Movies` : 'Movies'}</h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">Genre:</span>
              <GenreMenu genres={genres} selectedGenre={genreId} onSelectGenre={() => { }} useRouting={true} contentType="movie" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">Country:</span>
              <CountryMenu countries={countries} selectedCountry={countryCode} onSelectCountry={() => { }} useRouting={true} contentType="movie" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((movie, index) => {
                if (movies.length === index + 1) {
                  return (
                    <div key={movie.id} ref={lastMovieElementRef}>
                      <MovieCard {...movie} />
                    </div>
                  );
                } else {
                  return <MovieCard key={movie.id} {...movie} />;
                }
              })}
            </div>
            {isLoadingMore && (
              <div className="flex justify-center items-center py-8">
                <div className="w-10 h-10 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
              </div>
            )}
            {!hasMore && movies.length > 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>No more movies to load</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
