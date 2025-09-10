"use client";

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlay, FaInfoCircle, FaPlus, FaStar, FaFilm, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

interface MovieCardProps {
  id?: string;
  title?: string;
  thumbnail_url?: string;
  rating?: number;
  type?: 'movie' | 'tvshow' | 'tvseries';
  tmdb_id?: number;
  last_season?: number;
  last_episode?: number;
  onDeleteHistory?: (id: string) => void;
}

function MovieCard({ 
  id = '', 
  title = 'Untitled', 
  thumbnail_url = '', 
  rating = 0, 
  type = 'movie', 
  tmdb_id, 
  last_season, 
  last_episode, 
  onDeleteHistory 
}: MovieCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Validate ID
  if (!id || id.trim() === '') {
    console.warn('MovieCard: Missing or invalid ID');
    return null;
  }
  
  // Validate router
  if (!router) {
    console.error('MovieCard: useRouter returned null or undefined');
    return null;
  }
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);
  const [showPlayTooltip, setShowPlayTooltip] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showAddTooltip, setShowAddTooltip] = useState(false);
  
  const normalizedType = type === 'tvseries' ? 'tvshow' : type || 'movie';

  // Handler to navigate to movie or TV show detail page
  const navigateToContent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate required data
    if (!id) {
      console.warn('MovieCard: Missing ID for navigation');
      return;
    }
    
    // Check if router is available
    if (!router) {
      console.error('MovieCard: useRouter returned null or undefined');
      return;
    }
    
    if (normalizedType === 'tvshow') {
      // Jika ada info episode terakhir, arahkan ke /tvshows/[id]?season=...&episode=...
      if (typeof last_season === 'number' && typeof last_episode === 'number') {
        router.push(`/tvshows/${id}?season=${last_season}&episode=${last_episode}`);
        return;
      }
      // Check if tmdb_id is defined and not null before using it
      if (tmdb_id) {
        router.push(`/tvshows/${tmdb_id}`);
      } else {
        console.warn('TV Show does not have a TMDB ID, using UUID instead');
        router.push(`/tvshows/${id}`);
      }
    } else {
      router.push(`/movie/${id}`);
    }
  };

  const handleAddToList = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate required data
    if (!id) {
      console.warn('MovieCard: Missing ID for adding to list');
      return;
    }
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check if Supabase client is initialized
    if (!supabase) {
      console.error('Supabase client tidak tersedia');
      setToastMessage('Gagal menambahkan ke My List: Database tidak tersedia');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    
    const { error } = await supabase
      .from('user_movies')
      .insert({ user_id: user.id, movie_id: id });
    if (error) {
      console.error('Gagal menambahkan ke My List:', error);
      setToastMessage('Gagal menambahkan ke My List');
    } else {
      console.log('Berhasil menambahkan ke My List');
      setToastMessage('Berhasil ditambahkan ke My List');
    }
    // Hide toast after 3 seconds
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div 
      className="relative group transition duration-150 ease-in-out transform hover:scale-105 hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToContent(e);
      }}
    >
      {toastMessage && (
        <div className="absolute top-1 right-1 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm z-20">{toastMessage}</div>
      )}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded">
        {thumbnail_url && thumbnail_url.trim() !== '' && !imageError ? (
          <div className="relative w-full h-full">
            <img
              src={thumbnail_url || '/placeholder.jpg'}
              alt={title}
              className="object-cover w-full h-full bg-gray-900 rounded"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {/* Indikator tipe konten */}
            {normalizedType === 'tvshow' && (
              <div className="absolute top-1 left-1 bg-blue-600/70 text-white text-[8px] px-1 py-0.5 rounded-sm">
                TV
              </div>
            )}
            {/* Badge episode terakhir jika ada */}
            {normalizedType === 'tvshow' && typeof last_season === 'number' && !isNaN(last_season) && typeof last_episode === 'number' && !isNaN(last_episode) && (
              <div className="absolute top-1 right-1 bg-green-600/80 text-white text-[8px] px-1.5 py-0.5 rounded-sm">
                Lanjut S{last_season}E{last_episode}
              </div>
            )}
            {/* Rating yang selalu tampil */}
            <div className="absolute bottom-1 right-1 bg-black/60 rounded-sm flex items-center px-1 py-0.5">
              <FaStar className="text-yellow-400 text-[8px] mr-0.5" />
              <span className="text-white text-[8px]">{typeof rating === 'number' && !isNaN(rating) ? rating.toFixed(1) : 'N/A'}</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center rounded">
            <FaFilm className="text-gray-500" size={30} />
            {/* Indikator tipe konten untuk placeholder */}
            {normalizedType === 'tvshow' && (
              <div className="absolute top-1 left-1 bg-blue-600/70 text-white text-[8px] px-1 py-0.5 rounded-sm">
                TV
              </div>
            )}
          </div>
        )}
        
        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/75 flex flex-col justify-between p-1.5 rounded">
            <h3 className="text-white text-xs font-medium truncate mb-1 drop-shadow-lg">{title || 'Untitled'}</h3>
            <div className="flex justify-end items-end gap-1.5">
              <div className="flex gap-1.5">
                {/* Play Button */}
                <div className="relative inline-block">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!router) {
                        console.error('MovieCard: useRouter returned null or undefined');
                        return;
                      }
                      if (normalizedType === 'tvshow') {
                        if (tmdb_id) {
                          router.push(`/tvshows/${tmdb_id}`);
                        } else {
                          router.push(`/tvshows/${id}`);
                        }
                      } else {
                        router.push(`/watch/${id}`);
                      }
                    }}
                    onMouseEnter={() => setShowPlayTooltip(true)}
                    onMouseLeave={() => setShowPlayTooltip(false)}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 shadow-md border border-white/10 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label="Putar"
                  >
                    <FaPlay size={13} />
                  </button>
                  {showPlayTooltip && (
                    <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded shadow z-30 whitespace-nowrap">
                      Putar
                    </div>
                  )}
                </div>
                {/* Info Button */}
                <div className="relative inline-block">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (!router) {
                        console.error('MovieCard: useRouter returned null or undefined');
                        return;
                      }
                      navigateToContent(e);
                    }}
                    onMouseEnter={() => setShowInfoTooltip(true)}
                    onMouseLeave={() => setShowInfoTooltip(false)}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 shadow-md border border-white/10 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label="Info"
                  >
                    <FaInfoCircle size={13} />
                  </button>
                  {showInfoTooltip && (
                    <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded shadow z-30 whitespace-nowrap">
                      Info
                    </div>
                  )}
                </div>
                {/* Add to List Button */}
                <div className="relative inline-block">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleAddToList(e);
                    }}
                    onMouseEnter={() => setShowAddTooltip(true)}
                    onMouseLeave={() => setShowAddTooltip(false)}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 shadow-md border border-white/10 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label="Tambah ke My List"
                  >
                    <FaPlus size={13} />
                  </button>
                  {showAddTooltip && (
                    <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded shadow z-30 whitespace-nowrap">
                      Tambah ke My List
                    </div>
                  )}
                </div>
                {/* Delete History Button */}
                {onDeleteHistory && (
                  <div className="relative inline-block">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteHistory && onDeleteHistory(id);
                      }}
                      onMouseEnter={() => setShowDeleteTooltip(true)}
                      onMouseLeave={() => setShowDeleteTooltip(false)}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 shadow-md border border-white/10 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
                      aria-label="Hapus history"
                    >
                      <FaTrash size={13} />
                    </button>
                    {showDeleteTooltip && (
                      <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded shadow z-30 whitespace-nowrap">
                        Hapus history
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MovieCard; 