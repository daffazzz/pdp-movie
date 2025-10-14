"use client";

import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import LazyMovieRow from './components/LazyMovieRow';
import DiverseRecommendations from './components/DiverseRecommendations';
import TrendingRecommendations from './components/TrendingRecommendations';
import GenreRecommendations from './components/GenreRecommendations';
import { FaRandom } from 'react-icons/fa';

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
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'tvshows'>('all');
  const [historyCombined, setHistoryCombined] = useState<any[]>([]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const [trendingMovies, trendingTv, popularMovies, popularTv, topRatedMovies, topRatedTv] = await Promise.all([
        fetchFromTMDB('trending/movie/week'),
        fetchFromTMDB('trending/tv/week'),
        fetchFromTMDB('movie/popular'),
        fetchFromTMDB('tv/popular'),
        fetchFromTMDB('movie/top_rated'),
        fetchFromTMDB('tv/top_rated'),
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
        if(featuredContent && randomContent.id === featuredContent.id) {
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
    } catch {}
  };

  return (
    <div className="relative pt-0 bg-background">
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
              className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
              title="Show different movie or TV show"
              aria-label="Show different content"
            >
              <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        <div className="relative z-[90] w-full max-w-full mx-auto px-2 md:px-4 mt-[-30vh] movie-row-container">
          <div className="bg-transparent shadow-none rounded-t-lg mb-0">
            <div className="flex justify-center py-4">
              <div className="flex space-x-6">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-3 font-medium transition-all duration-300 ${activeTab === 'all' 
                    ? 'text-white border-b-2 border-red-500' 
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-600'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveTab('movies')}
                  className={`px-5 py-3 font-medium transition-all duration-300 ${activeTab === 'movies' 
                    ? 'text-white border-b-2 border-red-500' 
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-600'}`}
                >
                  Movies
                </button>
                <button 
                  onClick={() => setActiveTab('tvshows')}
                  className={`px-5 py-3 font-medium transition-all duration-300 ${activeTab === 'tvshows' 
                    ? 'text-white border-b-2 border-red-500' 
                    : 'text-gray-400 hover:text-white border-b-2 border-transparent hover:border-gray-600'}`}
                >
                  TV Shows
                </button>
              </div>
            </div>
            <div className="w-full h-px bg-gray-800/50 mt-0"></div>
          </div>
          {historyCombined && historyCombined.length > 0 && (
            <LazyMovieRow
              title="Continue watching..."
              movies={historyCombined}
              limit={10}
              onDeleteHistory={handleDeleteHistory}
            />
          )}
          
          <div className="bg-transparent rounded-b-lg shadow-none pb-20">
            <div className="pt-6">
              {(activeTab === 'all' || activeTab === 'movies') && (
                <div className="mb-8">
                  <h2 className="text-xl md:text-2xl font-bold px-2 md:px-4 mb-4 flex items-center border-l-4 border-red-500 pl-3">
                    Movies
                  </h2>
                  <div className="mb-6">
                    <TrendingRecommendations contentType="movie" />
                  </div>
                  <div className="mb-6">
                    <DiverseRecommendations contentType="movie" />
                  </div>
                  <div className="mb-6">
                    <GenreRecommendations contentType="movie" />
                  </div>
                </div>
              )}
              
              {activeTab === 'all' && (
                <div className="w-full max-w-full mx-auto px-2 md:px-4">
                  <div className="h-px bg-gray-800/50 my-8"></div>
                </div>
              )}
              
              {(activeTab === 'all' || activeTab === 'tvshows') && (
                <div className={`${activeTab === 'tvshows' ? 'mt-0' : 'mt-10'}`}>
                  <h2 className="text-xl md:text-2xl font-bold px-2 md:px-4 mb-6 flex items-center border-l-4 border-blue-500 pl-3">
                    TV Shows
                  </h2>
                  <div className="mb-6">
                    <TrendingRecommendations contentType="tvshow" />
                  </div>
                  <div className="mb-6">
                    <DiverseRecommendations contentType="tvshow" />
                  </div>
                  <div className="pb-10">
                    <GenreRecommendations contentType="tvshow" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}