"use client";

import { useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import MovieCard from './MovieCard';

interface Movie {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  tmdb_id?: number;
}

interface MovieRowProps {
  title: string;
  movies: Movie[];
  contentType?: 'movie' | 'tvshow';
}

const MovieRow: React.FC<MovieRowProps> = ({ title, movies, contentType = 'movie' }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);

    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      
      const scrollTo = 
        direction === 'left'
          ? scrollLeft - clientWidth * 0.85
          : scrollLeft + clientWidth * 0.85;
          
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // If no movies, don't render the row
  if (!movies || movies.length === 0) return null;

  return (
    <div className="space-y-0.5 md:space-y-1 py-3 w-full">
      <h2 className="text-lg md:text-xl font-bold px-2 md:px-8">{title}</h2>
      
      <div className="group relative">
        <button 
          className={`absolute left-1 top-0 bottom-0 z-30 m-auto h-7 w-7 cursor-pointer bg-gray-800/60 hover:bg-gray-700/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition ${
            !isMoved && 'hidden'
          }`}
          onClick={() => handleClick('left')}
        >
          <FaChevronLeft className="text-white" size={14} />
        </button>

        <div 
          ref={rowRef}
          className="flex items-center space-x-2 overflow-x-scroll scrollbar-hide px-2 md:px-8 py-2 no-scrollbar"
        >
          {movies.map((movie) => (
            <div key={movie.id} className="flex-none w-[110px] md:w-[145px]">
              <MovieCard
                id={movie.id}
                title={movie.title}
                thumbnail_url={movie.thumbnail_url}
                rating={movie.rating}
                type={contentType}
                tmdb_id={movie.tmdb_id}
              />
            </div>
          ))}
        </div>

        <button 
          className="absolute right-1 top-0 bottom-0 z-30 m-auto h-7 w-7 cursor-pointer bg-gray-800/60 hover:bg-gray-700/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          onClick={() => handleClick('right')}
        >
          <FaChevronRight className="text-white" size={14} />
        </button>
      </div>
    </div>
  );
};

export default MovieRow; 