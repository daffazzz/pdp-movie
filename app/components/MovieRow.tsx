"use client";

import { useRef, useState, useEffect } from 'react';
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Normalize contentType for backward compatibility
  const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;
  
  // Only display up to the limit in the row
  const displayedMovies = movies.slice(0, limit);
  const hasMoreToShow = movies.length > limit;

  // Function to check scroll position and update button states
  const checkScrollPosition = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      const canLeft = scrollLeft > 5; // Small threshold to account for rounding
      const canRight = scrollLeft < scrollWidth - clientWidth - 5;
      
      setCanScrollLeft(canLeft);
      setCanScrollRight(canRight);
    }
  };

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);

    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      
      const scrollTo = 
        direction === 'left'
          ? scrollLeft - clientWidth * 0.85
          : scrollLeft + clientWidth * 0.85;
          
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
      
      // Check scroll position after animation
      setTimeout(checkScrollPosition, 300);
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

  // Initialize scroll position check
  useEffect(() => {
    // Delay the initial check to ensure DOM is rendered
    const timer = setTimeout(() => {
      checkScrollPosition();
    }, 100);
    
    const handleScroll = () => {
      checkScrollPosition();
    };

    const currentRef = rowRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
      // Also check on resize
      window.addEventListener('resize', checkScrollPosition);
    }

    return () => {
      clearTimeout(timer);
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [displayedMovies.length]);

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
          {/* Left scroll button */}
          <button 
            className={`absolute left-2 top-1/2 transform -translate-y-1/2 z-40 h-10 w-10 cursor-pointer bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${
              canScrollLeft ? 'opacity-90 hover:opacity-100' : 'opacity-30'
            }`}
            onClick={() => handleClick('left')}
            disabled={!canScrollLeft}
          >
            <FaChevronLeft className="text-white" size={18} />
          </button>

          {/* Right scroll button */}
          <button 
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 z-40 h-10 w-10 cursor-pointer bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${
              displayedMovies.length >= 3 ? 'opacity-90 hover:opacity-100' : 'opacity-30'
            }`}
            onClick={() => handleClick('right')}
          >
            <FaChevronRight className="text-white" size={18} />
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