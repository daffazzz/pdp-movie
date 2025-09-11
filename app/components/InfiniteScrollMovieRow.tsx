"use client";

import { useRef, useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaSpinner } from 'react-icons/fa';
import MovieCard from './MovieCard';

interface Movie {
  id?: string;
  title?: string;
  thumbnail_url?: string;
  rating?: number;
  tmdb_id?: number;
  last_season?: number;
  last_episode?: number;
  type?: string;
}

interface InfiniteScrollMovieRowProps {
  title: string;
  movies: Movie[];
  contentType?: 'movie' | 'tvshow' | 'tvseries';
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

const InfiniteScrollMovieRow: React.FC<InfiniteScrollMovieRowProps> = ({ 
  title, 
  movies, 
  contentType = 'movie',
  onLoadMore,
  isLoadingMore = false,
  hasMore = true
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Normalize contentType for backward compatibility
  const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;

  // Function to check scroll position and update button states
  const checkScrollPosition = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      const canLeft = scrollLeft > 5;
      const canRight = scrollLeft < scrollWidth - clientWidth - 5;
      
      setCanScrollLeft(canLeft);
      setCanScrollRight(canRight);
      
      // Check if we're near the end and need to load more
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;
      if (scrollPercentage > 0.8 && hasMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    }
  };

  const handleClick = (direction: 'left' | 'right') => {
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

  // Initialize scroll position check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollPosition();
    }, 100);
    
    const handleScroll = () => {
      checkScrollPosition();
    };

    const currentRef = rowRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', checkScrollPosition);
    }

    return () => {
      clearTimeout(timer);
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [movies.length, hasMore, isLoadingMore]);

  // If no movies, don't render the row
  if (!movies || movies.length === 0) return null;

  return (
    <div className="space-y-0.5 md:space-y-1 py-3 w-full">
      <div className="flex items-center justify-between px-2 md:px-8">
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        <div className="text-sm text-gray-400">
          {movies.length} items {hasMore && '• Loading more...'}
        </div>
      </div>
      
      <div className="group relative">
        {/* Left scroll button - hidden on mobile */}
        <button 
          className={`hidden md:flex absolute left-2 top-1/2 transform -translate-y-1/2 z-40 h-10 w-10 cursor-pointer bg-black hover:shadow-lg rounded-full items-center justify-center transition-all duration-200 ${
            canScrollLeft ? 'opacity-90 hover:opacity-100' : 'opacity-30'
          }`}
          onClick={() => handleClick('left')}
          disabled={!canScrollLeft}
        >
          <FaChevronLeft className="text-white" size={18} />
        </button>

        {/* Right scroll button - hidden on mobile */}
        <button 
          className={`hidden md:flex absolute right-2 top-1/2 transform -translate-y-1/2 z-40 h-10 w-10 cursor-pointer bg-black hover:shadow-lg rounded-full items-center justify-center transition-all duration-200 ${
            movies.length >= 3 ? 'opacity-90 hover:opacity-100' : 'opacity-30'
          }`}
          onClick={() => handleClick('right')}
        >
          <FaChevronRight className="text-white" size={18} />
        </button>

        <div 
          ref={rowRef}
          className="flex items-center space-x-2 overflow-x-scroll scrollbar-hide px-2 md:px-8 py-2 no-scrollbar"
        >
          {movies && Array.isArray(movies) && (() => {
            // Create a Map to track unique movies by ID
            const uniqueMovies = new Map();
            const filteredMovies = movies.filter(movie => movie.id && movie.id.trim() !== '');
            
            filteredMovies.forEach(movie => {
              if (!uniqueMovies.has(movie.id)) {
                uniqueMovies.set(movie.id, movie);
              }
            });
            
            return Array.from(uniqueMovies.values()).map((movie, index) => (
              <div key={`${movie.id}-${index}`} className="flex-none w-[110px] md:w-[145px]">
              <MovieCard
                id={movie.id || ''}
                title={movie.title || 'Untitled'}
                thumbnail_url={movie.thumbnail_url || ''}
                rating={typeof movie.rating === 'number' ? movie.rating : 0}
                type={movie.type === 'tvshow' || movie.type === 'movie' || movie.type === 'tvseries' ? movie.type : normalizedContentType}
                tmdb_id={movie.tmdb_id}
                last_season={typeof movie.last_season === 'number' ? movie.last_season : undefined}
                last_episode={typeof movie.last_episode === 'number' ? movie.last_episode : undefined}
              />
            </div>
            ));
          })()}
          
          {/* Loading indicator when loading more */}
          {isLoadingMore && (
            <div className="flex-none w-[110px] md:w-[145px] flex items-center justify-center">
              <div className="h-40 md:h-52 w-full rounded bg-gray-800/50 flex flex-col items-center justify-center gap-2 text-gray-400">
                <FaSpinner className="animate-spin" size={24} />
                <span className="text-sm font-medium">Loading...</span>
              </div>
            </div>
          )}
          
          {/* End indicator when no more content */}
          {!hasMore && movies.length > 0 && (
            <div className="flex-none w-[110px] md:w-[145px] flex items-center justify-center">
              <div className="h-40 md:h-52 w-full rounded bg-gray-800/30 flex flex-col items-center justify-center gap-2 text-gray-500">
                <span className="text-sm font-medium">End of list</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfiniteScrollMovieRow;


