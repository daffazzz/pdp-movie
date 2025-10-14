"use client";

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlay, FaInfoCircle, FaStar, FaFilm, FaTrash } from 'react-icons/fa';

interface MovieCardProps {
  id?: string;
  title?: string;
  thumbnail_url?: string;
  rating?: number;
  type?: 'movie' | 'tvshow';
  tmdb_id?: number;
  onDeleteHistory?: (id: string) => void;
}

function MovieCard({ onDeleteHistory, ...movie }: MovieCardProps) {
  const { id, title, thumbnail_url, rating, type, tmdb_id } = movie;
  const router = useRouter();
  
  if (!id) {
    return null;
  }
  
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const normalizedType = type === 'tvshow' ? 'tvshows' : 'movie';

  const navigateToContent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/${normalizedType}/${tmdb_id || id}`);
  };

  return (
    <div 
      className="relative group transition duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-500/30 hover:z-10 rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={navigateToContent}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded">
        {thumbnail_url && !imageError ? (
          <div className="relative w-full h-full">
            <img
              src={thumbnail_url}
              alt={title}
              className="object-cover w-full h-full bg-gray-900 rounded"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            {normalizedType === 'tvshows' && (
              <div className="absolute top-1 left-1 bg-blue-600/70 text-white text-[8px] px-1 py-0.5 rounded-sm">
                TV
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 rounded-full flex items-center px-2 py-1">
              <FaStar className="text-yellow-400 text-xs mr-1" />
              <span className="text-white text-xs font-bold">{rating ? rating.toFixed(1) : 'N/A'}</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center rounded">
            <FaFilm className="text-gray-500" size={30} />
            {normalizedType === 'tvshows' && (
              <div className="absolute top-1 left-1 bg-blue-600/70 text-white text-[8px] px-1 py-0.5 rounded-sm">
                TV
              </div>
            )}
          </div>
        )}
        
        {isHovered && (
          <div className="absolute inset-0 bg-black/75 flex flex-col justify-between p-1.5 rounded">
            <h3 className="text-white text-sm font-bold truncate mb-2 text-shadow-md">{title}</h3>
            <div className="flex justify-end items-end gap-1.5">
              <div className="flex gap-1.5">
                <button
                  onClick={navigateToContent}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  aria-label="Play"
                >
                  <FaPlay size={13} />
                </button>
                <button
                  onClick={navigateToContent}
                  className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2 shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-600/50"
                  aria-label="Info"
                >
                  <FaInfoCircle size={13} />
                </button>
                {onDeleteHistory && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteHistory(id);
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white rounded-full p-2 shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-600/50"
                    aria-label="Delete history"
                  >
                    <FaTrash size={13} />
                  </button>
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
