"use client";

import { useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa';
import MovieCard from './MovieCard';
import MovieViewMore from './MovieViewMore';

interface Movie {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  tmdb_id?: number;
  last_season?: number;
  last_episode?: number;
  type?: string;
}

interface MovieRowProps {
  title: string;
  movies: Movie[];
  contentType?: 'movie' | 'tvshow' | 'tvseries';
  limit?: number;
  onViewMore?: () => void; // Optional callback for parent component to handle View More
  onDeleteHistory?: (id: string) => void;
}

const MovieRow: React.FC<MovieRowProps> = ({ 
  title, 
  movies, 
  contentType = 'movie',
  limit = 20, // Default limit of movies to show in the row
  onViewMore,
  onDeleteHistory
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);
  const [isViewMoreOpen, setIsViewMoreOpen] = useState(false);
  
  // Normalize contentType for backward compatibility
  const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;
  
  // Only display up to the limit in the row
  const displayedMovies = movies.slice(0, limit);
  const hasMoreToShow = movies.length > limit;

  // Log information for debugging
  console.log(`MovieRow "${title}": total=${movies.length}, displayed=${displayedMovies.length}, hasMore=${hasMoreToShow}, contentType=${normalizedContentType}`);

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

  const handleViewMore = () => {
    // If parent provides a handler, use it - otherwise use local state
    if (onViewMore) {
      onViewMore();
    } else {
      setIsViewMoreOpen(true);
    }
  };

  const handleCloseViewMore = () => {
    setIsViewMoreOpen(false);
  };

  // If no movies, don't render the row
  if (!movies || movies.length === 0) return null;

  return (
    <>
      <div className="space-y-0.5 md:space-y-1 py-3 w-full">
        <div className="flex items-center justify-between px-2 md:px-8">
          <h2 className="text-lg md:text-xl font-bold">{title}</h2>
          
          {/* Watch More button - only show if there are more than the limit */}
          {hasMoreToShow && (
            <button 
              onClick={handleViewMore}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition"
              aria-label={`View all ${title}`}
            >
              <span>Watch More</span>
              <FaEye size={14} />
            </button>
          )}
        </div>
        
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
            {displayedMovies.map((movie) => (
              <div key={movie.id} className="flex-none w-[110px] md:w-[145px]">
                <MovieCard
                  id={movie.id}
                  title={movie.title}
                  thumbnail_url={movie.thumbnail_url}
                  rating={movie.rating}
                  type={movie.type === 'tvshow' || movie.type === 'movie' || movie.type === 'tvseries' ? movie.type : normalizedContentType}
                  tmdb_id={movie.tmdb_id}
                  last_season={movie.last_season}
                  last_episode={movie.last_episode}
                  onDeleteHistory={onDeleteHistory}
                />
              </div>
            ))}
            
            {/* Add visual indicator when there are more movies */}
            {hasMoreToShow && (
              <div className="flex-none w-[110px] md:w-[145px] flex items-center justify-center">
                <button
                  onClick={handleViewMore}
                  className="h-40 md:h-52 w-full rounded bg-gray-800/50 hover:bg-gray-700/70 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white"
                >
                  <FaEye size={24} />
                  <span className="text-sm font-medium">{movies.length - limit}+ more</span>
                </button>
              </div>
            )}
          </div>

          <button 
            className="absolute right-1 top-0 bottom-0 z-30 m-auto h-7 w-7 cursor-pointer bg-gray-800/60 hover:bg-gray-700/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            onClick={() => handleClick('right')}
          >
            <FaChevronRight className="text-white" size={14} />
          </button>
        </div>
      </div>

      {/* View More Modal - Only render if using internal state */}
      {!onViewMore && (
        <MovieViewMore
          title={title}
          movies={movies}
          isOpen={isViewMoreOpen}
          onClose={handleCloseViewMore}
          contentType={normalizedContentType}
        />
      )}
    </>
  );
};

export default MovieRow; 