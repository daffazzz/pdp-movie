"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SearchResult } from "../../utils/search-utils";

// Import the MovieCard component dynamically
import dynamic from 'next/dynamic';
const MovieCard = dynamic(() => import('@/app/components/MovieCard'), { ssr: false });

// Create a separate component for the search functionality
function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use the enhanced search API endpoint
        const response = await fetch(`/api/enhanced-search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to perform search');
        }
        
        const data = await response.json();
        setResults(data.results || []);
      } catch (err: any) {
        console.error('Error performing search:', err);
        
        let errorMessage = 'Failed to search content';
        if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  if (loading && query) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          Searching for: <span className="text-red-500">{query}</span>
        </h1>
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">
        {query ? (
          <>
            Search results for: <span className="text-red-500">{query}</span>
          </>
        ) : (
          'Search Movies & TV Shows'
        )}
      </h1>

      {error && (
        <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {!query && !error && (
        <div className="text-center py-16">
          <p className="text-gray-400">Enter a search term in the search box above</p>
        </div>
      )}

      {query && results.length === 0 && !error && (
        <div className="text-center py-16">
          <p className="text-xl text-gray-300 mb-4">No results found for "{query}"</p>
          <p className="text-gray-400">Try searching for a different term</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {results.map((item) => (
              <LazyMovieCard 
                key={`${item.contentType}-${item.id}`} 
                item={item} 
              />
            ))}
          </div>
          <p className="text-gray-400 mt-8 text-center">
            Found {results.length} results for "{query}"
          </p>
        </>
      )}
    </div>
  );
}

// Lazy load MovieCard component
const LazyMovieCard = ({ item }: { item: SearchResult }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          if (cardRef.current) {
            observer.unobserve(cardRef.current);
          }
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div ref={cardRef}>
      {(isVisible || hasBeenVisible) ? (
        <MovieCard
          id={item.id}
          title={item.title}
          thumbnail_url={item.thumbnail_url}
          rating={item.rating}
          type={item.contentType}
          tmdb_id={item.tmdb_id}
        />
      ) : (
        <div className="aspect-[2/3] rounded bg-gray-800/50 animate-pulse"></div>
      )}
    </div>
  );
};

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Loading search...</h1>
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}