"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import styles from './search.module.css';

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
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchMovies = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        let movieResults: any[] = [];

        // First try: Using the filter method on title
        try {
          const { data, error } = await supabase
            .from('movies')
            .select('*')
            .filter('title', 'ilike', `%${query}%`)
            .order('title');

          if (!error && data && data.length > 0) {
            movieResults = data;
          }
        } catch (err) {
          console.error('Title search error:', err);
        }

        // Second try: Using filter on overview if no results yet
        if (movieResults.length === 0) {
          try {
            const { data, error } = await supabase
              .from('movies')
              .select('*')
              .filter('overview', 'ilike', `%${query}%`)
              .order('title');
            
            if (!error && data && data.length > 0) {
              movieResults = data;
            }
          } catch (err) {
            console.error('Overview search error:', err);
          }
        }

        // Third try: Simple RPC call if available
        if (movieResults.length === 0) {
          try {
            // This assumes you have a search_movies function in your Supabase database
            // If not, this will fail silently
            const { data, error } = await supabase
              .rpc('search_movies', { search_query: query });
            
            if (!error && data) {
              movieResults = data;
            }
          } catch (err) {
            // Ignore RPC errors - this is just a fallback
            console.error('RPC search error (expected if function not defined):', err);
          }
        }

        setResults(movieResults);
      } catch (err: any) {
        console.error('Error searching movies:', err);
        
        // Provide a more descriptive error message
        let errorMessage = 'Failed to search movies';
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

    searchMovies();
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
          'Search Movies'
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {results.map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              thumbnail_url={movie.thumbnail_url || '/images/placeholder.jpg'}
              rating={movie.rating || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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