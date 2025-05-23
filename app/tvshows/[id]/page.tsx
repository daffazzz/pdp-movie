"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { FaStar, FaCalendarAlt, FaArrowLeft, FaPlay } from 'react-icons/fa';
import EpisodePlayer from '../../components/EpisodePlayer';
import PlayerNotification from '../../components/PlayerNotification';
import { useAuth } from '../../../contexts/AuthContext';

// Interface untuk tipe data series
interface Series {
  id: string;
  tmdb_id: number;
  title: string;
  description: string;
  poster_url?: string;
  backdrop_url?: string;
  thumbnail_url?: string;
  rating: number;
  release_year?: number;
  genre?: string[];
  created_at: string;
}

// Interface untuk episode
interface Episode {
  id: string;
  series_id: string;
  season: number;
  episode: number;
  title?: string;
  description?: string;
  poster_url?: string;
  embed_url?: string;
  video_url?: string;
  air_date?: string;
  rating?: number;
}

// Create a separate component that uses the hooks
function SeriesDetail() {
  const params = useParams();
  const seriesId = params?.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [season, setSeason] = useState<number>(1);
  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let seriesData;
        let seriesError;

        if (!seriesId) {
          console.error('No ID provided in URL params');
          setError('No series ID provided.');
          setLoading(false);
          return;
        }

        // Check if Supabase client is available
        if (!supabase) {
          console.error('Supabase client is not initialized');
          setError('Database connection is not available. Please check your internet connection.');
          setLoading(false);
          return;
        }

        console.log('Fetching TV series with ID:', seriesId);
        
        // First try to fetch by tmdb_id if id is numeric
        if (!isNaN(Number(seriesId))) {
          console.log('Trying to fetch by TMDB ID:', Number(seriesId));
          ({ data: seriesData, error: seriesError } = await (supabase as NonNullable<typeof supabase>)
            .from('series')
            .select('*')
            .eq('tmdb_id', Number(seriesId))
            .single());
            
          if (seriesError) {
            console.error('Error fetching by TMDB ID:', seriesError.message);
          } else if (!seriesData) {
            console.log('No series found with TMDB ID:', Number(seriesId));
          } else {
            console.log('Found series by TMDB ID:', seriesData.title);
          }
        }
        
        // If that fails or id is not numeric, try by UUID
        if (!seriesData && (!isNaN(Number(seriesId)) || seriesId.includes('-'))) {
          console.log('Trying to fetch by UUID:', seriesId);
          ({ data: seriesData, error: seriesError } = await (supabase as NonNullable<typeof supabase>)
            .from('series')
            .select('*')
            .eq('id', seriesId)
            .single());
            
          if (seriesError) {
            console.error('Error fetching by UUID:', seriesError.message);
          } else if (!seriesData) {
            console.log('No series found with UUID:', seriesId);
          } else {
            console.log('Found series by UUID:', seriesData.title);
          }
        }
        
        if (seriesError || !seriesData) {
          console.error('Failed to find series with ID:', seriesId);
          setError('Failed to load series information. Please try again later.');
          setLoading(false);
          return;
        }
        
        setSeries(seriesData);

        // Fetch episodes using the uuid seriesData.id
        if (seriesData?.id) {
          // Check if Supabase client is still available
          if (!supabase) {
            console.error('Supabase client is not initialized');
            setError('Database connection is not available. Please check your internet connection.');
            setLoading(false);
            return;
          }

          const { data: epData, error: epError } = await (supabase as NonNullable<typeof supabase>)
            .from('episodes')
            .select('*')
            .eq('series_id', seriesData.id)
            .order('season', { ascending: true })
            .order('episode', { ascending: true });
          
          if (epError) {
            console.error('Error fetching episodes:', epError);
            setError('Failed to load episode information.');
          } else {
            setEpisodes(epData || []);
            // Set default season/episode hanya jika query param tidak ada
            const seasonParam = searchParams?.get('season');
            const episodeParam = searchParams?.get('episode');
            if ((!seasonParam || isNaN(Number(seasonParam))) && epData && epData.length > 0) {
              // Find the first season
              const firstSeason = Math.min(...epData.map(e => e.season));
              setSeason(firstSeason);
              // Find the first episode of that season
              const firstEpisodeOfSeason = epData
                .filter(e => e.season === firstSeason)
                .sort((a, b) => a.episode - b.episode)[0];
              if (firstEpisodeOfSeason) {
                setEpisodeNum(firstEpisodeOfSeason.episode);
              }
            }
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (seriesId) {
      fetchData();
    }
  }, [seriesId, searchParams]);

  // Set state awal season/episode dari query param jika ada
  useEffect(() => {
    if (!searchParams) return;
    const seasonParam = searchParams.get('season');
    const episodeParam = searchParams.get('episode');
    if (seasonParam && !isNaN(Number(seasonParam))) {
      setSeason(Number(seasonParam));
    }
    if (episodeParam && !isNaN(Number(episodeParam))) {
      setEpisodeNum(Number(episodeParam));
    }
  }, [seriesId, searchParams]);

  // Helper to go back
  const goBack = () => {
    router.back();
  };

  // Get unique seasons sorted
  const seasons = Array.from(new Set(episodes.map(e => e.season))).sort((a, b) => a - b);
  
  // Get episodes in the current season
  const epsInSeason = episodes.filter(e => e.season === season);
  
  // Get current episode
  const currentEpisode = episodes.find(e => e.season === season && e.episode === episodeNum);

  // Log embed URL for debugging
  useEffect(() => {
    if (currentEpisode) {
      console.log("Current Episode URL:", currentEpisode.embed_url || currentEpisode.video_url);
      
      // Fix for preventing loading of sbx.js from vidsrc.xyz domain
      const fixVidsrcScripts = () => {
        // Add event listener to intercept network requests
        window.addEventListener('error', function(e) {
          // Check if the error is related to vidsrc.xyz
          if (e.filename && e.filename.includes('vidsrc.xyz')) {
            console.warn('Blocked loading resource from deprecated vidsrc.xyz domain:', e.filename);
            e.preventDefault(); // Prevent the error from showing in console
            return true;
          }
          return false;
        }, true);
      };
      
      // Execute the fix
      fixVidsrcScripts();
    }
  }, [currentEpisode]);

  // Tambahkan ke localStorage history saat episode player muncul
  useEffect(() => {
    if (!series || !series.id) return;
    try {
      const historyKey = 'movie_history';
      const now = new Date().toISOString();
      const newEntry = {
        id: series.id,
        title: series.title,
        thumbnail_url: series.poster_url || series.thumbnail_url,
        rating: series.rating,
        watched_at: now,
        last_season: season,
        last_episode: episodeNum
      };
      let history = [];
      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(historyKey);
        if (existing) {
          history = JSON.parse(existing);
          history = history.filter((item: any) => item.id !== series.id);
        }
        history.unshift(newEntry);
        if (history.length > 20) history = history.slice(0, 20);
        localStorage.setItem(historyKey, JSON.stringify(history));
      }
    } catch (e) {
      console.warn('Gagal menyimpan history ke localStorage', e);
    }
  }, [series && series.id, episodeNum, season]);

  // If loading or error, show appropriate message
  if (loading) {
    return (
      <div className="pt-24 px-4 md:px-16 min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="pt-24 px-4 md:px-16 min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error || 'Series not found'}</p>
          <button 
            onClick={goBack} 
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Banner with backdrop image */}
      <div 
        className="relative z-0 w-full h-[40vh] md:h-[60vh] bg-cover bg-center bg-no-repeat" 
        style={{
          backgroundImage: series.backdrop_url 
            ? `linear-gradient(to bottom, rgba(17, 24, 39, 0.6), rgba(17, 24, 39, 0.9)), url(${series.backdrop_url})` 
            : 'none',
          backgroundColor: 'rgb(17, 24, 39)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
      </div>

      {/* Content section */}
      <div className="relative -mt-20 px-4 md:px-16">
        <div className="max-w-6xl mx-auto">
          {/* === PLAYER & NAVIGASI EPISODE DI PALING ATAS === */}
          {episodes.length > 0 && currentEpisode && (
            <div className="mb-4 mt-[-280px] md:mt-[-340px] -mx-4 md:mx-0 px-4 md:px-0 z-[30] relative">
              <div className="flex justify-center mb-2">
                <div className="scale-90 md:scale-75">
                  <PlayerNotification />
                </div>
              </div>
              <div className="max-w-4xl mx-auto w-full">
                <div className="aspect-[16/9] bg-black rounded-lg overflow-hidden shadow-xl w-full">
                  <EpisodePlayer 
                    seriesId={series.id}
                    season={season}
                    episode={episodeNum}
                    height="100%"
                    onError={(errorMsg) => console.error('Episode player error:', errorMsg)}
                  />
                </div>
                {/* Episode Navigation Buttons di bawah player */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 gap-4">
                  <button
                    onClick={() => {
                      const prevEp = epsInSeason.find(ep => ep.episode === episodeNum - 1);
                      if (prevEp) {
                        setEpisodeNum(prevEp.episode);
                      } else {
                        // Jika tidak ada episode sebelumnya di season ini, cek season sebelumnya
                        const prevSeasonIndex = seasons.indexOf(season) - 1;
                        if (prevSeasonIndex >= 0) {
                          const prevSeason = seasons[prevSeasonIndex];
                          const prevSeasonEps = episodes.filter(e => e.season === prevSeason);
                          if (prevSeasonEps.length > 0) {
                            setSeason(prevSeason);
                            setEpisodeNum(prevSeasonEps[prevSeasonEps.length - 1].episode);
                          }
                        }
                      }
                    }}
                    disabled={!epsInSeason.find(ep => ep.episode === episodeNum - 1) && seasons.indexOf(season) === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-700 text-white py-3 sm:py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed max-w-xs"
                    style={{ minWidth: '120px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Previous Episode
                  </button>
                  <button
                    onClick={() => {
                      const nextEp = epsInSeason.find(ep => ep.episode === episodeNum + 1);
                      if (nextEp) {
                        setEpisodeNum(nextEp.episode);
                      } else {
                        // Jika tidak ada episode selanjutnya di season ini, cek season berikutnya
                        const nextSeasonIndex = seasons.indexOf(season) + 1;
                        if (nextSeasonIndex < seasons.length) {
                          const nextSeason = seasons[nextSeasonIndex];
                          const nextSeasonEps = episodes.filter(e => e.season === nextSeason);
                          if (nextSeasonEps.length > 0) {
                            setSeason(nextSeason);
                            setEpisodeNum(nextSeasonEps[0].episode);
                          }
                        }
                      }
                    }}
                    disabled={!epsInSeason.find(ep => ep.episode === episodeNum + 1) && seasons.indexOf(season) === seasons.length - 1}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-700 text-white py-3 sm:py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed max-w-xs"
                    style={{ minWidth: '120px' }}
                  >
                    Next Episode
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* === PILIHAN SEASON & EPISODE DI BAWAH PLAYER === */}
          {episodes.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg mb-6 max-w-4xl mx-auto">
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-grow">
                  <label className="block text-gray-300 mb-1">Season</label>
                  <select
                    value={season}
                    onChange={e => setSeason(+e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                  >
                    {seasons.map(s => (
                      <option key={s} value={s}>Season {s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-grow">
                  <label className="block text-gray-300 mb-1">Episode</label>
                  <select
                    value={episodeNum}
                    onChange={e => setEpisodeNum(+e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                  >
                    {epsInSeason.map(ep => (
                      <option key={ep.id} value={ep.episode}>
                        {ep.title ? `E${ep.episode}: ${ep.title}` : `Episode ${ep.episode}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {currentEpisode?.title && (
                <h3 className="text-xl font-semibold text-white mb-2">
                  S{season} E{episodeNum}: {currentEpisode.title}
                </h3>
              )}
              {currentEpisode?.description && (
                <p className="text-gray-400 mb-4">{currentEpisode.description}</p>
              )}
            </div>
          )}
          <div className="flex gap-6 flex-col md:flex-row">
            {/* Poster */}
            <div className="w-48 h-72 md:w-64 md:h-96 flex-shrink-0 rounded-lg overflow-hidden shadow-lg">
              {series.poster_url ? (
                <img 
                  src={series.poster_url} 
                  alt={series.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-600">{series.title[0]}</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-grow">
              <button 
                onClick={goBack}
                className="mb-4 text-gray-400 hover:text-white flex items-center gap-2"
              >
                <FaArrowLeft /> Back
              </button>

              <h1 className="text-3xl font-bold text-white mb-2">{series.title}</h1>
              
              <div className="flex items-center gap-4 text-gray-300 mb-4">
                {series.rating > 0 && (
                  <div className="flex items-center">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span>{series.rating.toFixed(1)}</span>
                  </div>
                )}
                {series.release_year && (
                  <div className="flex items-center">
                    <FaCalendarAlt className="mr-1" />
                    <span>{series.release_year}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {toastMessage && (
                <div className="bg-green-600 text-white p-2 rounded mb-4 inline-block">
                  {toastMessage}
                </div>
              )}
              <div className="flex gap-4 mb-6">
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
                      .from('user_series')
                      .insert({ user_id: user.id, series_id: series.id });
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

              {/* Deskripsi series di bawah player */}
              {series.description && (
                <p className="text-gray-300 mb-6">{series.description}</p>
              )}
            </div>
          </div>

          {/* Episodes List */}
          {epsInSeason.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">Season {season} Episodes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {epsInSeason.map(ep => (
                  <div 
                    key={ep.id} 
                    className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition ${ep.episode === episodeNum ? 'ring-2 ring-red-500' : 'hover:bg-gray-750'}`}
                    onClick={() => setEpisodeNum(ep.episode)}
                  >
                    <div className="relative h-32 bg-gray-700">
                      {ep.poster_url ? (
                        <img 
                          src={ep.poster_url} 
                          alt={`Season ${season} Episode ${ep.episode}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-600">S{season}:E{ep.episode}</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent py-2 px-3">
                        <div className="text-white font-medium">Episode {ep.episode}</div>
                      </div>
                    </div>
                    <div className="p-3">
                      {ep.title && (
                        <h3 className="font-medium text-white truncate">{ep.title}</h3>
                      )}
                      {ep.air_date && (
                        <div className="text-xs text-gray-400 mt-1">{ep.air_date}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function SeriesDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    }>
      <SeriesDetail />
    </Suspense>
  );
} 