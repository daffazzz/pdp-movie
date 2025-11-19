"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from './MovieCard';
import { FaTimesCircle } from 'react-icons/fa';
import { createPortal } from 'react-dom';

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
  const [isClosing, setIsClosing] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastMovieElementRef = useRef<HTMLDivElement | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const ITEMS_PER_PAGE = 40;

  // Convert the Map to an Array for rendering
  const visibleMovies = Array.from(visibleMoviesMap.values());

  // Use React Portal to render outside normal DOM hierarchy
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Log total movies when component updates
  useEffect(() => {
    if (isOpen) {
      console.log(`MovieViewMore has ${movies.length} total movies available`);
    }
  }, [isOpen, movies.length]);

  // Reset state when the modal opens or movie list changes
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      console.log(`MovieViewMore opened with ${movies.length} movies`);

      // Optimize initial loading by directly processing more items
      const INITIAL_ITEMS = Math.min(20, movies.length); // Load fewer items initially for faster rendering

      // Create a Map of unique movies for the first batch
      const initialMoviesMap = new Map<string, Movie>();

      // Add the first INITIAL_ITEMS unique movies
      const initialBatch = movies.slice(0, INITIAL_ITEMS);
      initialBatch.forEach(movie => {
        if (!initialMoviesMap.has(movie.id)) {
          initialMoviesMap.set(movie.id, movie);
        }
      });

      console.log(`Initially loaded ${initialMoviesMap.size} unique movies`);

      setVisibleMoviesMap(initialMoviesMap);
      setPage(0);

      // Only set hasMore to false if we've shown all movies
      const hasMoreMovies = movies.length > INITIAL_ITEMS;
      setHasMore(hasMoreMovies);
      setIsLoading(false);

      // Disable scrolling on the body when modal is open
      document.body.style.overflow = 'hidden';
    }

    // Re-enable scrolling when modal closes
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, movies]);

  // Function to handle loading more movies when scrolling
  const loadMoreMovies = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Calculate the next batch of movies to load
    const startIndex = page === 0 ? 20 : page * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    console.log(`Loading movies from ${startIndex} to ${endIndex}. Total: ${movies.length}`);

    // Ensure we don't go beyond array bounds
    const newMovies = startIndex < movies.length ? movies.slice(startIndex, endIndex) : [];

    // Process immediately without timeout to improve performance
    if (newMovies.length > 0) {
      console.log(`Adding ${newMovies.length} new movies`);

      // Update our Map with new movies
      setVisibleMoviesMap(prevMap => {
        const updatedMap = new Map(prevMap);

        // Add all new movies that aren't already in the map
        let addedCount = 0;
        newMovies.forEach(movie => {
          if (!updatedMap.has(movie.id)) {
            updatedMap.set(movie.id, movie);
            addedCount++;
          }
        });

        console.log(`Actually added ${addedCount} new unique movies`);

        return updatedMap;
      });

      // Always increment the page
      setPage(prev => prev + 1);

      // Check if we've reached the end of all movies
      setHasMore(endIndex < movies.length);
    } else {
      setHasMore(false);
    }

    setIsLoading(false);
  }, [isLoading, hasMore, page, movies]);

  // Optimize movie rendering
  const memoizedVisibleMovies = useCallback(() => {
    return visibleMovies;
  }, [visibleMovies]);

  // Optimize scroll handler
  const optimizedHandleScroll = useCallback(() => {
    if (!modalContentRef.current || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = modalContentRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // If we're close to the bottom, load more movies
    if (distanceFromBottom < 300) {
      loadMoreMovies();
    }
  }, [isLoading, hasMore, loadMoreMovies]);

  // Handle scroll event for infinite scrolling
  useEffect(() => {
    const handleScroll = optimizedHandleScroll;

    const currentRef = modalContentRef.current;
    if (isOpen && currentRef) {
      console.log('Adding scroll event listener');
      currentRef.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isOpen, isLoading, hasMore, loadMoreMovies, optimizedHandleScroll]);

  // Setup intersection observer as backup for infinite scroll
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Skip if we're not visible or don't have more to load
    if (!isOpen || !hasMore) return;

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) {
        console.log('Intersection observer triggered: Last element is visible');
        if (!isLoading && hasMore) {
          loadMoreMovies();
        }
      }
    };

    observerRef.current = new IntersectionObserver(observerCallback, {
      root: modalContentRef.current,
      rootMargin: '300px',
      threshold: 0.1
    });

    if (lastMovieElementRef.current) {
      console.log('Setting up intersection observer on last movie element');
      observerRef.current.observe(lastMovieElementRef.current);
    } else {
      console.log('No last movie element to observe');
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, hasMore, isLoading, visibleMovies.length, loadMoreMovies]);

  // Close modal with animation
  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 300); // Match the animation duration
  };

  // Close modal when clicking outside the content
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // If not open, don't render anything
  if (!isOpen) return null;

  // Check to render a message if no movies are available
  const noMovies = !isLoading && visibleMovies.length === 0;

  // Manual loader trigger button - add for testing
  const triggerLoadMore = () => {
    if (isLoading || !hasMore) return;

    // Load multiple pages at once when manually triggered
    setIsLoading(true);

    const loadMultiplePages = () => {
      const startIndex = page === 0 ? 20 : page * ITEMS_PER_PAGE;
      // Load 3 pages worth of items at once when manually triggered
      const endIndex = startIndex + (ITEMS_PER_PAGE * 3);

      const newMovies = startIndex < movies.length ? movies.slice(startIndex, endIndex) : [];

      if (newMovies.length > 0) {
        // Update our Map with new movies
        setVisibleMoviesMap(prevMap => {
          const updatedMap = new Map(prevMap);

          // Add all new movies
          let addedCount = 0;
          newMovies.forEach(movie => {
            if (!updatedMap.has(movie.id)) {
              updatedMap.set(movie.id, movie);
              addedCount++;
            }
          });

          console.log(`Actually added ${addedCount} new unique movies through trigger`);

          return updatedMap;
        });

        // Increment the page accordingly
        setPage(Math.ceil(endIndex / ITEMS_PER_PAGE));

        // Check if we've reached the end
        setHasMore(endIndex < movies.length);
      } else {
        setHasMore(false);
      }

      setIsLoading(false);
    };

    // Execute immediately
    loadMultiplePages();
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center pt-8 pb-4 px-4 overflow-hidden modal-overlay
        ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      onClick={handleBackdropClick}
      style={{
        isolation: 'isolate',
        position: 'fixed',
        zIndex: 9999,
        transform: 'translateZ(0)'
      }}
    >
      <div
        className={`relative bg-[#1a1a1a]/95 w-full max-w-6xl h-[92vh] max-h-[1000px] mt-4 rounded-lg shadow-2xl overflow-hidden flex flex-col 
          border border-gray-700 shadow-[0_0_15px_rgba(255,0,0,0.2)]
          ${isClosing ? 'animate-zoomOut' : 'animate-zoomIn'}`}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-[#1a1a1a]/95 backdrop-blur-sm z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Close"
          >
            <FaTimesCircle size={24} />
          </button>
        </div>

        <div className="px-4 pt-2 pb-3 bg-gray-800/50 border-b border-gray-700">
          <p className="text-sm text-gray-300">
            Showing {visibleMovies.length} of {movies.length} items
          </p>
        </div>

        <div
          ref={modalContentRef}
          className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-[#1a1a1a]"
        >
          {visibleMovies.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {memoizedVisibleMovies().map((movie, index) => {
                // Determine if this is the last element to observe
                const isLastElement = index === visibleMovies.length - 1;

                return (
                  <div
                    key={movie.id}
                    ref={isLastElement ? lastMovieElementRef : null}
                    className="flex flex-col hover:scale-105 transform transition-transform duration-200"
                  >
                    <MovieCard
                      id={movie.id}
                      title={movie.title}
                      thumbnail_url={movie.thumbnail_url}
                      rating={movie.rating}
                      type={contentType === 'tvseries' ? 'tvshow' : contentType}
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

          {/* Manual Load More button */}
          {hasMore && !isLoading && visibleMovies.length > 0 && (
            <div className="flex justify-center py-6">
              <button
                onClick={triggerLoadMore}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-lg hover:shadow-red-600/20"
              >
                Load More ({movies.length - visibleMovies.length} remaining)
              </button>
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

  // Render using portal for proper stacking context
  return mounted && typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};

export default MovieViewMore; 