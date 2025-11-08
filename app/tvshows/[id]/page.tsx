"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FaStar, FaCalendarAlt, FaArrowLeft } from 'react-icons/fa';
import EpisodePlayer from '../../components/EpisodePlayer';
import NativeAd from '../../components/NativeAd';
import BannerAd from '../../components/BannerAd';
import PlayerNotification from '../../components/PlayerNotification';
import Script from 'next/script';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const fetchFromTMDB = async (endpoint: string, params: string = '') => {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${TMDB_BASE_URL}/${endpoint}${separator}api_key=${TMDB_API_KEY}&language=en-US&${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from TMDB: ${endpoint}`);
    }
    return response.json();
  };

function SeriesDetail() {
  const params = useParams();
  const seriesId = params?.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [series, setSeries] = useState<any | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [season, setSeason] = useState<number>(1);
  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!seriesId) {
          setError('No series ID provided.');
          setLoading(false);
          return;
        }

        const seriesData = await fetchFromTMDB(`tv/${seriesId}`);
        setSeries(seriesData);

        const seasons = seriesData.seasons.map((s: any) => s.season_number);
        const episodePromises = seasons.map((s: number) => fetchFromTMDB(`tv/${seriesId}/season/${s}`));
        const seasonsData = await Promise.all(episodePromises);

        const allEpisodes = seasonsData.flatMap((s: any) => s.episodes);
        setEpisodes(allEpisodes);

        const seasonParam = searchParams?.get('season');
        const episodeParam = searchParams?.get('episode');
        if (seasonParam && episodeParam) {
            setSeason(Number(seasonParam));
            setEpisodeNum(Number(episodeParam));
        } else if (allEpisodes.length > 0) {
            setSeason(allEpisodes[0].season_number);
            setEpisodeNum(allEpisodes[0].episode_number);
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

  const goBack = () => {
    router.back();
  };

  const seasons = Array.from(new Set(episodes.map(e => e.season_number))).sort((a, b) => a - b);
  const epsInSeason = episodes.filter(e => e.season_number === season);
  const currentEpisode = episodes.find(e => e.season_number === season && e.episode_number === episodeNum);

  if (loading) {
    return (
      <div className="pt-24 px-4 md:px-16 min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="pt-24 px-4 md:px-16 min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <div 
        className="relative z-0 w-full h-[40vh] md:h-[60vh] bg-cover bg-center bg-no-repeat" 
        style={{
          backgroundImage: series.backdrop_path 
            ? `linear-gradient(to bottom, rgba(17, 24, 39, 0.6), rgba(17, 24, 39, 0.9)), url(https://image.tmdb.org/t/p/original${series.backdrop_path})` 
            : 'none',
          backgroundColor: 'rgb(17, 24, 39)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
      </div>

      <div className="relative -mt-20 px-4 md:px-16">
        <div className="max-w-4xl mx-auto">
          {episodes.length > 0 && currentEpisode && (
            <div className="mb-4 mt-[-280px] md:mt-[-340px] -mx-4 md:mx-0 px-4 md:px-0 z-[30] relative">
              <div className="flex justify-center mb-2">
                <div className="scale-90 md:scale-75">
                  <PlayerNotification />
                </div>
              </div>
              {/* Hanya NativeAd ditampilkan di atas episode player, side-rail ads dihapus */}
              <div className="mb-4 flex justify-center">
                <div className="w-full max-w-2xl mx-auto">
                  <NativeAd />
                </div>
              </div>
              {/* Gunakan lebar penuh di sekitar flex agar kiri/kanan muat bersama player */}
              <div className="w-full">
                <div className="flex items-start justify-center gap-4">
                  {/* Left side-rail banner (key berbeda dari kanan) */}
                  <div className="hidden xl:block w-[160px]">
                    <BannerAd
                      adKey="4c357b50746a13005fa6455ce3eb1ef9"
                      scriptSrc="//www.highperformanceformat.com/4c357b50746a13005fa6455ce3eb1ef9/invoke.js"
                      width={160}
                      height={300}
                      format="iframe"
                      params={{}}
                      showLabel={false}
                      className="mx-auto"
                    />
                  </div>

                  {/* Player container: batasi lebar internal, bukan parent flex */}
                  <div className="aspect-[16/9] bg-black rounded-lg overflow-hidden shadow-xl w-full max-w-2xl">
                    <EpisodePlayer 
                      seriesId={series.id}
                      season={season}
                      episode={episodeNum}
                      height="100%"
                      onError={(errorMsg) => console.error('Episode player error:', errorMsg)}
                    />
                  </div>

                  {/* Right side-rail banner (160x600) */}
                  <div className="hidden xl:block w-[160px]">
                    <BannerAd
                      adKey="f19b65812f80bac3dbbe65a35867cd4c"
                      scriptSrc="//www.highperformanceformat.com/f19b65812f80bac3dbbe65a35867cd4c/invoke.js"
                      width={160}
                      height={600}
                      format="iframe"
                      params={{}}
                      showLabel={false}
                      className="mx-auto"
                    />
                  </div>
                </div>
                {/* Mobile-only bottom banner (320x50) */}
                <div className="xl:hidden w-full mt-4 flex justify-center">
                  <BannerAd
                    adKey="842c56077df2cb6c841070d57459dc6f"
                    scriptSrc="//www.highperformanceformat.com/842c56077df2cb6c841070d57459dc6f/invoke.js"
                    width={320}
                    height={50}
                    format="iframe"
                    params={{}}
                    responsive={false}
                    showLabel={false}
                    className="mx-auto"
                  />
                </div>
                {/* Removed BannerAd below the series player to avoid conflicts with side-rail units */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 gap-4">
                  <button
                    onClick={() => {
                      const prevEp = epsInSeason.find(ep => ep.episode_number === episodeNum - 1);
                      if (prevEp) {
                        setEpisodeNum(prevEp.episode_number);
                      } else {
                        const prevSeasonIndex = seasons.indexOf(season) - 1;
                        if (prevSeasonIndex >= 0) {
                          const prevSeason = seasons[prevSeasonIndex];
                          const prevSeasonEps = episodes.filter(e => e.season_number === prevSeason);
                          if (prevSeasonEps.length > 0) {
                            setSeason(prevSeason);
                            setEpisodeNum(prevSeasonEps[prevSeasonEps.length - 1].episode_number);
                          }
                        }
                      }
                    }}
                    disabled={!epsInSeason.find(ep => ep.episode_number === episodeNum - 1) && seasons.indexOf(season) === 0}
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
                      const nextEp = epsInSeason.find(ep => ep.episode_number === episodeNum + 1);
                      if (nextEp) {
                        setEpisodeNum(nextEp.episode_number);
                      } else {
                        const nextSeasonIndex = seasons.indexOf(season) + 1;
                        if (nextSeasonIndex < seasons.length) {
                          const nextSeason = seasons[nextSeasonIndex];
                          const nextSeasonEps = episodes.filter(e => e.season_number === nextSeason);
                          if (nextSeasonEps.length > 0) {
                            setSeason(nextSeason);
                            setEpisodeNum(nextSeasonEps[0].episode_number);
                          }
                        }
                      }
                    }}
                    disabled={!epsInSeason.find(ep => ep.episode_number === episodeNum + 1) && seasons.indexOf(season) === seasons.length - 1}
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
          {episodes.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg mb-6 max-w-3xl mx-auto">
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
                      <option key={ep.id} value={ep.episode_number}>
                        {ep.name ? `E${ep.episode_number}: ${ep.name}` : `Episode ${ep.episode_number}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {currentEpisode?.name && (
                <h3 className="text-xl font-semibold text-white mb-2">
                  S{season} E{episodeNum}: {currentEpisode.name}
                </h3>
              )}
              {currentEpisode?.overview && (
                <p className="text-gray-400 mb-4">{currentEpisode.overview}</p>
              )}
            </div>
          )}
          <div className="flex gap-6 flex-col md:flex-row">
            <div className="w-48 h-72 md:w-64 md:h-96 flex-shrink-0 rounded-lg overflow-hidden shadow-lg">
              {series.poster_path ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w500${series.poster_path}`}
                  alt={series.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-600">{series.name[0]}</span>
                </div>
              )}
            </div>

            <div className="flex-grow">
              <button 
                onClick={goBack}
                className="mb-4 text-gray-400 hover:text-white flex items-center gap-2"
              >
                <FaArrowLeft /> Back
              </button>

              <h1 className="text-3xl font-bold text-white mb-2">{series.name}</h1>
              
              <div className="flex items-center gap-4 text-gray-300 mb-4">
                {series.vote_average > 0 && (
                  <div className="flex items-center">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span>{series.vote_average.toFixed(1)}</span>
                  </div>
                )}
                {series.first_air_date && (
                  <div className="flex items-center">
                    <FaCalendarAlt className="mr-1" />
                    <span>{new Date(series.first_air_date).getFullYear()}</span>
                  </div>
                )}
              </div>

              {series.overview && (
                <p className="text-gray-300 mb-6">{series.overview}</p>
              )}
            </div>
          </div>

          {epsInSeason.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">Season {season} Episodes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {epsInSeason.map(ep => (
                  <div 
                    key={ep.id} 
                    className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition ${ep.episode_number === episodeNum ? 'ring-2 ring-red-500' : 'hover:bg-gray-750'}`}
                    onClick={() => setEpisodeNum(ep.episode_number)}
                  >
                    <div className="relative h-32 bg-gray-700">
                      {ep.still_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w500${ep.still_path}`}
                          alt={`Season ${season} Episode ${ep.episode_number}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-600">S{season}:E{ep.episode_number}</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent py-2 px-3">
                        <div className="text-white font-medium">Episode {ep.episode_number}</div>
                      </div>
                    </div>
                    <div className="p-3">
                      {ep.name && (
                        <h3 className="font-medium text-white truncate">{ep.name}</h3>
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

export default function SeriesDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    }>
      <SeriesDetail />
    </Suspense>
  );
}
