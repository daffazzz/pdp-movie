"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaPlay, FaStar, FaClock, FaCalendarAlt, FaArrowLeft } from 'react-icons/fa';
import MovieRow from '@/app/components/MovieRow';
import { MoviePlayer } from '@/app/components/MoviePlayer';
import PlayerNotification from '@/app/components/PlayerNotification';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function MovieDetail() {
  const router = useRouter();
  const params = useParams();
  const tmdbId = params?.tmdb_id as string;
  const [movie, setMovie] = useState<any>(null);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);

  const handlePlayerError = (error: string) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Player error:', error);
      }
      setMessage({
        text: `Error playing video: ${error}`,
        type: 'error'
      });
      const timeoutId = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timeoutId);
    } catch (e) {
      // Silent fail
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchMovieDetails = async () => {
      if (!isMounted) return;
      setIsLoading(true);

      try {
        if (!TMDB_API_KEY) {
          throw new Error('TMDB API key is not configured.');
        }

        const movieUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,similar`;
        const response = await fetch(movieUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch movie details from TMDB.');
        }
        const data = await response.json();

        if (!isMounted) return;

        const director = data.credits?.crew?.find((person: any) => person.job === 'Director')?.name;
        const movie_cast = data.credits?.cast?.slice(0, 5).map((person: any) => person.name);

        const movieData = {
          id: data.id,
          title: data.title,
          description: data.overview,
          backdrop_url: `https://image.tmdb.org/t/p/original${data.backdrop_path}`,
          poster_url: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
          rating: data.vote_average,
          release_year: new Date(data.release_date).getFullYear(),
          duration: `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`,
          genre: data.genres?.map((g: any) => g.name) || [],
          director,
          movie_cast,
        };

        const transformedSimilarMovies = (data.similar?.results || []).map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          thumbnail_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
          rating: movie.vote_average || 0
        }));

        if (isMounted) {
          setMovie(movieData);
          setSimilarMovies(transformedSimilarMovies);
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

    if (tmdbId) {
      fetchMovieDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [tmdbId]);

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
    <div className="min-h-screen pt-20 bg-background">
      <div className="fixed inset-0 z-[-1]">
        <Image
          src={movie.backdrop_url || '/images/default-backdrop.jpg'}
          alt={movie.title}
          fill
          className="object-cover opacity-20"
          quality={100}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background to-background" />
      </div>

      <div className="container mx-auto px-4 md:px-16 pt-10 pb-20">
        {message && (
          <div className={`mb-6 p-4 rounded ${
            message.type === 'success' ? 'bg-green-600/80' :
            message.type === 'error' ? 'bg-red-600/80' : 'bg-blue-600/80'
          }`}>
            <p className="text-white">{message.text}</p>
          </div>
        )}

        {showVideoPlayer ? (
          <div className="mb-8">
            <button
              onClick={() => setShowVideoPlayer(false)}
              className="mb-4 bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-700 flex items-center gap-2"
            >
              <FaArrowLeft /> Back to Movie Details
            </button>

            <div className="flex justify-center mb-2">
              <div className="scale-90 md:scale-75">
                <PlayerNotification />
              </div>
            </div>

            <div className="max-w-2xl mx-auto w-full aspect-[16/9] bg-black rounded-lg overflow-hidden shadow-xl">
              <MoviePlayer
                tmdbId={tmdbId}
                height="100%"
                onError={handlePlayerError}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => {
                    setShowVideoPlayer(true);
                    try {
                      const historyKey = 'movie_history';
                      const now = new Date().toISOString();
                      const newEntry = {
                        id: movie.id,
                        title: movie.title,
                        thumbnail_url: movie.poster_url,
                        rating: movie.rating,
                        watched_at: now
                      };
                      let history = [];
                      if (typeof window !== 'undefined') {
                        const existing = localStorage.getItem(historyKey);
                        if (existing) {
                          history = JSON.parse(existing);
                          history = history.filter((item: any) => item.id !== movie.id);
                        }
                        history.unshift(newEntry);
                        if (history.length > 20) history = history.slice(0, 20);
                        localStorage.setItem(historyKey, JSON.stringify(history));
                      }
                    } catch (e) {
                      console.warn('Failed to save history to localStorage', e);
                    }
                  }}
                  className="flex items-center gap-2 bg-red-600 text-white py-2 px-6 rounded-full font-semibold hover:bg-red-700 transition"
                >
                  <FaPlay />
                  Watch Now
                </button>
              </div>

              <p className="text-lg mb-6 text-gray-200">{movie.description}</p>

              <div className="mb-6">
                <p className="text-gray-400"><span className="font-semibold">Director:</span> {movie.director || 'N/A'}</p>
                <p className="text-gray-400"><span className="font-semibold">Cast:</span> {movie.movie_cast?.join(', ') || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {similarMovies.length > 0 && !showVideoPlayer && (
          <div className="mt-16">
            <MovieRow title="More Like This" movies={similarMovies} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MovieDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pt-24 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    }>
      <MovieDetail />
    </Suspense>
  );
}