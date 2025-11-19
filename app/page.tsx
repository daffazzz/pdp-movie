"use client";

import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import LazyMovieRow from './components/LazyMovieRow';
import DiverseRecommendations from './components/DiverseRecommendations';
import TrendingRecommendations from './components/TrendingRecommendations';
import GenreRecommendations from './components/GenreRecommendations';
import RankedRow from './components/RankedRow';
import { FaRandom } from 'react-icons/fa';
import NativeAd from './components/NativeAd';
import BannerAd from './components/BannerAd';
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

const transformTMDBData = (item: any, contentType: 'movie' | 'tvshow') => ({
  id: item.id,
  tmdb_id: item.id,
  title: item.title || item.name,
  overview: item.overview,
  backdrop_url: `https://image.tmdb.org/t/p/original${item.backdrop_path}`,
  poster_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
  thumbnail_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
  rating: item.vote_average,
  release_year: new Date(item.release_date || item.first_air_date).getFullYear(),
  contentType,
});

export default function Home() {
  const [featuredContent, setFeaturedContent] = useState<any>(null);
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [rankedMovies, setRankedMovies] = useState<any[]>([]);
  const [rankedSeries, setRankedSeries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'tvshows'>('all');
  const [historyCombined, setHistoryCombined] = useState<any[]>([]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const [
        trendingMovies,
        trendingTv,
        popularMovies,
        popularTv,
        topRatedMovies,
        topRatedTv,
        dailyTrendingMovies,
        dailyTrendingTv
      ] = await Promise.all([
        fetchFromTMDB('trending/movie/week'),
        fetchFromTMDB('trending/tv/week'),
        fetchFromTMDB('movie/popular'),
        fetchFromTMDB('tv/popular'),
        fetchFromTMDB('movie/top_rated'),
        fetchFromTMDB('tv/top_rated'),
        fetchFromTMDB('trending/movie/day'),
        fetchFromTMDB('trending/tv/day'),
      ]);

      const movies = [
        ...trendingMovies.results.map((m: any) => transformTMDBData(m, 'movie')),
        ...popularMovies.results.map((m: any) => transformTMDBData(m, 'movie')),
        ...topRatedMovies.results.map((m: any) => transformTMDBData(m, 'movie')),
      ];

      const series = [
        ...trendingTv.results.map((s: any) => transformTMDBData(s, 'tvshow')),
        ...popularTv.results.map((s: any) => transformTMDBData(s, 'tvshow')),
        ...topRatedTv.results.map((s: any) => transformTMDBData(s, 'tvshow')),
      ];

      const uniqueMovies = Array.from(new Map(movies.map(m => [m.id, m])).values());
      const uniqueSeries = Array.from(new Map(series.map(s => [s.id, s])).values());

      setAllMovies(uniqueMovies);
      setAllSeries(uniqueSeries);

      setRankedMovies(dailyTrendingMovies.results.map((m: any) => transformTMDBData(m, 'movie')));
      setRankedSeries(dailyTrendingTv.results.map((s: any) => transformTMDBData(s, 'tvshow')));

      const allContent = [...uniqueMovies, ...uniqueSeries].filter(c => c.backdrop_url.endsWith('.jpg'));
      if (allContent.length > 0) {
        const randomContent = allContent[Math.floor(Math.random() * allContent.length)];
        setFeaturedContent(randomContent);
      }

    } catch (error) {
      console.error('Error fetching content from TMDB:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const refreshFeaturedContent = () => {
    if (allMovies.length === 0 && allSeries.length === 0) return;
    setRefreshing(true);
    const allContent = [...allMovies, ...allSeries].filter(c => c.backdrop_url.endsWith('.jpg'));
    if (allContent.length > 0) {
      let randomContent = allContent[Math.floor(Math.random() * allContent.length)];
      // Avoid showing the same content twice in a row
      if (featuredContent && randomContent.id === featuredContent.id) {
        randomContent = allContent[Math.floor(Math.random() * allContent.length)];
      }
      setFeaturedContent(randomContent);
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
            setHistoryCombined(parsed);
          } catch (e) {
            setHistoryCombined([]);
          }
        } else {
          setHistoryCombined([]);
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
      setHistoryCombined((prev: any[]) => prev.filter((item) => item.id !== id));
    } catch { }
  };

  return (
    <div className="relative pt-0 bg-background min-h-screen">
      <div className="relative">
        <div className="relative">
          <Hero
            id={featuredContent?.id}
            title={featuredContent?.title}
            overview={featuredContent?.overview}
            backdrop_url={featuredContent?.backdrop_url}
            poster_url={featuredContent?.poster_url}
            contentType={featuredContent?.contentType}
            tmdb_id={featuredContent?.tmdb_id}
          />
          {featuredContent && (
            <button
              onClick={refreshFeaturedContent}
              disabled={refreshing || isLoading}
              className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all backdrop-blur-sm border border-white/10"
              title="Show different movie or TV show"
              aria-label="Show different content"
            >
              <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        <div className="relative z-[30] w-full max-w-full mx-auto px-0 mt-[-15vh] md:mt-[-20vh] bg-gradient-to-t from-background via-background to-transparent pt-20 pb-10">

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8 sticky top-[40px] md:top-[60px] z-40 bg-background/90 backdrop-blur-md py-4 border-b border-white/5">
            <div className="flex space-x-2 md:space-x-6 bg-black/40 p-1.5 rounded-full border border-white/10">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-300 ${activeTab === 'all'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('movies')}
                className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-300 ${activeTab === 'movies'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                Movies
              </button>
              <button
                onClick={() => setActiveTab('tvshows')}
                className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-300 ${activeTab === 'tvshows'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                TV Shows
              </button>
            </div>
          </div>

          {/* Native Ad */}
          <div className="my-6 flex justify-center px-4">
            <div className="w-full max-w-4xl mx-auto">
              <NativeAd />
            </div>
          </div>

          {/* Continue Watching */}
          {historyCombined && historyCombined.length > 0 && (
            <div className="mb-8">
              <LazyMovieRow
                title="Continue Watching"
                movies={historyCombined}
                limit={10}
                onDeleteHistory={handleDeleteHistory}
              />
            </div>
          )}

          <div className="space-y-12 pb-20">
            {/* Movies Section */}
            {(activeTab === 'all' || activeTab === 'movies') && (
              <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center px-4 md:px-8 mb-2">
                  <div className="h-8 w-1.5 bg-red-600 rounded-full mr-3"></div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Movies</h2>
                </div>

                {/* Ranked Movies */}
                <div className="mb-8">
                  <RankedRow
                    title="Top 10 Movies Today"
                    items={rankedMovies}
                    contentType="movie"
                  />
                </div>

                <div className="mb-8">
                  <TrendingRecommendations contentType="movie" />
                </div>

                {/* Banner Ad */}
                <div className="mb-8 flex justify-center px-4">
                  <div className="w-full max-w-5xl mx-auto overflow-hidden rounded-lg shadow-lg border border-white/5">
                    <BannerAd label="Advertisement" useSandbox={true} />
                  </div>
                </div>

                <div className="mb-8">
                  <DiverseRecommendations contentType="movie" />
                </div>

                <div className="mb-8">
                  <GenreRecommendations contentType="movie" />
                </div>
              </div>
            )}

            {/* Divider if showing both */}
            {activeTab === 'all' && (
              <div className="w-full px-4 md:px-8">
                <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>
              </div>
            )}

            {/* TV Shows Section */}
            {(activeTab === 'all' || activeTab === 'tvshows') && (
              <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100">
                <div className="flex items-center px-4 md:px-8 mb-2">
                  <div className="h-8 w-1.5 bg-blue-600 rounded-full mr-3"></div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">TV Shows</h2>
                </div>

                {/* Ranked TV Shows */}
                <div className="mb-8">
                  <RankedRow
                    title="Top 10 TV Shows Today"
                    items={rankedSeries}
                    contentType="tvshow"
                  />
                </div>

                <div className="mb-8">
                  <TrendingRecommendations contentType="tvshow" />
                </div>

                {/* Banner Ad */}
                <div className="mb-8 flex justify-center px-4">
                  <div className="w-full max-w-5xl mx-auto overflow-hidden rounded-lg shadow-lg border border-white/5">
                    <BannerAd label="Advertisement" useSandbox={true} />
                  </div>
                </div>

                <div className="mb-8">
                  <DiverseRecommendations contentType="tvshow" />
                </div>

                <div className="mb-8">
                  <GenreRecommendations contentType="tvshow" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
