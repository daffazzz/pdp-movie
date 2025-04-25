"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from './MovieCard';
import { FaTimesCircle } from 'react-icons/fa';

interface Movie {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  tmdb_id?: number;
}

interface MovieViewMoreProps {
  title: string;
  movies: Movie[];
  isOpen: boolean;
  onClose: () => void;
  contentType?: 'movie' | 'tvshow' | 'tvseries';
}

const MovieViewMore: React.FC<MovieViewMoreProps> = ({ 
  title, 
  movies, 
  isOpen, 
  onClose, 
  contentType = 'movie' 
}) => {
  // Use a Map to manage movies with ID as key to prevent duplicates
  const [visibleMoviesMap, setVisibleMoviesMap] = useState<Map<string, Movie>>(new Map());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useRef<HTMLDivElement | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const ITEMS_PER_PAGE = 20;

  // Convert the Map to an Array for rendering
  const visibleMovies = Array.from(visibleMoviesMap.values());

  // Function to handle loading more movies when scrolling
  const loadMoreMovies = useCallback(() => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    // Calculate the next batch of movies to load
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newMovies = movies.slice(startIndex, endIndex);
    
    setTimeout(() => {
      if (newMovies.length > 0) {
        // Update our Map with new movies
        setVisibleMoviesMap(prevMap => {
          const updatedMap = new Map(prevMap);
          
          // Add only movies that aren't already in the map
          let anyNewAdded = false;
          newMovies.forEach(movie => {
            if (!updatedMap.has(movie.id)) {
              updatedMap.set(movie.id, movie);
              anyNewAdded = true;
            }
          });
          
          // Check if we need to increment the page or end loading
          if (anyNewAdded) {
            setPage(prev => prev + 1);
          } else if (endIndex < movies.length) {
            // If no new movies were added but there are more to try
            setPage(prev => prev + 1);
          } else {
            setHasMore(false);
          }
          
          return updatedMap;
        });
      } else {
        setHasMore(false);
      }
      
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore, page, movies]);

  // Reset state when the modal opens or movie list changes
  useEffect(() => {
    if (isOpen) {
      // Create a Map of unique movies
      const initialMoviesMap = new Map<string, Movie>();
      
      // Add only the first ITEMS_PER_PAGE unique movies
      let count = 0;
      for (const movie of movies) {
        if (count >= ITEMS_PER_PAGE) break;
        
        if (!initialMoviesMap.has(movie.id)) {
          initialMoviesMap.set(movie.id, movie);
          count++;
        }
      }
      
      setVisibleMoviesMap(initialMoviesMap);
      setPage(1);
      setHasMore(movies.length > initialMoviesMap.size);
      setIsLoading(false);
    }
  }, [isOpen, movies]);

  // Handle scroll event for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!modalContentRef.current || isLoading || !hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = modalContentRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // If we're close to the bottom (within 200px), load more movies
      if (distanceFromBottom < 200) {
        loadMoreMovies();
      }
    };
    
    const currentRef = modalContentRef.current;
    if (isOpen && currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isOpen, isLoading, hasMore, loadMoreMovies]);

  // Setup intersection observer as backup for infinite scroll
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Skip if we're not visible or don't have more to load
    if (!isOpen || !hasMore) return;

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && !isLoading && hasMore) {
        loadMoreMovies();
      }
    };

    observerRef.current = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    });

    if (lastMovieElementRef.current) {
      observerRef.current.observe(lastMovieElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, hasMore, isLoading, visibleMovies.length, loadMoreMovies]);

  // Close modal when clicking outside the content
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // If not open, don't render anything
  if (!isOpen) return null;

  // Check to render a message if no movies are available
  const noMovies = !isLoading && visibleMovies.length === 0;

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center pt-16 pb-8 px-4 overflow-hidden"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-gray-900/95 w-full max-w-6xl h-[85vh] max-h-[900px] mt-10 rounded-lg shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition"
            aria-label="Close"
          >
            <FaTimesCircle size={24} />
          </button>
        </div>
        
        <div 
          ref={modalContentRef}
          className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
        >
          {visibleMovies.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {visibleMovies.map((movie, index) => {
                // Determine if this is the last element to observe
                const isLastElement = index === visibleMovies.length - 1;
                
                return (
                  <div 
                    key={movie.id} 
                    ref={isLastElement ? lastMovieElementRef : null}
                    className="flex flex-col"
                  >
                    <MovieCard
                      id={movie.id}
                      title={movie.title}
                      thumbnail_url={movie.thumbnail_url}
                      rating={movie.rating}
                      type={contentType}
                      tmdb_id={movie.tmdb_id}
                    />
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-center py-6">
              <div className="w-10 h-10 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* End of list message */}
          {!hasMore && visibleMovies.length > 0 && (
            <p className="text-center text-gray-500 py-6">
              — End of list —
            </p>
          )}

          {/* No results message */}
          {noMovies && (
            <p className="text-center text-gray-400 py-16">
              No items available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieViewMore; 