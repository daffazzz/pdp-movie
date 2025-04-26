"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';
import { MoviePlayer } from '@/app/components/MoviePlayer';
import PlayerNotification from '@/app/components/PlayerNotification';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fallback video URL in case the movie doesn't have one
const FALLBACK_VIDEO_URL = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

// Sample subtitle - using a reliable subtitle source
const SAMPLE_SUBTITLES = [
  { 
    language: 'English', 
    url: 'https://assets.webvtt.org/subtitles/sample.vtt', 
    label: 'English', 
    srclang: 'en', 
    default: true 
  }
];

// Create a separate component for the watch functionality
function WatchContent() {
  const router = useRouter();
  const params = useParams();
  const movieId = params?.id as string;
  const [movie, setMovie] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovieData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!movieId) {
          throw new Error('Movie ID is required');
        }
        
        // Fetch movie data from Supabase
        const { data: movie, error } = await supabase
          .from('movies')
          .select('*')
          .eq('id', movieId)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!movie) {
          throw new Error('Movie not found');
        }
        
        // Set movie data
        setMovie(movie);
      } catch (err: any) {
        console.error('Error fetching movie:', err);
        setError(err.message || 'An error occurred while fetching the movie');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMovieData();
  }, [movieId]);

  const handlePlayerError = (errorMsg: string) => {
    console.error('Player error:', errorMsg);
    setPlayerError(errorMsg);
  };

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(`/movie/${movieId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white p-4">
        <h1 className="text-xl font-bold mb-4">Error</h1>
        <p className="mb-6">{error}</p>
        <button 
          onClick={goBack}
          className="flex items-center gap-2 bg-red-600 text-white py-2 px-6 rounded-full hover:bg-red-700"
        >
          <FaArrowLeft />
          Back to Movie
        </button>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-black text-white p-4">
        <h1 className="text-xl font-bold mb-4">Movie Not Found</h1>
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 bg-red-600 text-white py-2 px-6 rounded-full hover:bg-red-700"
        >
          <FaArrowLeft />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="container mx-auto p-4 pt-12 md:pt-16 flex-grow">
        <div className="mb-3 mt-2 md:pl-2">
          <button 
            onClick={goBack}
            className="flex items-center gap-1 text-white hover:text-gray-300 text-sm"
          >
            <FaArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
        
        <div className="w-full mb-5">
          {playerError && (
            <div className="bg-red-600/20 p-4 rounded mb-4">
              <p className="text-white">
                Error playing video: {playerError}. Please try again later.
              </p>
            </div>
          )}
          
          <PlayerNotification />
          
          <MoviePlayer 
            movieId={movieId} 
            height="600px"
            autoPlay={true}
            onError={handlePlayerError}
          />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-white">{movie.title}</h1>
        
        <div className="text-white">
          <h2 className="text-xl font-bold mb-2">About</h2>
          <p className="text-gray-300 mb-6">{movie.overview || movie.description}</p>
          
          {movie.director && (
            <p className="text-gray-400 mb-1">
              <span className="font-semibold">Director:</span> {movie.director}
            </p>
          )}
          
          {movie.movie_cast && movie.movie_cast.length > 0 && (
            <p className="text-gray-400 mb-1">
              <span className="font-semibold">Cast:</span> {movie.movie_cast.join(', ')}
            </p>
          )}
          
          {movie.release_date && (
            <p className="text-gray-400 mb-1">
              <span className="font-semibold">Release Date:</span> {new Date(movie.release_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex justify-center items-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
} 