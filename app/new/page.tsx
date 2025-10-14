"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlay, FaInfoCircle, FaFilter, FaChevronDown, FaCalendarAlt, FaStar, FaRandom } from 'react-icons/fa';
import MovieCard from '@/app/components/MovieCard';

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
  overview: item.overview,
  backdrop_url: `https://image.tmdb.org/t/p/original${item.backdrop_path}`,
  thumbnail_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
  rating: item.vote_average,
  release_date: item.release_date,
  type: 'movie' as const,
});

export default function NewAndPopularPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'popular'>('new');
  const [movies, setMovies] = useState<any[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<any[]>([]);
  const [filters, setFilters] = useState({ genre: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const genreParams = filters.genre ? `&with_genres=${filters.genre}` : '';
        const endpoint = activeTab === 'new' ? 'movie/now_playing' : 'movie/popular';
        
        const [moviesData, genresData] = await Promise.all([
            fetchFromTMDB(endpoint, `page=${currentPage}${genreParams}`),
            fetchFromTMDB('genre/movie/list')
        ]);

        setMovies(moviesData.results.map(transformTMDBData));
        setTotalPages(moviesData.total_pages);
        setGenres(genresData.genres);

        if (moviesData.results.length > 0) {
          const randomMovie = moviesData.results[Math.floor(Math.random() * moviesData.results.length)];
          setFeaturedMovie(transformTMDBData(randomMovie));
        }

      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [activeTab, filters, currentPage]);

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, genre: e.target.value });
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center mt-8 items-center space-x-2">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1} className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-white'}`}>First</button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-white'}`}>Prev</button>
            <span className="px-3 py-1 bg-gray-800 rounded-md text-white">{currentPage} of {totalPages}</span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-white'}`}>Next</button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-white'}`}>Last</button>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {featuredMovie && (
          <Hero movie={featuredMovie} />
      )}
      <div className="relative z-40 w-full max-w-full mx-auto px-4 md:px-6 pt-4 mt-[-30vh]">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{activeTab === 'new' ? 'New Releases' : 'Popular Movies'}</h1>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-3">
                    <button className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'new' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`} onClick={() => setActiveTab('new')}>New</button>
                    <button className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'popular' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`} onClick={() => setActiveTab('popular')}>Popular</button>
                    <select value={filters.genre} onChange={handleGenreChange} className="bg-gray-700 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <option value="">All Genres</option>
                        {genres.map((genre) => (
                            <option key={genre.id} value={genre.id}>{genre.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-16">
                    <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
                </div>
            ) : error ? (
                <div className="bg-red-900/30 text-white p-4 rounded-md">
                    <p>Error: {error}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {movies.map((movie) => (
                            <MovieCard key={movie.id} {...movie} />
                        ))}
                    </div>
                    <PaginationControls />
                </>
            )}
        </div>
      </div>
    </div>
  );
}

function Hero({ movie }: { movie: any }) {
    const router = useRouter();
    if(!movie) return null;

    return (
        <div className="relative w-full h-[80vh] overflow-hidden">
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background z-10"></div>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${movie.backdrop_url})` }}></div>
            </div>
            <div className="absolute inset-0 flex flex-col justify-end z-20 p-6 md:p-12 lg:p-16">
                <div className="max-w-3xl">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">{movie.title}</h1>
                    <p className="text-gray-200 mb-6 md:text-lg line-clamp-3">{movie.overview}</p>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => router.push(`/movie/${movie.id}`)} className="flex items-center gap-2 px-5 py-2 bg-white text-gray-900 rounded-md font-medium hover:bg-gray-200 transition-colors">
                            <FaPlay size={16} />
                            <span>Watch Now</span>
                        </button>
                        <button onClick={() => router.push(`/movie/${movie.id}`)} className="flex items-center gap-2 px-5 py-2 bg-gray-700/60 text-white rounded-md font-medium hover:bg-gray-600/60 transition-colors backdrop-blur-sm">
                            <FaInfoCircle size={16} />
                            <span>More Info</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}