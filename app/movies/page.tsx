"use client";

import { useState, useEffect, Suspense } from 'react';
import MovieRow from '../components/MovieRow';
import LazyMovieRow from '../components/LazyMovieRow';
import Hero from '../components/Hero';
import GenreMenu from '../components/GenreMenu';
import DiverseRecommendations from '../components/DiverseRecommendations';
import TrendingRecommendations from '../components/TrendingRecommendations';
import GenreRecommendations from '../components/GenreRecommendations';
import RankedRow from '../components/RankedRow';
import { FaRandom } from 'react-icons/fa';
import NativeAd from '../components/NativeAd';
import BannerAd from '../components/BannerAd';
import Script from 'next/script';

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
  id: item.id,
  tmdb_id: item.id,
  title: item.title || item.name,
  overview: item.overview,
  backdrop_url: `https://image.tmdb.org/t/p/original${item.backdrop_path}`,
  poster_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
  thumbnail_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
  rating: item.vote_average,
  release_year: new Date(item.release_date || item.first_air_date).getFullYear(),
  contentType: 'movie',
});

export default function MoviesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<any | null>(null);
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [rankedMovies, setRankedMovies] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genres, setGenres] = useState<any[]>([]);
  const [historyMovies, setHistoryMovies] = useState<any[]>([]);

  const fetchMovies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [popular, topRated, upcoming, nowPlaying, genreData, dailyTrending] = await Promise.all([
        fetchFromTMDB('movie/popular'),
        fetchFromTMDB('movie/top_rated'),
        fetchFromTMDB('movie/upcoming'),
        fetchFromTMDB('movie/now_playing'),
        fetchFromTMDB('genre/movie/list'),
        fetchFromTMDB('trending/movie/day'),
      ]);

      const movies = [
        ...popular.results.map(transformTMDBData),
        ...topRated.results.map(transformTMDBData),
        ...upcoming.results.map(transformTMDBData),
        ...nowPlaying.results.map(transformTMDBData),
      ];

      const uniqueMovies = Array.from(new Map(movies.map(m => [m.id, m])).values());
      setAllMovies(uniqueMovies);
      setGenres(genreData.genres);
      setRankedMovies(dailyTrending.results.map(transformTMDBData));

      const featured = uniqueMovies.find(m => m.backdrop_url.endsWith('.jpg'));
      if (featured) {
        setFeaturedMovie(featured);
      }

    } catch (err: any) {
      console.error('Error fetching movies:', err);
      setError(err.message || 'An error occurred while fetching movies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const refreshFeaturedContent = () => {
    if (allMovies.length === 0) return;
    setRefreshing(true);
    const moviesWithBackdrops = allMovies.filter(m => m.backdrop_url.endsWith('.jpg'));
    if (moviesWithBackdrops.length > 0) {
      let randomMovie = moviesWithBackdrops[Math.floor(Math.random() * moviesWithBackdrops.length)];
      if (featuredMovie && randomMovie.id === featuredMovie.id) {
        randomMovie = moviesWithBackdrops[Math.floor(Math.random() * moviesWithBackdrops.length)];
      }
      setFeaturedMovie(randomMovie);
    }
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    const updateHistory = () => {
      if (typeof window !== 'undefined') {
        const historyStr = localStorage.getItem('movie_history');
        if (historyStr) {
          try {
            const parsed = JSON.parse(historyStr);
            setHistoryMovies(parsed.filter((item: any) => item.contentType === 'movie'));
          } catch (e) {
            setHistoryMovies([]);
          }
        } else {
          setHistoryMovies([]);
        }
      }
    };
    updateHistory();
    window.addEventListener('focus', updateHistory);
    document.addEventListener('visibilitychange', updateHistory);
    return () => {
      window.removeEventListener('focus', updateHistory);
      document.removeEventListener('visibilitychange', updateHistory);
    };
  }, []);

  const handleDeleteHistory = (id: string) => {
    if (typeof window === 'undefined') return;
    const historyStr = localStorage.getItem('movie_history');
    if (!historyStr) return;
    try {
      let parsed = JSON.parse(historyStr);
      parsed = parsed.filter((item: any) => item.id !== id);
      localStorage.setItem('movie_history', JSON.stringify(parsed));
      setHistoryMovies((prev: any[]) => prev.filter((item) => item.id !== id));
    } catch { }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <Hero
          id={featuredMovie?.id}
          title={featuredMovie?.title}
          overview={featuredMovie?.overview}
          backdrop_url={featuredMovie?.backdrop_url}
          poster_url={featuredMovie?.poster_url}
          contentType="movie"
          tmdb_id={featuredMovie?.tmdb_id}
        />

        {featuredMovie && (
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing || isLoading}
            className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
            title="Show different movie"
            aria-label="Show different movie"
          >
            <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="relative z-[40] w-full max-w-full mx-auto px-2 md:px-4 mt-[-30vh]">
        <div className="mb-6 flex justify-end relative z-[80]">
          <div className="bg-gray-800 bg-opacity-70 backdrop-blur-md rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white whitespace-nowrap">Genre:</h3>
              <GenreMenu
                genres={genres}
                selectedGenre={null}
                onSelectGenre={() => { }}
                horizontal={false}
                useRouting={true}
                contentType="movie"
              />
            </div>
          </div>
        </div>
        {/* Hanya NativeAd yang ditampilkan, side-rail ads dihapus */}
        <div className="mb-4 flex justify-center">
          <div className="w-full max-w-2xl mx-auto">
            <NativeAd label="Iklan" />
          </div>
        </div>
        {historyMovies && historyMovies.length > 0 && (
          <div className="mb-8">
            <LazyMovieRow
              title="Continue watching movies..."
              movies={historyMovies}
              limit={10}
              onDeleteHistory={handleDeleteHistory}
            />
          </div>
        )}

        <div className="w-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              <>
                {/* Ranked Row */}
                <div className="mb-8">
                  <RankedRow title="Top 10 Movies Today" items={rankedMovies} contentType="movie" />
                </div>

                <div className="mb-6">
                  <TrendingRecommendations contentType="movie" />
                </div>
                {/* Banner di antara rekomendasi Movies */}
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-5xl mx-auto">
                    <BannerAd label="Iklan" useSandbox={true} />
                  </div>
                </div>
                <div className="mb-6">
                  <DiverseRecommendations contentType="movie" />
                </div>
                {/* Banner setelah DiverseRecommendations Movies */}
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-5xl mx-auto">
                    <BannerAd label="Iklan" useSandbox={true} />
                  </div>
                </div>
                <div className="mb-6">
                  <GenreRecommendations contentType="movie" />
                </div>
                {/* Banner setelah GenreRecommendations Movies */}
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-5xl mx-auto">
                    <BannerAd label="Iklan" useSandbox={true} />
                  </div>
                </div>
              </>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
