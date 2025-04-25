"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaPlay, FaInfoCircle, FaTrash, FaStar } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function MyListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isRemoved, setIsRemoved] = useState(false);
  const [listLoading, setListLoading] = useState<boolean>(true);
  
  // Redirect to /login jika belum login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Ambil daftar My List dari DB
  const fetchFavorites = async () => {
    if (!user) return;
    setListLoading(true);
    const { data, error } = await supabase
      .from('user_movies')
      .select('movies(*)')
      .eq('user_id', user.id);
    if (error) {
      console.error('Error loading My List:', error);
      setFavorites([]);
    } else {
      setFavorites(data.map(item => item.movies));
    }
    setListLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchFavorites();
    }
  }, [user, authLoading]);

  // Show loading while auth or list data belum siap
  if (authLoading || !user || listLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const handlePlayClick = (movieId: string) => {
    router.push(`/movie/${movieId}`);
  };
  
  const handleMoreInfoClick = (movieId: string) => {
    router.push(`/movie/${movieId}`);
  };
  
  const handleRemoveClick = async (movieId: string) => {
    if (!confirm('Anda yakin ingin menghapus dari My List?')) return;
    await supabase
      .from('user_movies')
      .delete()
      .eq('user_id', user.id)
      .eq('movie_id', movieId);
    setIsRemoved(true);
    fetchFavorites();
    setTimeout(() => setIsRemoved(false), 3000);
  };
  
  // Remove duplicate movies by ID to ensure unique keys
  const uniqueFavorites = favorites.filter(
    (movie, index, self) => index === self.findIndex((m) => m.id === movie.id)
  );

  return (
    <div className="pt-24 pb-10 px-4 md:px-16 bg-gray-900 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">My List</h1>
      
      {/* Notifikasi penghapusan */}
      {isRemoved && (
        <div className="bg-gray-800 text-white p-4 rounded-md mb-6 flex justify-between items-center">
          <p>Movie has been removed from your list.</p>
          <button 
            onClick={() => setIsRemoved(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Tampilkan pesan jika tidak ada film dalam daftar */}
      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Your list is empty.</p>
          <button 
            onClick={() => router.push('/movies')}
            className="bg-red-600 text-white py-2 px-6 rounded hover:bg-red-700"
          >
            Browse Movies
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {uniqueFavorites.map((movie) => (
            <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="relative h-48 w-full">
                <Image
                  src={movie.backdrop_url}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold">{movie.title}</h2>
                  <div className="flex items-center">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span>{movie.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{movie.overview}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Added: {movie.addedDate}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handlePlayClick(movie.id)}
                      className="p-2 bg-white rounded-full text-black hover:bg-opacity-90"
                      title="Play"
                    >
                      <FaPlay size={14} />
                    </button>
                    <button 
                      onClick={() => handleMoreInfoClick(movie.id)}
                      className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600"
                      title="More info"
                    >
                      <FaInfoCircle size={14} />
                    </button>
                    <button 
                      onClick={() => handleRemoveClick(movie.id)}
                      className="p-2 bg-gray-700 rounded-full text-white hover:bg-red-600"
                      title="Remove from My List"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 