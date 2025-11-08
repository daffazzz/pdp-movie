"use client";

import { useRef, useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaEye } from 'react-icons/fa';
import MovieCard from './MovieCard';
import { Fragment } from 'react';
import ViewMoreModal from './ViewMoreModal';

interface Movie {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  tmdb_id?: number;
  type?: string;
}

interface MovieRowProps {
  title: string;
  movies: Movie[];
  contentType?: 'movie' | 'tvshow';
  limit?: number;
  fetchMore?: (page: number) => Promise<any[]>;
}

const MovieRow: React.FC<MovieRowProps> = ({ 
  title, 
  movies, 
  contentType = 'movie',
  limit = 20,
  fetchMore
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);
  const [isViewMoreOpen, setIsViewMoreOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const displayedMovies = movies.slice(0, limit);
  const hasMoreToShow = movies.length > limit || !!fetchMore;

  const checkScrollPosition = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.85 : scrollLeft + clientWidth * 0.85;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
      setTimeout(checkScrollPosition, 300);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollPosition();
    }, 100);
    
    const handleScroll = () => checkScrollPosition();
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
  }, [displayedMovies.length]);

  if (!movies || movies.length === 0) return null;

  return (
    <>
      <div className="space-y-0.5 md:space-y-1 py-3 w-full">
        <div className="flex items-center justify-between px-2 md:px-8">
          <h2 className="text-lg md:text-xl font-bold">{title}</h2>
          {hasMoreToShow && (
            <button 
              onClick={() => setIsViewMoreOpen(true)}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition"
            >
              <span>Watch More</span>
              <FaEye size={14} />
            </button>
          )}
        </div>
        
        <div className="group relative">
          <button 
            className={`hidden md:flex absolute left-2 top-1/2 transform -translate-y-1/2 z-40 h-10 w-10 cursor-pointer bg-black hover:shadow-lg rounded-full items-center justify-center transition-all duration-200 ${
              canScrollLeft ? 'opacity-90 hover:opacity-100' : 'opacity-30'
            }`}
            onClick={() => handleClick('left')}
            disabled={!canScrollLeft}
          >
            <FaChevronLeft className="text-white" size={18} />
          </button>

          <button 
            className={`hidden md:flex absolute right-2 top-1/2 transform -translate-y-1/2 z-40 h-10 w-10 cursor-pointer bg-black hover:shadow-lg rounded-full items-center justify-center transition-all duration-200 ${
              canScrollRight ? 'opacity-90 hover:opacity-100' : 'opacity-30'
            }`}
            onClick={() => handleClick('right')}
            disabled={!canScrollRight}
          >
            <FaChevronRight className="text-white" size={18} />
          </button>

          <div 
            ref={rowRef}
            className="flex items-center space-x-2 overflow-x-scroll scrollbar-hide px-2 md:px-8 py-2 no-scrollbar"
          >
            {displayedMovies.map((movie, index) => (
              <Fragment key={movie.id}>
                <div className="flex-none w-[110px] md:w-[145px]">
                  <MovieCard {...movie} type={contentType} />
                </div>
                {/* Iklan banner dihapus: tidak lagi menyisipkan AdCard/AdBox */}
              </Fragment>
            ))}
            
            {hasMoreToShow && (
              <div className="flex-none w-[110px] md:w-[145px] flex items-center justify-center">
                <button
                  onClick={() => setIsViewMoreOpen(true)}
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

      {fetchMore && (
        <ViewMoreModal
          title={title}
          initialMovies={movies}
          isOpen={isViewMoreOpen}
          onClose={() => setIsViewMoreOpen(false)}
          contentType={contentType}
          fetchMore={fetchMore}
        />
      )}
    </>
  );
};

export default MovieRow;
