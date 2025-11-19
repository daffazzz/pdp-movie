"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlay, FaInfoCircle, FaStar } from 'react-icons/fa';

interface RankedCardProps {
  id: string;
  rank: number;
  title: string;
  poster_url: string;
  rating: number;
  type: 'movie' | 'tvshow';
  tmdb_id?: number;
}

const RankedCard: React.FC<RankedCardProps> = ({
  id,
  rank,
  title,
  poster_url,
  rating,
  type,
  tmdb_id
}) => {
  const router = useRouter();
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
      className="relative flex items-center group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={navigateToContent}
    >
      {/* Rank Number - SVG to support text stroke/outline effect properly */}
      <div className="relative z-10 w-[100px] h-[160px] md:w-[140px] md:h-[220px] flex items-end justify-end mr-[-30px] md:mr-[-50px] pointer-events-none select-none">
        <svg 
          viewBox="0 0 100 150" 
          className="w-full h-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <text
            x="50%"
            y="100%"
            dominantBaseline="text-bottom"
            textAnchor="middle"
            fill="#000000"
            stroke="#555555"
            strokeWidth="2"
            className="text-[140px] font-black tracking-tighter"
            style={{ 
              fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
              paintOrder: 'stroke',
              textShadow: '0 0 10px rgba(255,255,255,0.1)'
            }}
          >
            {rank}
          </text>
          <text
            x="50%"
            y="100%"
            dominantBaseline="text-bottom"
            textAnchor="middle"
            fill="#ffffff"
            className="text-[140px] font-black tracking-tighter"
            style={{ 
              fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
            }}
          >
            {rank}
          </text>
        </svg>
      </div>

      {/* Movie Card */}
      <div className={`relative z-20 transition-all duration-300 ease-in-out transform ${isHovered ? 'scale-110 shadow-2xl shadow-red-500/20' : 'scale-100'}`}>
        <div className="w-[110px] h-[160px] md:w-[150px] md:h-[220px] rounded-lg overflow-hidden bg-gray-800">
          {!imageError ? (
            <img
              src={poster_url}
              alt={title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
              <span className="text-xs text-center px-2">{title}</span>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
          
          {/* Rating Badge */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 text-white">
            <FaStar className="text-yellow-400" size={10} />
            {rating.toFixed(1)}
          </div>
        </div>

        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center gap-3 rounded-lg backdrop-blur-[1px] animate-in fade-in duration-200">
            <button 
              className="bg-white text-black rounded-full p-3 hover:bg-red-600 hover:text-white transition-colors shadow-lg transform hover:scale-110"
              onClick={navigateToContent}
            >
              <FaPlay size={16} className="ml-1" />
            </button>
            <button 
              className="bg-gray-600/80 text-white rounded-full p-2 hover:bg-gray-500 transition-colors shadow-lg"
              onClick={navigateToContent}
            >
              <FaInfoCircle size={16} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
              <p className="text-white text-xs font-bold truncate drop-shadow-md">{title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankedCard;
