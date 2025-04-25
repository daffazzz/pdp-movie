"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaPlay, FaStar, FaClock, FaCalendarAlt } from 'react-icons/fa';
import MovieRow from '@/app/components/MovieRow';
import { MoviePlayer } from '@/app/components/MoviePlayer';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

// Mock data (to be replaced with actual data from Supabase)
const mockMovieDetails = {
  id: 'featured1',
  title: 'The Matrix Resurrections',
  description: 'Return to a world of two realities: one, everyday life; the other, what lies behind it. To find out if his reality is a construct, to truly know himself, Mr. Anderson will have to follow the white rabbit once more.',
  backdropPath: 'https://image.tmdb.org/t/p/original/8c4a8kE7PizaGQQnditMmI1xbRp.jpg',
  posterPath: 'https://image.tmdb.org/t/p/w500/8c4a8kE7PizaGQQnditMmI1xbRp.jpg',
  rating: 4.5,
  releaseYear: 2021,
  duration: '2h 28m',
  genres: ['Action', 'Sci-Fi', 'Adventure'],
  director: 'Lana Wachowski',
  movie_cast: ['Keanu Reeves', 'Carrie-Anne Moss', 'Yahya Abdul-Mateen II', 'Jessica Henwick'],
  videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
};

// Mock data for similar movies
const mockSimilarMovies = [
  {
    id: 'scifi1',
    title: 'Blade Runner 2049',
    thumbnail: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    rating: 4.8
  },
  {
    id: 'scifi2',
    title: 'Arrival',
    thumbnail: 'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    rating: 4.7
  },
  {
    id: 'scifi3',
    title: 'Interstellar',
    thumbnail: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    rating: 4.9
  },
  {
    id: 'scifi4',
    title: 'The Martian',
    thumbnail: 'https://image.tmdb.org/t/p/w500/5BHuvQ6p9kfc091Z8RiFNhCwL4b.jpg',
    rating: 4.6
  },
  {
    id: 'scifi5',
    title: 'Ad Astra',
    thumbnail: 'https://image.tmdb.org/t/p/w500/xBHvZcjRiWyobQ9kxBhO6B2dtRI.jpg',
    rating: 4.2
  }
];

export default function MovieDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState<any>(null);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePlayerError = (error: string) => {
    try {
      // Use safer logging
      if (process.env.NODE_ENV !== 'production') {
        console.error('Player error:', error);
      }
      
      setPlayerError(error);
      setMessage({
        text: `Error playing video: ${error}`,
        type: 'error'
      });
      
      // Clear error message after 5 seconds
      const timeoutId = setTimeout(() => {
        setMessage(null);
      }, 5000);
      
      // Clean up timeout on unmount
      return () => clearTimeout(timeoutId);
    } catch (e) {
      // Silent fail to prevent debugger pause
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchMovieDetails = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      
      try {
        // Check if Supabase client is available
        if (!supabase) {
          throw new Error('Supabase client is not initialized. Check your environment variables.');
        }
        
        // Fetch movie details
        const { data: movieData, error: movieError } = await supabase
          .from('movies')
          .select('*, tmdb_id') // Make sure to explicitly include tmdb_id
          .eq('id', id)
          .single();
        
        if (!isMounted) return;
        if (movieError) throw movieError;
        
        if (movieData) {
          // Safely check for external_ids
          let externalIds = null;
          try {
            if (typeof movieData.external_ids === 'string') {
              externalIds = JSON.parse(movieData.external_ids);
            } else {
              externalIds = movieData.external_ids;
            }
          } catch (e) {
            // If parsing fails, just continue with null
            externalIds = null;
          }
          
          // Case 1: Check if movie has external_ids JSONB with TMDB or IMDB
          const hasExternalIds = externalIds && 
            (externalIds.imdb_id || externalIds.tmdb_id);
          
          // Case 2: Check if movie has direct tmdb_id column
          const hasTmdbId = movieData.tmdb_id !== null && movieData.tmdb_id !== undefined;
          
          // Check if there's already a record in movie_sources
          if (!supabase) {
            throw new Error('Supabase client is not initialized.');
          }
          
          const { data: sourceData } = await supabase
            .from('movie_sources')
            .select('id')
            .eq('movie_id', id)
            .limit(1);
          
          if (!isMounted) return;
          
          const hasStoredSources = sourceData && sourceData.length > 0;
          
          // Set has_sources flag based on any of the conditions
          if (hasExternalIds || hasTmdbId || hasStoredSources || movieData.has_sources) {
            movieData.has_sources = true;
            
            // If movie has tmdb_id but doesn't have it in external_ids, add it
            if (hasTmdbId && externalIds && !externalIds.tmdb_id) {
              try {
                // Create or update external_ids
                const updatedExternalIds = externalIds || {};
                updatedExternalIds.tmdb_id = movieData.tmdb_id;
                
                // Make sure supabase is initialized
                if (supabase) {
                  // Update the movie record without awaiting to avoid blocking UI
                  supabase
                    .from('movies')
                    .update({ 
                      external_ids: updatedExternalIds,
                      has_sources: true
                    })
                    .eq('id', id)
                    .then(() => {
                      if (process.env.NODE_ENV !== 'production') {
                        console.log(`Updated external_ids for movie ${movieData.title}`);
                      }
                    })
                    .then(null, () => {
                      // Silently fail - this isn't critical for UI
                    });
                }
              } catch (e) {
                // Silent fail to prevent breaking the UI
              }
            }
          }
          
          // Fetch similar movies based on the genre
          const primaryGenre = movieData.genre && movieData.genre.length > 0 
            ? movieData.genre[0] 
            : null;
          
          // Make sure supabase is initialized
          if (!supabase) {
            throw new Error('Supabase client is not initialized.');
          }
          
          const { data: similarMoviesData, error: similarError } = await supabase
            .from('movies')
            .select('id, title, poster_url, rating')
            .neq('id', id)
            .contains('genre', primaryGenre ? [primaryGenre] : [])
            .limit(10);
          
          if (!isMounted) return;
          if (similarError) throw similarError;
          
          // Transform similar movies data to the expected format
          const transformedSimilarMovies = (similarMoviesData || []).map(movie => ({
            id: movie.id,
            title: movie.title,
            thumbnail_url: movie.poster_url,
            rating: movie.rating || 0
          }));
          
          if (isMounted) {
            setMovie(movieData);
            setSimilarMovies(transformedSimilarMovies);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error fetching movie details:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    if (id) {
      fetchMovieDetails();
    }
    
    // Cleanup function to prevent memory leaks and updates after unmount
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Movie not found</h1>
          <button 
            onClick={() => router.push('/')}
            className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gray-900">
      {/* Background image */}
      <div className="fixed inset-0 z-[-1]">
        <Image
          src={movie.backdrop_url || movie.backdrop_path || '/images/default-backdrop.jpg'}
          alt={movie.title}
          fill
          className="object-cover opacity-20"
          quality={100}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900 to-gray-900" />
      </div>

      <div className="container mx-auto px-4 md:px-16 pt-10 pb-20">
        {/* Message alert */}
        {message && (
          <div className={`mb-6 p-4 rounded ${
            message.type === 'success' ? 'bg-green-600/80' : 
            message.type === 'error' ? 'bg-red-600/80' : 'bg-blue-600/80'
          }`}>
            <p className="text-white">{message.text}</p>
          </div>
        )}
        
        {/* Video Player or Movie Details */}
        {showVideoPlayer ? (
          <div className="mb-8">
            <button 
              onClick={() => setShowVideoPlayer(false)}
              className="mb-4 bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-700"
            >
              ← Back to Movie Details
            </button>
            
            {playerError ? (
              <div className="bg-red-600/20 p-4 rounded mb-4">
                <p className="text-white">
                  Error playing video: {playerError}. Please try again later.
                </p>
              </div>
            ) : null}
            
            <MoviePlayer 
              movieId={id as string} 
              height="600px" 
              onError={handlePlayerError}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Movie Poster */}
            <div className="md:col-span-1">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-2xl">
                <Image
                  src={movie.poster_url || '/images/default-poster.jpg'}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Movie Details */}
            <div className="md:col-span-2">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">{movie.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-300">
                <div className="flex items-center">
                  <FaStar className="text-yellow-400 mr-1" />
                  <span>{(movie.rating || 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center">
                  <FaCalendarAlt className="mr-1" />
                  <span>{movie.release_year}</span>
                </div>
                <div className="flex items-center">
                  <FaClock className="mr-1" />
                  <span>{movie.duration || 'N/A'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(movie.genre || []).map((genre: string) => (
                    <span key={genre} className="bg-gray-800 px-2 py-1 rounded text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-lg mb-6 text-gray-200">{movie.description}</p>

              <div className="mb-6">
                <p className="text-gray-400"><span className="font-semibold">Director:</span> {movie.director || 'N/A'}</p>
                <p className="text-gray-400"><span className="font-semibold">Cast:</span> {movie.movie_cast?.join(', ') || 'N/A'}</p>
              </div>

              {toastMessage && (
                <div className="bg-green-600 text-white p-2 rounded mb-4 inline-block">
                  {toastMessage}
                </div>
              )}
              <div className="flex gap-4 mb-6">
                {movie.has_sources ? (
                  <button
                    onClick={() => setShowVideoPlayer(true)}
                    className="flex items-center gap-2 bg-red-600 text-white py-2 px-6 rounded-full font-semibold hover:bg-red-700 transition"
                  >
                    <FaPlay />
                    Watch Now
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex items-center gap-2 bg-gray-600 text-white py-2 px-6 rounded-full font-semibold cursor-not-allowed"
                  >
                    <FaPlay />
                    No VidSrc ID Available
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!user) { router.push('/login'); return; }
                    setAdding(true);
                    
                    // Check if Supabase client is available
                    if (!supabase) {
                      setToastMessage('Error: Database connection not available');
                      setAdding(false);
                      setTimeout(() => setToastMessage(null), 3000);
                      return;
                    }
                    
                    const { error } = await supabase
                      .from('user_movies')
                      .insert({ user_id: user.id, movie_id: movie.id });
                    if (error) {
                      setToastMessage('Gagal menambahkan ke My List');
                    } else {
                      setToastMessage('Berhasil ditambahkan ke My List');
                    }
                    setAdding(false);
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  disabled={adding}
                  className="flex items-center gap-2 bg-yellow-500 text-black py-2 px-6 rounded-full font-semibold hover:bg-yellow-600 transition"
                >
                  <FaStar />
                  {adding ? 'Adding...' : 'Add to My List'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Similar Movies Section */}
        {similarMovies.length > 0 && !showVideoPlayer && (
          <div className="mt-16">
            <MovieRow title="More Like This" movies={similarMovies} />
          </div>
        )}
      </div>
    </div>
  );
} 