"use client";

import { createPortal } from 'react-dom';

import React, { useEffect, useState, useRef } from 'react';
import MovieCard from './MovieCard';
import { FaTimes } from 'react-icons/fa';

interface ViewMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialMovies: any[];
  fetchMore: (page: number) => Promise<any[]>;
  contentType: 'movie' | 'tvshow';
}

const ViewMoreModal: React.FC<ViewMoreModalProps> = ({ isOpen, onClose, title, initialMovies, fetchMore, contentType }) => {
  const [movies, setMovies] = useState(initialMovies);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setMovies(initialMovies);
    setPage(2);
    setHasMore(true);
  }, [initialMovies]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleScroll = () => {
    if (modalContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = modalContentRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 5 && hasMore && !isLoading) {
        loadMore();
      }
    }
  };

  const loadMore = async () => {
    setIsLoading(true);
    const newMovies = await fetchMore(page);
    if (newMovies.length > 0) {
      const existingIds = new Set(movies.map(m => m.id));
      const uniqueNewMovies = newMovies.filter(m => !existingIds.has(m.id));
      setMovies(prev => [...prev, ...uniqueNewMovies]);
      setPage(prev => prev + 1);
    } else {
      setHasMore(false);
    }
    setIsLoading(false);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col mt-8 mx-4">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes size={20} />
          </button>
        </div>
        <div ref={modalContentRef} onScroll={handleScroll} className="p-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map(movie => (
              <MovieCard key={movie.id} {...movie} type={contentType} />
            ))}
          </div>
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="w-8 h-8 border-t-2 border-red-600 border-solid rounded-full animate-spin"></div>
            </div>
          )}
          {!hasMore && (
            <div className="text-center py-8 text-gray-500">
              <p>No more results.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewMoreModal;