"use client";

import { useState, useEffect } from 'react';
import MovieRow from '../components/MovieRow';
import Hero from '../components/Hero';
import GenreMenu from '../components/GenreMenu';
import CountryMenu from '../components/CountryMenu';
import DiverseRecommendations from '../components/DiverseRecommendations';
import TrendingRecommendations from '../components/TrendingRecommendations';
import GenreRecommendations from '../components/GenreRecommendations';
import RankedRow from '../components/RankedRow';
import { FaRandom } from 'react-icons/fa';
import LazyMovieRow from '../components/LazyMovieRow';
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
  title: item.name || item.title,
  overview: item.overview,
  backdrop_url: `https://image.tmdb.org/t/p/original${item.backdrop_path}`,
  poster_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
  thumbnail_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
  rating: item.vote_average,
  release_year: new Date(item.first_air_date || item.release_date).getFullYear(),
  contentType: 'tvshow',
});

export default function TVShowsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredSeries, setFeaturedSeries] = useState<any | null>(null);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [rankedSeries, setRankedSeries] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genres, setGenres] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [historyTvShows, setHistoryTvShows] = useState<any[]>([]);

  const fetchSeries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [popular, topRated, airingToday, onTheAir, genreData, dailyTrending, countriesData] = await Promise.all([
        fetchFromTMDB('tv/popular'),
        fetchFromTMDB('tv/top_rated'),
        fetchFromTMDB('tv/airing_today'),
        fetchFromTMDB('tv/on_the_air'),
        fetchFromTMDB('genre/tv/list'),
        fetchFromTMDB('trending/tv/day'),
        fetchFromTMDB('configuration/countries'),
      ]);

      const series = [
        ...popular.results.map(transformTMDBData),
        ...topRated.results.map(transformTMDBData),
        ...airingToday.results.map(transformTMDBData),
        ...onTheAir.results.map(transformTMDBData),
      ];

      const uniqueSeries = Array.from(new Map(series.map(s => [s.id, s])).values());
      setAllSeries(uniqueSeries);
      setGenres(genreData.genres);
      setCountries(countriesData);
      setRankedSeries(dailyTrending.results.map(transformTMDBData));

      const featured = uniqueSeries.find(s => s.backdrop_url.endsWith('.jpg'));
      if (featured) {
        setFeaturedSeries(featured);
      }

    } catch (err: any) {
      console.error('Error fetching series:', err);
      setError(err.message || 'An error occurred while fetching series');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const refreshFeaturedContent = () => {
    if (allSeries.length === 0) return;
    setRefreshing(true);
    const seriesWithBackdrops = allSeries.filter(s => s.backdrop_url.endsWith('.jpg'));
    if (seriesWithBackdrops.length > 0) {
      let randomSeries = seriesWithBackdrops[Math.floor(Math.random() * seriesWithBackdrops.length)];
      if (featuredSeries && randomSeries.id === featuredSeries.id) {
        randomSeries = seriesWithBackdrops[Math.floor(Math.random() * seriesWithBackdrops.length)];
      }
      setFeaturedSeries(randomSeries);
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
            setHistoryTvShows(parsed.filter((item: any) => item.contentType === 'tvshow'));
          } catch (e) {
            setHistoryTvShows([]);
          }
        } else {
          setHistoryTvShows([]);
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
      setHistoryTvShows((prev: any[]) => prev.filter((item) => item.id !== id));
    } catch { }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <Hero
          id={featuredSeries?.id}
          title={featuredSeries?.title}
          overview={featuredSeries?.overview}
          backdrop_url={featuredSeries?.backdrop_url}
          poster_url={featuredSeries?.poster_url}
          contentType="tvshow"
          tmdb_id={featuredSeries?.tmdb_id}
        />

        {featuredSeries && (
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing || isLoading}
            className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
            title="Show different TV show"
            aria-label="Show different TV show"
          >
            <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="relative z-[40] w-full max-w-full mx-auto px-2 md:px-4 mt-[-30vh]">
        <div className="mb-6 flex justify-end relative z-[80]">
          <div className="bg-gray-800 bg-opacity-70 backdrop-blur-md rounded-lg px-3 py-2 flex flex-col sm:flex-row">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white whitespace-nowrap">Genre:</h3>
              <GenreMenu
                genres={genres}
                selectedGenre={null}
                onSelectGenre={() => { }}
                horizontal={false}
                useRouting={true}
                contentType="tvshow"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4 border-t sm:border-t-0 sm:border-l border-gray-600 pt-2 sm:pt-0 sm:pl-4">
              <h3 className="text-sm font-semibold text-white whitespace-nowrap">Country:</h3>
              <CountryMenu
                countries={countries}
                selectedCountry={null}
                onSelectCountry={() => { }}
                useRouting={true}
                contentType="tvshow"
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
        {historyTvShows && historyTvShows.length > 0 && (
          <div className="mb-8">
            <LazyMovieRow
              title="Continue watching TV Shows..."
              movies={historyTvShows}
              limit={10}
              onDeleteHistory={handleDeleteHistory}
            />
          </div>
        )}

        <div className="w-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-12 h-12 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-blue-900/30 text-blue-200 px-4 py-3 rounded-lg">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              <>
                {/* Ranked Row */}
                <div className="mb-8">
                  <RankedRow title="Top 10 TV Shows Today" items={rankedSeries} contentType="tvshow" />
                </div>

                <div className="mb-6">
                  <TrendingRecommendations contentType="tvshow" />
                </div>
                {/* Banner di antara rekomendasi TV Shows */}
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-5xl mx-auto">
                    <BannerAd label="Iklan" useSandbox={true} />
                  </div>
                </div>
                <div className="mb-6">
                  <DiverseRecommendations contentType="tvshow" />
                </div>
                {/* Banner setelah DiverseRecommendations TV Shows */}
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-5xl mx-auto">
                    <BannerAd label="Iklan" useSandbox={true} />
                  </div>
                </div>
                <div className="mb-6">
                  <GenreRecommendations contentType="tvshow" />
                </div>
                {/* Banner setelah GenreRecommendations TV Shows */}
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
    </div >
  );
}
