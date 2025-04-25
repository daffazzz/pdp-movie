"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlay, FaInfoCircle, FaPlus } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function NewAndPopularPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'new' | 'popular'>('new');
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all movies
        const { data: allMovies, error } = await supabase
          .from('movies')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }

        // Format movies for display
        const formatMovies = (movieList: any[]) => {
          return movieList.map(movie => ({
            id: movie.id,
            title: movie.title,
            overview: movie.description,
            releaseDate: movie.release_year,
            poster_url: movie.poster_url,
            backdrop_url: movie.backdrop_url,
            rating: movie.rating
          }));
        };

        // New releases - sort by created_at (newest first)
        const newReleasesData = formatMovies(allMovies || []).slice(0, 10);
        
        // Popular movies - sort by rating (highest first)
        const popularMoviesData = [...(allMovies || [])]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 10);
        
        setNewReleases(newReleasesData);
        setPopularMovies(formatMovies(popularMoviesData));
      } catch (err: any) {
        console.error('Error fetching movies:', err);
        setError(err.message || 'An error occurred while fetching movies');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const handlePlay = (id: string) => {
    router.push(`/movie/${id}`);
  };

  const handleMoreInfo = (id: string) => {
    router.push(`/movie/${id}`);
  };

  const handleAddToList = (id: string) => {
    alert(`Added movie ${id} to My List`);
    // Implement actual functionality to add to user's list
  };

  return (
    <div className="pt-24 pb-10 px-4 md:px-16">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">New & Popular</h1>
      
      {/* Tabs */}
      <div className="flex space-x-4 mb-8">
        <button
          className={`px-6 py-2 rounded-full font-medium transition ${
            activeTab === 'new' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('new')}
        >
          New Releases
        </button>
        <button
          className={`px-6 py-2 rounded-full font-medium transition ${
            activeTab === 'popular' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('popular')}
        >
          Popular
        </button>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-md mb-6">
          <p>Error: {error}</p>
          <p className="text-sm mt-1">Please try refreshing the page.</p>
        </div>
      )}
      
      {/* Movie Grid */}
      {!isLoading && !error && (
        <>
          {/* No movies message */}
          {((activeTab === 'new' && newReleases.length === 0) || 
             (activeTab === 'popular' && popularMovies.length === 0)) && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No movies available yet.</p>
              <p className="text-gray-500">Add some movies from the Admin Panel.</p>
            </div>
          )}
          
          {/* Display movies based on active tab */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'new' && newReleases.map((movie) => (
              <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <div className="relative h-40 md:h-56 overflow-hidden">
                  <img
                    src={movie.backdrop_url || 'https://via.placeholder.com/500x281?text=No+Image'}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span className="text-white">{movie.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-3">
                    <p className="text-gray-300 text-sm line-clamp-3">{movie.overview}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePlay(movie.id)}
                        className="flex items-center bg-white text-black px-4 py-1 rounded text-sm font-medium hover:bg-gray-300"
                      >
                        <FaPlay className="mr-2" size={10} />
                        Play
                      </button>
                      <button
                        onClick={() => handleMoreInfo(movie.id)}
                        className="flex items-center bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                      >
                        <FaInfoCircle className="mr-2" size={10} />
                        Info
                      </button>
                    </div>
                    <button
                      onClick={() => handleAddToList(movie.id)}
                      className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600"
                    >
                      <FaPlus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {activeTab === 'popular' && popularMovies.map((movie) => (
              <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <div className="relative h-40 md:h-56 overflow-hidden">
                  <img
                    src={movie.backdrop_url || 'https://via.placeholder.com/500x281?text=No+Image'}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span className="text-white">{movie.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-3">
                    <p className="text-gray-300 text-sm line-clamp-3">{movie.overview}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePlay(movie.id)}
                        className="flex items-center bg-white text-black px-4 py-1 rounded text-sm font-medium hover:bg-gray-300"
                      >
                        <FaPlay className="mr-2" size={10} />
                        Play
                      </button>
                      <button
                        onClick={() => handleMoreInfo(movie.id)}
                        className="flex items-center bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                      >
                        <FaInfoCircle className="mr-2" size={10} />
                        Info
                      </button>
                    </div>
                    <button
                      onClick={() => handleAddToList(movie.id)}
                      className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600"
                    >
                      <FaPlus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 