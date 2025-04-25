"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaPlay, FaInfoCircle, FaPlus, FaStar, FaFilm } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

interface MovieCardProps {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  type?: 'movie' | 'tvshow' | 'tvseries';
  tmdb_id?: number;
}

const MovieCard: React.FC<MovieCardProps> = ({ id, title, thumbnail_url, rating, type = 'movie', tmdb_id }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Normalize the type to handle 'tvseries' as 'tvshow'
  const normalizedType = type === 'tvseries' ? 'tvshow' : type;

  // Handler to navigate to movie or TV show detail page
  const navigateToContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (normalizedType === 'tvshow') {
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
    e.stopPropagation();
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
      onClick={navigateToContent}
    >
      {toastMessage && (
        <div className="absolute top-1 right-1 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm z-20">{toastMessage}</div>
      )}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded">
        {thumbnail_url && !imageError ? (
          <div className="relative w-full h-full">
            <Image
              src={thumbnail_url}
              alt={title}
              fill
              className="object-cover bg-gray-900 rounded"
              sizes="(max-width: 768px) 110px, 145px"
              onError={() => setImageError(true)}
              priority={false}
              loading="lazy"
            />
            {/* Indikator tipe konten */}
            {normalizedType === 'tvshow' && (
              <div className="absolute top-1 left-1 bg-blue-600/70 text-white text-[8px] px-1 py-0.5 rounded-sm">
                TV
              </div>
            )}
            {/* Rating yang selalu tampil */}
            <div className="absolute bottom-1 right-1 bg-black/60 rounded-sm flex items-center px-1 py-0.5">
              <FaStar className="text-yellow-400 text-[8px] mr-0.5" />
              <span className="text-white text-[8px]">{rating.toFixed(1)}</span>
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
            <h3 className="text-white text-xs font-medium truncate">{title}</h3>
            
            <div className="flex justify-end">
              <div className="flex gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
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
                  className="bg-white rounded-full p-1 text-black hover:bg-white/90"
                >
                  <FaPlay size={10} />
                </button>
                <button 
                  onClick={navigateToContent}
                  className="bg-gray-700 rounded-full p-1 text-white hover:bg-gray-600"
                >
                  <FaInfoCircle size={10} />
                </button>
                <button 
                  onClick={handleAddToList}
                  className="bg-gray-700 rounded-full p-1 text-white hover:bg-gray-600"
                >
                  <FaPlus size={10} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieCard; 