"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import styles from './search.module.css';
import { SearchResult } from "../../utils/search-utils";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
        
        // Check content type before parsing JSON
        const contentTypeHeader = response.headers.get('content-type');
        if (!contentTypeHeader || !contentTypeHeader.includes('application/json')) {
          const text = await response.text();
          console.error('API returned non-JSON response:', text.substring(0, 500));
          throw new Error(`API returned non-JSON response. Status: ${response.status}`);
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to perform search');
        }
        
        const data = await response.json();
        setResults(data.results || []);
      } catch (err: any) {
        console.error('Error performing search:', err);
        
        // Provide a more descriptive error message
        let errorMessage = 'Failed to search content';
        if (err.message) {
          errorMessage = err.message;
        } else if (typeof err === 'object') {
          errorMessage = 'Database query error. Please try again.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  // Show loading spinner while fetching results
  if (loading && query) {
    return (
      <div className={`${styles.searchContainer} bg-gray-900`}>
        <h1 className={styles.searchHeading}>
          Searching for: <span className={styles.highlight}>{query}</span>
        </h1>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.searchContainer} bg-gray-900`}>
      <h1 className={styles.searchHeading}>
        {query ? (
          <>
            Search results for: <span className={styles.highlight}>{query}</span>
          </>
        ) : (
          'Search Movies & TV Shows'
        )}
      </h1>

      {error && (
        <div className={styles.errorContainer}>
          <p className="font-medium">Error: {error}</p>
          <p className="text-sm mt-2">Please try again or contact support if the problem persists.</p>
        </div>
      )}

      {!query && !error && (
        <div className={styles.emptyStateContainer}>
          <p className="text-gray-400 mb-4">Enter a search term in the search box above</p>
        </div>
      )}

      {query && results.length === 0 && !error && (
        <div className={styles.emptyStateContainer}>
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
        // Ketika komponen terlihat dalam viewport
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          // Berhenti mengobservasi setelah komponen terlihat
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
        // Placeholder saat komponen belum terlihat
        <div className="aspect-[2/3] rounded bg-gray-800/50 animate-pulse"></div>
      )}
    </div>
  );
};

// Main component with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className={`${styles.searchContainer} bg-gray-900`}>
        <h1 className={styles.searchHeading}>Loading search...</h1>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
} 