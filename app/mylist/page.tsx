"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaPlay, FaInfoCircle, FaTrash, FaStar, FaFilm, FaTv } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function MyListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isRemoved, setIsRemoved] = useState(false);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series'>('all');
  const [removeMessage, setRemoveMessage] = useState<string>('');
  
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
    
    // Check if Supabase client is available
    if (!supabase) {
      console.error('Supabase client is not initialized');
      setFavorites([]);
      setListLoading(false);
      return;
    }
    
    try {
      // Fetch movies
      const { data: movieData, error: movieError } = await (supabase as NonNullable<typeof supabase>)
        .from('user_movies')
        .select('movies(*)')
        .eq('user_id', user.id);
      
      if (movieError) {
        console.error('Error loading movies:', movieError);
      }
      
      // Fetch series
      const { data: seriesData, error: seriesError } = await (supabase as NonNullable<typeof supabase>)
        .from('user_series')
        .select('series(*)')
        .eq('user_id', user.id);
      
      if (seriesError) {
        console.error('Error loading series:', seriesError);
      }
      
      // Process and combine the data
      const processedMovies = movieData ? movieData.map(item => ({
        ...item.movies,
        content_type: 'movie'
      })) : [];
      
      const processedSeries = seriesData ? seriesData.map(item => ({
        ...item.series,
        content_type: 'series'
      })) : [];
      
      // Combine and set to state
      setFavorites([...processedMovies, ...processedSeries]);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
    } finally {
      setListLoading(false);
    }
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

  const handlePlayClick = (item: any) => {
    if (item.content_type === 'movie') {
      router.push(`/movie/${item.id}`);
    } else {
      router.push(`/tvshows/${item.id}`);
    }
  };
  
  const handleMoreInfoClick = (item: any) => {
    if (item.content_type === 'movie') {
      router.push(`/movie/${item.id}`);
    } else {
      router.push(`/tvshows/${item.id}`);
    }
  };
  
  const handleRemoveClick = async (item: any) => {
    if (!confirm('Anda yakin ingin menghapus dari My List?')) return;
    
    // Check if Supabase client is available
    if (!supabase) {
      console.error('Supabase client is not initialized');
      alert('Error: Could not connect to database');
      return;
    }
    
    if (item.content_type === 'movie') {
      await (supabase as NonNullable<typeof supabase>)
        .from('user_movies')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', item.id);
      setRemoveMessage('Movie has been removed from your list.');
    } else {
      await (supabase as NonNullable<typeof supabase>)
        .from('user_series')
        .delete()
        .eq('user_id', user.id)
        .eq('series_id', item.id);
      setRemoveMessage('Series has been removed from your list.');
    }
    
    setIsRemoved(true);
    fetchFavorites();
    setTimeout(() => setIsRemoved(false), 3000);
  };
  
  // Filter content based on selection
  const filteredFavorites = favorites.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'movies') return item.content_type === 'movie';
    if (filter === 'series') return item.content_type === 'series';
    return true;
  });
  
  // Remove duplicate items by ID to ensure unique keys
  const uniqueFavorites = filteredFavorites.filter(
    (item, index, self) => index === self.findIndex((i) => i.id === item.id)
  );

  return (
    <div className="pt-24 pb-10 px-4 md:px-16 bg-gray-900 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">My List</h1>
      
      {/* Filter tabs */}
      <div className="flex mb-6 border-b border-gray-700">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 ${filter === 'all' ? 'text-white border-b-2 border-red-600' : 'text-gray-400 hover:text-white'}`}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('movies')}
          className={`px-4 py-2 flex items-center gap-2 ${filter === 'movies' ? 'text-white border-b-2 border-red-600' : 'text-gray-400 hover:text-white'}`}
        >
          <FaFilm size={14} /> Movies
        </button>
        <button 
          onClick={() => setFilter('series')}
          className={`px-4 py-2 flex items-center gap-2 ${filter === 'series' ? 'text-white border-b-2 border-red-600' : 'text-gray-400 hover:text-white'}`}
        >
          <FaTv size={14} /> TV Series
        </button>
      </div>
      
      {/* Notifikasi penghapusan */}
      {isRemoved && (
        <div className="bg-gray-800 text-white p-4 rounded-md mb-6 flex justify-between items-center">
          <p>{removeMessage}</p>
          <button 
            onClick={() => setIsRemoved(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Tampilkan pesan jika tidak ada konten dalam daftar */}
      {uniqueFavorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            {filter === 'all' ? 'Your list is empty.' :
             filter === 'movies' ? 'No movies in your list.' :
             'No TV series in your list.'}
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => router.push('/movies')}
              className="bg-red-600 text-white py-2 px-6 rounded hover:bg-red-700"
            >
              Browse Movies
            </button>
            <button 
              onClick={() => router.push('/tvshows')}
              className="bg-red-600 text-white py-2 px-6 rounded hover:bg-red-700"
            >
              Browse TV Shows
            </button>
          </div>
        </div>
      ) :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {uniqueFavorites.map((item) => (
            <div key={`${item.content_type}-${item.id}`} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="relative h-48 w-full">
                <Image
                  src={item.backdrop_url || '/images/default-backdrop.jpg'}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                {/* Content type badge */}
                <div className="absolute top-2 right-2 bg-gray-900/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  {item.content_type === 'movie' ? (
                    <><FaFilm size={10} /> Movie</>
                  ) : (
                    <><FaTv size={10} /> TV Series</>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold">{item.title}</h2>
                  <div className="flex items-center">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span>{item.rating ? item.rating.toFixed(1) : 'N/A'}</span>
                  </div>
                </div>
                
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.description || item.overview || ''}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    {item.release_year || 'N/A'}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handlePlayClick(item)}
                      className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700"
                      title="Play"
                    >
                      <FaPlay size={14} />
                    </button>
                    <button 
                      onClick={() => handleMoreInfoClick(item)}
                      className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600"
                      title="More info"
                    >
                      <FaInfoCircle size={14} />
                    </button>
                    <button 
                      onClick={() => handleRemoveClick(item)}
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
      }
    </div>
  );
} 