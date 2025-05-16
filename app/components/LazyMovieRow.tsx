"use client";

import { useRef, useState, useEffect } from 'react';
import MovieRow from './MovieRow';

interface LazyMovieRowProps {
  title: string;
  movies: any[];
  contentType?: 'movie' | 'tvshow' | 'tvseries';
  limit?: number;
  onDeleteHistory?: (id: string) => void;
}

const LazyMovieRow: React.FC<LazyMovieRowProps> = (props) => {
  const { title, movies, contentType, limit, onDeleteHistory } = props;
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Ketika komponen terlihat dalam viewport
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          // Berhenti mengobservasi setelah komponen terlihat
          if (rowRef.current) {
            observer.unobserve(rowRef.current);
          }
        }
      },
      {
        // Root adalah viewport
        root: null,
        // Margin di sekitar root (bisa negatif)
        rootMargin: '100px', // Preload sedikit sebelum terlihat
        // Berapa persen dari elemen harus terlihat
        threshold: 0.1,
      }
    );

    // Mulai mengobservasi elemen
    if (rowRef.current) {
      observer.observe(rowRef.current);
    }

    // Cleanup function
    return () => {
      if (rowRef.current) {
        observer.unobserve(rowRef.current);
      }
    };
  }, []);

  return (
    <div ref={rowRef}>
      {/* Placeholder ketika belum dirender */}
      {!isVisible && !hasBeenVisible && (
        <div className="space-y-0.5 md:space-y-1 py-3 w-full">
          <div className="flex items-center justify-between px-2 md:px-8">
            <h2 className="text-lg md:text-xl font-bold">{title}</h2>
          </div>
          <div className="px-2 md:px-8 py-6">
            <div className="h-[150px] bg-gray-800/30 animate-pulse rounded-md flex items-center justify-center">
              <div className="text-gray-600">Loading {title}...</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Render MovieRow hanya ketika komponen terlihat atau pernah terlihat */}
      {(isVisible || hasBeenVisible) && (
        <MovieRow 
          title={title} 
          movies={movies} 
          contentType={contentType} 
          limit={limit} 
          onDeleteHistory={onDeleteHistory}
        />
      )}
    </div>
  );
};

export default LazyMovieRow; 