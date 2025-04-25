"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaSpinner, FaCheck, FaTimes, FaPlus, FaTrash, FaFilm, FaDatabase } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import BulkImport from './BulkImport';
import {
  discoverMovies,
  discoverSeries,
  discoverMoviesMultiPage,
  discoverSeriesMultiPage, 
} from './bulk-import-helper';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// TMDB API configuration
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'your_tmdb_api_key'; // Replace with your actual TMDB API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

interface Movie {
  id: string;
  tmdb_id: number;
  title: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  thumbnail_url: string;
  video_url: string;
  rating: number;
  release_year: number;
  duration: string;
  genre: string[];
  director: string;
  movie_cast: string[];
  status: 'pending' | 'processed' | 'error';
  created_at?: string;
  is_trending?: boolean;
  popularity?: number;
}

interface SearchResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [existingMovies, setExistingMovies] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentMovieIndex, setCurrentMovieIndex] = useState<number>(0);
  const [genreMap, setGenreMap] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<'searchMovies' | 'existingMovies' | 'searchSeries' | 'existingSeries' | 'bulkImportMovies' | 'bulkImportSeries' | 'manageTrending'>('searchMovies');
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(true);
  // Series management states
  const [seriesQuery, setSeriesQuery] = useState<string>('');
  const [seriesResults, setSeriesResults] = useState<any[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [existingSeriesList, setExistingSeriesList] = useState<any[]>([]);
  const [isSearchingSeries, setIsSearchingSeries] = useState<boolean>(false);
  const [isProcessingSeries, setIsProcessingSeries] = useState<boolean>(false);
  const [currentSeriesIndex, setCurrentSeriesIndex] = useState<number>(0);
  // Update states
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  const [updateType, setUpdateType] = useState<'movies' | 'series'>('movies');
  // Filter states for existing content
  const [existingMoviesFilter, setExistingMoviesFilter] = useState<string>('');
  const [existingSeriesFilter, setExistingSeriesFilter] = useState<string>('');
  // Column selection for updates
  const [movieColumnsToUpdate, setMovieColumnsToUpdate] = useState<{
    title: boolean;
    description: boolean;
    poster_url: boolean;
    backdrop_url: boolean;
    thumbnail_url: boolean;
    video_url: boolean;
    rating: boolean;
    genre: boolean;
    release_year: boolean;
    duration: boolean;
    director: boolean;
    movie_cast: boolean;
    country: boolean;
    provider: boolean;
  }>({
    title: true,
    description: true,
    poster_url: true,
    backdrop_url: true,
    thumbnail_url: true,
    video_url: true,
    rating: true,
    genre: true,
    release_year: true,
    duration: true,
    director: true,
    movie_cast: true,
    country: true,
    provider: true
  });
  
  const [seriesColumnsToUpdate, setSeriesColumnsToUpdate] = useState<{
    title: boolean;
    description: boolean;
    poster_url: boolean;
    backdrop_url: boolean;
    thumbnail_url: boolean;
    video_url: boolean;
    rating: boolean;
    genre: boolean;
    country: boolean;
  }>({
    title: true,
    description: true,
    poster_url: true,
    backdrop_url: true,
    thumbnail_url: true,
    video_url: true,
    rating: true,
    genre: true,
    country: true
  });
  
  // Add new state for trending management
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [isFetchingTrending, setIsFetchingTrending] = useState<boolean>(false);
  const [selectedTrendingMovies, setSelectedTrendingMovies] = useState<string[]>([]); 
  const [isUpdatingTrending, setIsUpdatingTrending] = useState<boolean>(false);
  const [isRecalculatingPopularity, setIsRecalculatingPopularity] = useState<boolean>(false);
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.user_metadata?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  // Fetch genre map and existing movies on component mount
  useEffect(() => {
    fetchGenreMap();
    fetchExistingMovies();
    fetchExistingSeries();
  }, []);

  // Fetch genre map from TMDB
  const fetchGenreMap = async () => {
    try {
      const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`);
      const data = await response.json();
      
      if (data.genres) {
        const genreMapping: {[key: number]: string} = {};
        data.genres.forEach((genre: {id: number, name: string}) => {
          genreMapping[genre.id] = genre.name;
        });
        setGenreMap(genreMapping);
      }
    } catch (error) {
      console.error('Error fetching genre map:', error);
    }
  };

  // Fetch existing movies from Supabase
  const fetchExistingMovies = async () => {
    setIsLoadingExisting(true);
    try {
      // Tambahkan parameter cache buster untuk menghindari caching
      const timestamp = new Date().getTime();
      
      let allMovies: Movie[] = [];
      let page = 0;
      const pageSize = 1000; // Supabase default limit
      let hasMoreData = true;
      
      while (hasMoreData) {
        // Fetch a page of movies
      const { data, error } = await supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      
        if (data && data.length > 0) {
          allMovies = [...allMovies, ...data];
          page++;
          
          // If we received fewer records than the page size, we've reached the end
          hasMoreData = data.length === pageSize;
        } else {
          hasMoreData = false;
        }
      }
      
      console.log(`Berhasil memuat ${allMovies.length} film dari server pada ${new Date().toLocaleTimeString()}`);
      setExistingMovies(allMovies);
      
      // Force refresh halaman jika diminta (melalui parameter opsional)
      if (typeof window !== 'undefined' && window.location.search.includes('force_refresh=true')) {
        console.log("Melakukan force refresh halaman...");
        window.location.search = ''; // Hapus parameter query
      }
    } catch (error) {
      console.error('Error fetching existing movies:', error);
      setMessage({
        text: 'Failed to load existing movies',
        type: 'error'
      });
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // Fetch existing series from Supabase
  const fetchExistingSeries = async () => {
    try {
      let allSeries: any[] = [];
      let page = 0;
      const pageSize = 1000; // Supabase default limit
      let hasMoreData = true;
      
      while (hasMoreData) {
        // Fetch a page of series
      const { data, error } = await supabase
        .from('series')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      
        if (data && data.length > 0) {
          allSeries = [...allSeries, ...data];
          page++;
          
          // If we received fewer records than the page size, we've reached the end
          hasMoreData = data.length === pageSize;
        } else {
          hasMoreData = false;
        }
      }
      
      console.log(`Berhasil memuat ${allSeries.length} serial dari server pada ${new Date().toLocaleTimeString()}`);
      setExistingSeriesList(allSeries);
    } catch (error) {
      console.error('Error fetching existing series:', error);
      setMessage({
        text: 'Failed to load existing series',
        type: 'error'
      });
    }
  };

  // Search for movies in TMDB
  const searchMovies = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setMessage({
        text: 'Please enter a search query',
        type: 'error'
      });
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    setMessage({ text: '', type: '' });
    
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(searchQuery)}&page=1&include_adult=false`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setMessage({
          text: 'No movies found for your search query',
          type: 'info'
        });
      }
    } catch (error) {
      console.error('Error searching movies:', error);
      setMessage({
        text: 'Error searching movies. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Search for series in TMDB
  const searchSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesQuery.trim()) {
      setMessage({ text: 'Please enter a series name', type: 'error' });
      return;
    }
    setIsSearchingSeries(true);
    setSeriesResults([]);
    setMessage({ text: '', type: '' });
    
    try {
      console.log(`Searching for TV series: "${seriesQuery}"...`);
      const resp = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(seriesQuery)}&page=1&include_adult=false`);
      
      if (!resp.ok) {
        throw new Error(`TMDB API responded with status: ${resp.status}`);
      }
      
      const data = await resp.json();
      
      if (data.results && data.results.length > 0) {
        console.log(`Found ${data.results.length} series results`);
        setSeriesResults(data.results);
      } else {
        console.log('No series found for query:', seriesQuery);
        setMessage({ text: 'No TV series found for your search query', type: 'info' });
      }
    } catch (err: any) {
      console.error('Error searching series:', err);
      setMessage({ 
        text: `Error searching series: ${err.message || 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setIsSearchingSeries(false);
    }
  };

  // Get series details from TMDB including videos
  const fetchSeriesDetails = async (seriesId: number): Promise<any> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${seriesId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=external_ids,videos,watch/providers`
      );
      return await response.json();
    } catch (error) {
      console.error(`Error fetching details for TV series ID ${seriesId}:`, error);
      throw error;
    }
  };

  // Get movie details from TMDB
  const fetchMovieDetails = async (movieId: number): Promise<any> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos,watch/providers`
      );
      return await response.json();
    } catch (error) {
      console.error(`Error fetching details for movie ID ${movieId}:`, error);
      throw error;
    }
  };

  // Add selected movie to Supabase
  const processMovies = async () => {
    if (selectedMovies.length === 0) {
      setMessage({
        text: 'Please select at least one movie',
        type: 'error'
      });
      return;
    }
    
    setIsProcessing(true);
    setCurrentMovieIndex(0);
    
    try {
      for (let i = 0; i < selectedMovies.length; i++) {
        setCurrentMovieIndex(i);
        try {
          await processMovie(selectedMovies[i]);
        } catch (movieError: any) {
          console.error(`Error processing movie ${selectedMovies[i].title}:`, 
            movieError.message || movieError);
          
          // Continue with next movie instead of stopping all processing
          setMessage({
            text: `Error processing movie "${selectedMovies[i].title}": ${movieError.message || 'Unknown error'}. Continuing with next movie.`,
            type: 'error'
          });
          
          // Optional: wait a bit before continuing
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setMessage({
        text: `Processed ${selectedMovies.length} movie(s). Some may have failed, check console for details.`,
        type: 'success'
      });
      
      // Refresh existing movies
      fetchExistingMovies();
      
      // Clear selected movies
      setSelectedMovies([]);
    } catch (error: any) {
      console.error('Error processing movies:', error.message || error);
      setMessage({
        text: `Error processing movies: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
      setCurrentMovieIndex(-1);
    }
  };

  // Process a single movie
  const processMovie = async (movie: SearchResult) => {
    try {
      const movieDetails = await fetchMovieDetails(movie.id);
      
      // Format date if it exists
      let releaseDate = '';
      if (movie.release_date) {
        const date = new Date(movie.release_date);
        releaseDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // Extract cast and director information
      let director = '';
      let cast: string[] = [];
      
      if (movieDetails.credits) {
        if (movieDetails.credits.crew) {
          const directors = movieDetails.credits.crew.filter((person: any) => person.job === 'Director');
          if (directors.length > 0) {
            director = directors.map((director: any) => director.name).join(', ');
          }
        }
        
        if (movieDetails.credits.cast) {
          cast = movieDetails.credits.cast.slice(0, 10).map((actor: any) => actor.name);
        }
      }
      
      // Map genre IDs to names
      let genres: string[] = [];
      if (movie.genre_ids && movie.genre_ids.length > 0) {
        genres = movie.genre_ids.map((id: number) => genreMap[id] || '').filter(Boolean);
      }
      
      // Extract movie duration
      let duration = '';
      if (movieDetails.runtime) {
        const hours = Math.floor(movieDetails.runtime / 60);
        const minutes = movieDetails.runtime % 60;
        duration = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
      }
      
      // Extract video URL if available
      let videoUrl = null;
      if (movieDetails.videos && movieDetails.videos.results) {
        const trailers = movieDetails.videos.results.filter(
          (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
        );
        if (trailers.length > 0) {
          videoUrl = `https://www.youtube.com/watch?v=${trailers[0].key}`;
        }
      }
      
      // Extract country data
      let countries: string[] = [];
      if (movieDetails.production_countries && movieDetails.production_countries.length > 0) {
        countries = movieDetails.production_countries.map((country: any) => country.name);
      }
      
      // Extract provider data if available
      let providers: string[] = [];
      if (movieDetails["watch/providers"] && movieDetails["watch/providers"].results) {
        // Use US providers as default, fall back to any available region
        const regions = Object.keys(movieDetails["watch/providers"].results);
        const preferredRegion = regions.includes('US') ? 'US' : (regions.length > 0 ? regions[0] : null);
        
        if (preferredRegion) {
          const regionData = movieDetails["watch/providers"].results[preferredRegion];
          
          // Extract providers from various categories (flatrate, buy, rent)
          if (regionData.flatrate) {
            providers = providers.concat(regionData.flatrate.map((p: any) => p.provider_name));
          }
          if (regionData.buy) {
            providers = providers.concat(regionData.buy.map((p: any) => p.provider_name));
          }
          if (regionData.rent) {
            providers = providers.concat(regionData.rent.map((p: any) => p.provider_name));
          }
          
          // Remove duplicates
          providers = [...new Set(providers)];
        }
      }
      
      // Prepare data to insert into Supabase
      const movieData = {
        tmdb_id: movie.id,
        title: movie.title,
        description: movie.overview,
        poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}` : null,
        backdrop_url: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${movie.backdrop_path}` : null,
        thumbnail_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w300${movie.poster_path}` : null,
        video_url: videoUrl,
        rating: movie.vote_average || 0,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear(),
        duration: duration,
        genre: genres,
        director: director,
        movie_cast: cast,
        country: countries,
        provider: providers,
        status: 'pending'
      };
      
      // Insert into Supabase
      const { data, error } = await supabase.from('movies').insert(movieData);
      
      if (error) throw error;
      
      console.log(`Movie "${movie.title}" added successfully!`);
    } catch (error) {
      console.error(`Error processing movie "${movie.title}":`, error);
      throw error;
    }
  };

  // Toggle movie selection
  const toggleMovieSelection = (movie: SearchResult) => {
    if (selectedMovies.some(m => m.id === movie.id)) {
      setSelectedMovies(selectedMovies.filter(m => m.id !== movie.id));
    } else {
      setSelectedMovies([...selectedMovies, movie]);
    }
  };

  // Delete movie from database
  const deleteMovie = async (movieId: string) => {
    if (!confirm('Anda yakin ingin menghapus film ini?')) {
      return;
    }
    
    try {
      console.log(`Mencoba menghapus film dengan ID: ${movieId}`);
      // Perbarui state UI untuk menghapus film dari daftar lebih awal
      // untuk memperbarui tampilan sebelum operasi penghapusan database
      setExistingMovies(existingMovies.filter(movie => movie.id !== movieId));
      
      setMessage({
        text: 'Sedang menghapus film...',
        type: 'info'
      });
      
      // Coba metode 1: Hapus sources terlebih dahulu (jika ada)
      console.log("Metode 0: Menghapus movie_sources terlebih dahulu...");
      const { error: sourcesError } = await supabase
        .from('movie_sources')
        .delete()
        .eq('movie_id', movieId);
        
      if (sourcesError) {
        console.warn(`Peringatan saat menghapus sources: ${sourcesError.message}`);
      }
      
      // Coba metode 1: Hapus langsung
      console.log("Metode 1: Mencoba menghapus langsung...");
      const { error: directError } = await supabase
        .from('movies')
        .delete()
        .eq('id', movieId);
      
      if (directError) {
        console.warn(`Gagal menghapus langsung: ${directError.message}`);
        
        // Coba metode 2: Gunakan fungsi RPC dengan SECURITY DEFINER
        console.log("Metode 2: Mencoba menghapus via RPC...");
        try {
          const { error: rpcError } = await supabase.rpc('delete_movie_bypass_rls', { movie_id: movieId });
          
          if (rpcError) {
            console.error("Gagal menghapus via RPC:", rpcError);
            throw new Error(`Gagal menghapus film. Error: ${rpcError.message}`);
          } else {
            console.log("Berhasil menghapus film via RPC");
          }
        } catch (rpcErr: any) {
          console.error("Error saat memanggil RPC:", rpcErr);
          throw new Error(rpcErr.message || "Error memanggil fungsi penghapusan");
        }
      } else {
        console.log("Berhasil menghapus film secara langsung");
      }
      
      setMessage({
        text: 'Film berhasil dihapus',
        type: 'success'
      });
      
      // Muat ulang daftar film dari server untuk memastikan sinkronisasi
      // Tambahkan waktu yang lebih lama untuk memastikan database sudah diupdate
      setTimeout(async () => {
        console.log("Memuat ulang daftar film...");
        await fetchExistingMovies();
        // Double-check untuk memastikan film benar-benar dihapus dari state
        setExistingMovies(prevMovies => prevMovies.filter(movie => movie.id !== movieId));
      }, 2000); // Tunggu 2 detik untuk memastikan update database sudah selesai
      
    } catch (error: any) {
      console.error('Error saat menghapus film:', error);
      
      // Kembalikan film ke daftar jika gagal
      fetchExistingMovies();
      
      // Tunjukkan instruksi kepada pengguna untuk menjalankan script SQL
      setMessage({
        text: `Error: ${error.message || 'Unknown error'}. Coba jalankan script fix_delete_permissions_simple.sql di Supabase SQL Editor.`,
        type: 'error'
      });
    }
  };

  // Delete series from database
  const deleteSeries = async (seriesId: string) => {
    if (!confirm('Are you sure you want to delete this series and all its episodes?')) return;
    
    setMessage({ text: 'Deleting series...', type: 'info' });
    
    try {
      // First, delete all episodes
      const { error: episodesError } = await supabase.from('episodes').delete().eq('series_id', seriesId);
      if (episodesError) throw episodesError;
      
      // Then delete the series
      const { error: seriesError } = await supabase.from('series').delete().eq('id', seriesId);
      if (seriesError) throw seriesError;
      
      // Refresh the list
      await fetchExistingSeries();
      setMessage({ text: 'Series deleted successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error deleting series:', error);
      setMessage({ text: `Error deleting series: ${error.message}`, type: 'error' });
    }
  };

  // Fetch episode data for a series
  const fetchSeriesEpisodes = async (seriesId: number, supabaseSeriesId: string, seasonNumber: number = 1) => {
    try {
      console.log(`Fetching episodes for series ${seriesId}, season ${seasonNumber}...`);
      
      // First, verify that the series exists in our database
      const { data: existingSeries, error: checkError } = await supabase
        .from('series')
        .select('id, title')
        .eq('id', supabaseSeriesId)
        .single();
        
      if (checkError || !existingSeries) {
        console.error(`Cannot insert episodes - Series with id ${supabaseSeriesId} not found in database`);
        return 0; // Exit early if series doesn't exist
      }
      
      // Fetch season details including episodes
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      
      if (!response.ok) {
        throw new Error(`TMDB API responded with status: ${response.status}`);
      }
      
      const seasonData = await response.json();
      
      if (!seasonData.episodes || !Array.isArray(seasonData.episodes)) {
        console.log(`No episodes found for season ${seasonNumber}`);
        return 0; // Return 0 for episode count if none found
      }
      
      // Check for existing episodes to avoid duplicates
      const { data: existingEpisodes } = await supabase
        .from('episodes')
        .select('tmdb_episode_id')
        .eq('series_id', supabaseSeriesId)
        .eq('season', seasonNumber);
        
      const existingEpisodeIds = existingEpisodes?.map(e => e.tmdb_episode_id) || [];
      
      let successfulInserts = 0;
      
      // Process each episode
      for (const episode of seasonData.episodes) {
        // Skip if episode already exists
        if (existingEpisodeIds.includes(episode.id)) {
          console.log(`Episode ${episode.episode_number} of season ${seasonNumber} already exists. Skipping.`);
          continue;
        }
        
        // Format episode data for Supabase
        const episodeData = {
          series_id: supabaseSeriesId,
          season: seasonNumber,
          episode: episode.episode_number,
          tmdb_episode_id: episode.id,
          title: episode.name,
          description: episode.overview,
          poster_url: episode.still_path ? `${TMDB_IMAGE_BASE_URL}/original${episode.still_path}` : null,
          air_date: episode.air_date,
          rating: episode.vote_average || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Insert episode into database
        const { error: insertError } = await supabase
          .from('episodes')
          .insert(episodeData);
        
        if (insertError) {
          console.error(`Error inserting episode ${episode.episode_number} of season ${seasonNumber}:`, insertError);
        } else {
          console.log(`Inserted episode ${episode.episode_number} of season ${seasonNumber}`);
          successfulInserts++;
        }
      }
      
      console.log(`Successfully added ${successfulInserts} episodes for season ${seasonNumber}`);
      
      // Only update counts if we actually inserted something
      if (successfulInserts > 0) {
        // After importing episodes, update the series with the new counts
        await updateSeriesEpisodeCounts(supabaseSeriesId);
      }
      
      return successfulInserts;
    } catch (error) {
      console.error(`Error fetching episodes for season ${seasonNumber}:`, error);
      return 0;
    }
  };
  
  // Helper function to update episode and season counts for a series
  const updateSeriesEpisodeCounts = async (seriesId: string) => {
    try {
      // Get the count of distinct seasons and total episodes
      const { data: countData, error: countError } = await supabase
        .from('episodes')
        .select('season', { count: 'exact' })
        .eq('series_id', seriesId);
        
      const { data: distinctSeasons, error: distinctError } = await supabase
        .rpc('get_distinct_seasons_count', { series_id_param: seriesId });
      
      if (countError) {
        throw countError;
      }
      
      if (distinctError) {
        throw distinctError;
      }
      
      const episodeCount = countData?.length || 0;
      const seasonCount = distinctSeasons || 0;
      
      // Update the series with the accurate counts
      const { error: updateError } = await supabase
        .from('series')
        .update({
          episodes_count: episodeCount,
          seasons_count: seasonCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', seriesId);
        
      if (updateError) {
        throw updateError;
      }
      
      console.log(`Updated series ${seriesId} with ${seasonCount} seasons and ${episodeCount} episodes`);
    } catch (error) {
      console.error('Error updating series episode counts:', error);
    }
  };

  // Process selected series: insert into DB
  const processSeries = async () => {
    if (selectedSeries.length === 0) {
      setMessage({
        text: 'Please select at least one series',
        type: 'error'
      });
      return;
    }
    
    setIsProcessingSeries(true);
    setCurrentSeriesIndex(0);
    
    try {
      for (let i = 0; i < selectedSeries.length; i++) {
        setCurrentSeriesIndex(i);
        try {
          // Show the current progress in the message
          setMessage({
            text: `Processing ${i+1}/${selectedSeries.length}: ${selectedSeries[i].name || selectedSeries[i].title}`,
            type: 'info'
          });
          
          await processSelectedSeries(selectedSeries[i]);
        } catch (seriesError: any) {
          console.error(`Error processing series ${selectedSeries[i].name || selectedSeries[i].title}:`, 
            seriesError.message || seriesError);
          
          // Continue with next series instead of stopping all processing
          setMessage({
            text: `Error processing series "${selectedSeries[i].name || selectedSeries[i].title}": ${seriesError.message || 'Unknown error'}. Continuing with next series.`,
            type: 'error'
          });
          
          // Optional: wait a bit before continuing
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setMessage({
        text: `Processed ${selectedSeries.length} series. Some may have failed, check console for details.`,
        type: 'success'
      });
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
      
      // Refresh existing series list
      fetchExistingSeries();
      
      // Clear selected series
      setSelectedSeries([]);
    } catch (error: any) {
      console.error('Error processing series:', error.message || error);
      setMessage({
        text: `Error processing series: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsProcessingSeries(false);
      setCurrentSeriesIndex(-1);
    }
  };

  // Update movies with latest data from TMDB
  const updateMoviesDatabase = async () => {
    // Check if at least one column is selected for update
    const hasSelectedColumns = Object.values(movieColumnsToUpdate).some(value => value === true);
    if (!hasSelectedColumns) {
      setMessage({ text: 'Pilih minimal satu kolom untuk diperbarui', type: 'error' });
      return;
    }
    
    if (!confirm('Apakah Anda yakin ingin memperbarui database film dengan data terbaru dari TMDB? Proses ini mungkin membutuhkan waktu beberapa menit.')) {
      return;
    }
    
    setIsUpdating(true);
    setUpdateType('movies');
    setMessage({ text: 'Memulai proses update database film...', type: 'info' });
    
    try {
      // Fetch all movies from database
      setMessage({ text: 'Mengambil data film dari database...', type: 'info' });
      const { data: movies, error } = await supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1000000); // Menggunakan limit sangat tinggi
      
      if (error) throw error;
      
      if (!movies || movies.length === 0) {
        setMessage({ text: 'Tidak ada film dalam database untuk diupdate', type: 'info' });
        setIsUpdating(false);
        return;
      }
      
      // Tampilkan jumlah film yang akan diupdate
      setMessage({ text: `Bersiap update ${movies.length} film...`, type: 'info' });
      
      const startTime = new Date().getTime();
      setUpdateProgress({ current: 0, total: movies.length });
      
      // Update each movie
      for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        setUpdateProgress({ current: i + 1, total: movies.length });
        
        // Hitung perkiraan waktu selesai
        if (i > 0) {
          const elapsedTime = new Date().getTime() - startTime;
          const timePerMovie = elapsedTime / i;
          const remainingMovies = movies.length - i;
          const estimatedTimeRemaining = Math.round((timePerMovie * remainingMovies) / 1000);
          
          // Update message setiap 10 movie
          if (i % 10 === 0) {
            setMessage({ 
              text: `Memperbarui film ${i+1}/${movies.length}. Perkiraan waktu tersisa: ${estimatedTimeRemaining} detik`,
              type: 'info' 
            });
          }
        }
        
        try {
          // Fetch latest data from TMDB
          const movieDetails = await fetchMovieDetails(movie.tmdb_id);
          
          if (!movieDetails || movieDetails.success === false) {
            console.warn(`Tidak dapat mengambil data untuk film ${movie.title} (ID: ${movie.tmdb_id})`);
            continue;
          }
          
          // Build the update object based on selected columns
          let updatedMovie: any = {
            updated_at: new Date().toISOString()
          };
          
          // Only include fields that are selected for update
          if (movieColumnsToUpdate.title) {
            updatedMovie.title = movieDetails.title || movie.title;
          }
          
          if (movieColumnsToUpdate.description) {
            updatedMovie.description = movieDetails.overview || movie.description;
          }
          
          if (movieColumnsToUpdate.poster_url) {
            updatedMovie.poster_url = movieDetails.poster_path 
              ? `${TMDB_IMAGE_BASE_URL}/w500${movieDetails.poster_path}` 
              : movie.poster_url;
          }
          
          if (movieColumnsToUpdate.backdrop_url) {
            updatedMovie.backdrop_url = movieDetails.backdrop_path 
              ? `${TMDB_IMAGE_BASE_URL}/original${movieDetails.backdrop_path}` 
              : movie.backdrop_url;
          }
          
          if (movieColumnsToUpdate.thumbnail_url) {
            updatedMovie.thumbnail_url = movieDetails.poster_path 
              ? `${TMDB_IMAGE_BASE_URL}/w200${movieDetails.poster_path}` 
              : movie.thumbnail_url;
          }
          
          if (movieColumnsToUpdate.rating) {
            updatedMovie.rating = movieDetails.vote_average !== undefined 
              ? movieDetails.vote_average 
              : movie.rating;
          }
          
          if (movieColumnsToUpdate.video_url && movieDetails.videos && movieDetails.videos.results) {
            const trailers = movieDetails.videos.results.filter(
                (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
              );
              
            if (trailers.length > 0) {
              updatedMovie.video_url = `https://www.youtube.com/watch?v=${trailers[0].key}`;
            }
          }
          
          if (movieColumnsToUpdate.genre && movieDetails.genres) {
            updatedMovie.genre = movieDetails.genres.map((genre: any) => genre.name);
          }
          
          if (movieColumnsToUpdate.release_year && movieDetails.release_date) {
            updatedMovie.release_year = new Date(movieDetails.release_date).getFullYear();
          }
          
          if (movieColumnsToUpdate.duration && movieDetails.runtime) {
            const hours = Math.floor(movieDetails.runtime / 60);
            const minutes = movieDetails.runtime % 60;
            updatedMovie.duration = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
          }
          
          if (movieColumnsToUpdate.director && movieDetails.credits && movieDetails.credits.crew) {
            const directors = movieDetails.credits.crew.filter(
              (person: any) => person.job === 'Director'
            );
            
            if (directors.length > 0) {
              updatedMovie.director = directors.map((director: any) => director.name).join(', ');
            }
          }
          
          if (movieColumnsToUpdate.movie_cast && movieDetails.credits && movieDetails.credits.cast) {
            updatedMovie.movie_cast = movieDetails.credits.cast.slice(0, 10).map(
              (actor: any) => actor.name
            );
          }
          
          if (movieColumnsToUpdate.country && movieDetails.production_countries) {
            updatedMovie.country = movieDetails.production_countries.map(
              (country: any) => country.name
            );
          }
          
          // Update provider data if available
          if (movieDetails["watch/providers"] && movieDetails["watch/providers"].results) {
            // Use US providers as default, fall back to any available region
            const regions = Object.keys(movieDetails["watch/providers"].results);
            const preferredRegion = regions.includes('US') ? 'US' : (regions.length > 0 ? regions[0] : null);
            
            if (preferredRegion) {
              const regionData = movieDetails["watch/providers"].results[preferredRegion];
              let providers: string[] = [];
              
              // Extract providers from various categories (flatrate, buy, rent)
              if (regionData.flatrate) {
                providers = providers.concat(regionData.flatrate.map((p: any) => p.provider_name));
              }
              if (regionData.buy) {
                providers = providers.concat(regionData.buy.map((p: any) => p.provider_name));
              }
              if (regionData.rent) {
                providers = providers.concat(regionData.rent.map((p: any) => p.provider_name));
              }
              
              // Remove duplicates
              providers = [...new Set(providers)];
              
              // Only update if we found providers
              if (providers.length > 0) {
                updatedMovie.provider = providers;
              }
            }
          }
          
          // Update movie in database
          const { error: updateError } = await supabase
            .from('movies')
            .update(updatedMovie)
            .eq('id', movie.id);
          
          if (updateError) {
            console.error(`Error updating movie ${movie.title}:`, updateError);
          }
        } catch (err: any) {
          console.error(`Error updating movie ${movie.title}:`, err.message || err);
        }
      }
      
      setMessage({
        text: `Update database film selesai. ${movies.length} film telah diperbarui.`, 
        type: 'success'
      });
      
    } catch (error: any) {
      console.error('Error updating movie database:', error);
      setMessage({
        text: `Error updating movie database: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Update series database with latest data from TMDB
  const updateSeriesDatabase = async () => {
    // Check if user wants to update
    if (!confirm('Apakah Anda yakin ingin memperbarui semua serial TV dengan data terbaru dari TMDB?')) {
      return;
    }
    
    setIsUpdating(true);
    setUpdateType('series');
    setMessage({ text: 'Memulai proses update database serial TV...', type: 'info' });
    
    try {
      // Fetch all series from database
      const { data: seriesList, error: fetchError } = await supabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      if (!seriesList || seriesList.length === 0) {
        setMessage({ text: 'Tidak ada serial TV dalam database untuk diperbarui', type: 'info' });
        setIsUpdating(false);
        return;
      }
      
      // Show total series to update
      setMessage({ text: `Akan memperbarui ${seriesList.length} serial TV. Proses ini bisa memakan waktu beberapa menit.`, type: 'info' });
      setUpdateProgress({ current: 0, total: seriesList.length });
      
      // Update each series
      for (let i = 0; i < seriesList.length; i++) {
        const series = seriesList[i];
        setUpdateProgress({ current: i + 1, total: seriesList.length });
        
        // Update progress message
        if (i % 5 === 0) {
          setMessage({ text: `Memperbarui serial TV ${i+1}/${seriesList.length}: ${series.title}`, type: 'info' });
        }
        
        try {
          // Skip series without TMDB ID
          if (!series.tmdb_id) {
            console.warn(`Serial TV ${series.title} tidak memiliki TMDB ID. Melewati...`);
            continue;
          }
          
          // Get updated details from TMDB
          const seriesDetails = await fetchSeriesDetails(series.tmdb_id);
          
          if (!seriesDetails || seriesDetails.success === false) {
            console.warn(`Tidak dapat mengambil data untuk serial TV ${series.title} (ID: ${series.tmdb_id})`);
            continue;
          }
          
          // Extract YouTube trailer key if available
          let trailerKey = '';
          if (seriesDetails.videos && seriesDetails.videos.results) {
            const trailer = seriesDetails.videos.results.find(
              (video: any) => video.site === 'YouTube' && 
              (video.type === 'Trailer' || video.type === 'Teaser')
            );
            
            if (trailer) {
              trailerKey = trailer.key;
            }
          }
          
          // Get the genre names as an array
          const genreArray = seriesDetails.genres?.map((genre: any) => genre.name) || [];
          
          // Extract country data
          const countryArray = seriesDetails.production_countries?.map((country: any) => country.name) || [];
          
          // Extract provider data if available
          let providers: string[] = [];
          if (seriesDetails["watch/providers"] && seriesDetails["watch/providers"].results) {
            // Use US providers as default, fall back to any available region
            const regions = Object.keys(seriesDetails["watch/providers"].results);
            const preferredRegion = regions.includes('US') ? 'US' : (regions.length > 0 ? regions[0] : null);
            
            if (preferredRegion) {
              const regionData = seriesDetails["watch/providers"].results[preferredRegion];
              
              // Extract providers from various categories (flatrate is most common for streaming services)
              if (regionData.flatrate) {
                providers = providers.concat(regionData.flatrate.map((p: any) => p.provider_name));
              }
              if (regionData.buy) {
                providers = providers.concat(regionData.buy.map((p: any) => p.provider_name));
              }
              if (regionData.rent) {
                providers = providers.concat(regionData.rent.map((p: any) => p.provider_name));
              }
              
              // Remove duplicates
              providers = [...new Set(providers)];
            }
          }
          
          // Create update object
          const updateData = {
            title: seriesDetails.name || series.title,
            description: seriesDetails.overview || series.description,
            poster_url: seriesDetails.poster_path 
              ? `${TMDB_IMAGE_BASE_URL}/w500${seriesDetails.poster_path}` 
              : series.poster_url,
            backdrop_url: seriesDetails.backdrop_path 
              ? `${TMDB_IMAGE_BASE_URL}/original${seriesDetails.backdrop_path}` 
              : series.backdrop_url,
            thumbnail_url: seriesDetails.poster_path 
              ? `${TMDB_IMAGE_BASE_URL}/w200${seriesDetails.poster_path}` 
              : series.thumbnail_url,
            video_url: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : series.video_url,
            rating: seriesDetails.vote_average || series.rating,
            genre: genreArray.length > 0 ? genreArray : series.genre,
            country: countryArray.length > 0 ? countryArray : series.country,
            provider: providers.length > 0 ? providers : series.provider,
            updated_at: new Date().toISOString()
          };
          
          // Update series in database
          const { error: updateError } = await supabase
            .from('series')
            .update(updateData)
            .eq('id', series.id);
          
          if (updateError) {
            console.error(`Error updating series ${series.title}:`, updateError);
          } else {
            console.log(`Successfully updated series: ${series.title}`);
          }
          
          // Short delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`Error updating series ${series.title}:`, error);
        }
      }
      
          setMessage({
        text: `Update database serial TV selesai. ${seriesList.length} serial TV telah diperbarui.`, 
        type: 'success' 
      });
      
      // Refresh series list
      fetchExistingSeries();
      
    } catch (error: any) {
      console.error('Error updating series database:', error);
      setMessage({
        text: `Error updating series database: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Process selected series from bulk import
  const processSelectedSeries = async (series: any): Promise<void> => {
    if (!series) return;
    
    try {
      // Check if this series is already in our database
      const { data: existingSeries, error: checkError } = await supabase
        .from('series')
        .select('*')
        .eq('tmdb_id', series.id)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingSeries) {
        console.log(`Series ${series.name} already exists in database. Skipping.`);
        return;
      }
      
      // Step 1: Get detailed series info from TMDB
      const detailedSeriesResponse = await fetch(
        `https://api.themoviedb.org/3/tv/${series.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos,external_ids,watch/providers`
      );
      
      if (!detailedSeriesResponse.ok) {
        throw new Error(`Failed to fetch detailed series info: ${detailedSeriesResponse.status}`);
      }
      
      const detailedSeries = await detailedSeriesResponse.json();
      
      // Extract YouTube trailer key if available
      const trailerKey = detailedSeries.videos?.results?.find(
        (video: any) => video.site === 'YouTube' && 
        (video.type === 'Trailer' || video.type === 'Teaser')
      )?.key || '';
      
      // Get the genre names as an array
      const genreArray = detailedSeries.genres?.map((genre: any) => genre.name) || [];
      
      // Extract country data
      const countryArray = detailedSeries.production_countries?.map((country: any) => country.name) || [];
      
      // Extract provider data if available
      let providers: string[] = [];
      if (detailedSeries["watch/providers"] && detailedSeries["watch/providers"].results) {
        // Use US providers as default, fall back to any available region
        const regions = Object.keys(detailedSeries["watch/providers"].results);
        const preferredRegion = regions.includes('US') ? 'US' : (regions.length > 0 ? regions[0] : null);
        
        if (preferredRegion) {
          const regionData = detailedSeries["watch/providers"].results[preferredRegion];
          
          // Extract providers from various categories (flatrate is most common for streaming services)
          if (regionData.flatrate) {
            providers = providers.concat(regionData.flatrate.map((p: any) => p.provider_name));
          }
          if (regionData.buy) {
            providers = providers.concat(regionData.buy.map((p: any) => p.provider_name));
          }
          if (regionData.rent) {
            providers = providers.concat(regionData.rent.map((p: any) => p.provider_name));
          }
          
          // Remove duplicates
          providers = [...new Set(providers)];
        }
      }
      
      // Format the series data for our database
      const seriesData = {
        tmdb_id: detailedSeries.id,
        title: detailedSeries.name,
        description: detailedSeries.overview || '',
        poster_url: detailedSeries.poster_path ? 
          `${TMDB_IMAGE_BASE_URL}/w500${detailedSeries.poster_path}` : '',
        backdrop_url: detailedSeries.backdrop_path ? 
          `${TMDB_IMAGE_BASE_URL}/original${detailedSeries.backdrop_path}` : '',
        thumbnail_url: detailedSeries.poster_path ? 
          `${TMDB_IMAGE_BASE_URL}/w200${detailedSeries.poster_path}` : '',
        video_url: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : '',
        rating: detailedSeries.vote_average || 0,
        release_year: detailedSeries.first_air_date ? 
          new Date(detailedSeries.first_air_date).getFullYear() : null,
        genre: genreArray,
        country: countryArray,
        provider: providers,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Initialize with TMDB data, but we'll update these after fetching episodes
        seasons_count: detailedSeries.number_of_seasons || 0,
        episodes_count: detailedSeries.number_of_episodes || 0
      };
      
      // Step 3: Insert the series data into our database
      const { data: insertedSeries, error: insertError } = await supabase
        .from('series')
        .insert([seriesData])
        .select();
        
      if (insertError) {
        throw insertError;
      }
      
      if (!insertedSeries || insertedSeries.length === 0) {
        throw new Error(`Failed to insert series: ${seriesData.title}. No series ID returned.`);
      }
      
      console.log(`Successfully imported series: ${seriesData.title}`);
      
      // Double-check that the series exists in the database
      const supabaseSeriesId = insertedSeries[0].id;
      const { data: verifiedSeries, error: verifyError } = await supabase
        .from('series')
        .select('id, title')
        .eq('id', supabaseSeriesId)
        .single();
        
      if (verifyError || !verifiedSeries) {
        console.error(`Verification failed for series ${seriesData.title}:`, verifyError);
        throw new Error(`Failed to verify series in database after insert: ${seriesData.title}`);
      }
      
      console.log(`Verified series exists in database: ${verifiedSeries.title}`);
      
      // Now that we're sure the series exists, fetch and insert seasons/episodes
      console.log(`Importing seasons and episodes for ${seriesData.title}...`);
      
      // Get the total number of seasons
      const numberOfSeasons = detailedSeries.number_of_seasons || 0;
      
      // Track total episodes added
      let totalEpisodesAdded = 0;
      
      // Import episodes for each season
      for (let seasonNumber = 1; seasonNumber <= numberOfSeasons; seasonNumber++) {
        const episodesAdded = await fetchSeriesEpisodes(detailedSeries.id, supabaseSeriesId, seasonNumber);
        totalEpisodesAdded += episodesAdded;
      }
      
      console.log(`Finished importing all seasons and episodes for ${seriesData.title}`);
      console.log(`Total episodes added: ${totalEpisodesAdded}`);
      
      // Final update of episode and season counts
      await updateSeriesEpisodeCounts(supabaseSeriesId);
    } catch (error) {
      console.error('Error processing series:', error);
      throw error;
    }
  };

  // Filter existing movies based on search query
  const getFilteredMovies = () => {
    if (!existingMoviesFilter) return existingMovies;
    
    const filter = existingMoviesFilter.toLowerCase();
    return existingMovies.filter(movie => 
      movie.title?.toLowerCase().includes(filter) ||
      movie.genre?.some((g: string) => g.toLowerCase().includes(filter)) ||
      movie.director?.toLowerCase().includes(filter) ||
      movie.release_year?.toString().includes(filter)
    );
  };

  // Filter existing series based on search query
  const getFilteredSeries = () => {
    if (!existingSeriesFilter) return existingSeriesList;
    
    const filter = existingSeriesFilter.toLowerCase();
    return existingSeriesList.filter(series => 
      series.title?.toLowerCase().includes(filter) ||
      series.genre?.some((g: string) => g.toLowerCase().includes(filter)) ||
      series.release_year?.toString().includes(filter)
    );
  };

  // Process a single movie from the bulk import component
  const processSelectedMovie = async (movie: any): Promise<void> => {
    try {
      // This function should be similar to processMovie but adapted for the bulk import format
      const movieDetails = await fetchMovieDetails(movie.id);
      
      // Format date if it exists
      let releaseDate = '';
      if (movie.release_date) {
        const date = new Date(movie.release_date);
        releaseDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      // Extract cast and director information
      let director = '';
      let cast: string[] = [];
      
      if (movieDetails.credits) {
        if (movieDetails.credits.crew) {
          const directors = movieDetails.credits.crew.filter((person: any) => person.job === 'Director');
          if (directors.length > 0) {
            director = directors.map((director: any) => director.name).join(', ');
          }
        }
        
        if (movieDetails.credits.cast) {
          cast = movieDetails.credits.cast.slice(0, 10).map((actor: any) => actor.name);
        }
      }
      
      // Map genre IDs to names
      let genres: string[] = [];
      if (movie.genre_ids && movie.genre_ids.length > 0) {
        genres = movie.genre_ids.map((id: number) => genreMap[id] || '').filter(Boolean);
      }
      
      // Extract movie duration
      let duration = '';
      if (movieDetails.runtime) {
        const hours = Math.floor(movieDetails.runtime / 60);
        const minutes = movieDetails.runtime % 60;
        duration = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
      }
      
      // Extract video URL if available
      let videoUrl = null;
      if (movieDetails.videos && movieDetails.videos.results) {
        const trailers = movieDetails.videos.results.filter(
          (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
        );
        if (trailers.length > 0) {
          videoUrl = `https://www.youtube.com/watch?v=${trailers[0].key}`;
        }
      }
      
      // Extract country data
      let countries: string[] = [];
      if (movieDetails.production_countries && movieDetails.production_countries.length > 0) {
        countries = movieDetails.production_countries.map((country: any) => country.name);
      }
      
      // Extract provider data if available
      let providers: string[] = [];
      if (movieDetails["watch/providers"] && movieDetails["watch/providers"].results) {
        // Use US providers as default, fall back to any available region
        const regions = Object.keys(movieDetails["watch/providers"].results);
        const preferredRegion = regions.includes('US') ? 'US' : (regions.length > 0 ? regions[0] : null);
        
        if (preferredRegion) {
          const regionData = movieDetails["watch/providers"].results[preferredRegion];
          
          // Extract providers from various categories (flatrate, buy, rent)
          if (regionData.flatrate) {
            providers = providers.concat(regionData.flatrate.map((p: any) => p.provider_name));
          }
          if (regionData.buy) {
            providers = providers.concat(regionData.buy.map((p: any) => p.provider_name));
          }
          if (regionData.rent) {
            providers = providers.concat(regionData.rent.map((p: any) => p.provider_name));
          }
          
          // Remove duplicates
          providers = [...new Set(providers)];
        }
      }
      
      // Prepare data to insert into Supabase
      const movieData: any = {
        tmdb_id: movie.id,
        title: movie.title,
        description: movie.overview,
        poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}` : null,
        backdrop_url: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${movie.backdrop_path}` : null,
        thumbnail_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w300${movie.poster_path}` : null,
        video_url: videoUrl,
        rating: movie.vote_average || 0,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear(),
        duration: duration,
        genre: genres,
        director: director,
        movie_cast: cast,
        country: countries,
        provider: providers,
        status: 'pending'
      };
      
      // Insert into Supabase
      const { error } = await supabase.from('movies').insert(movieData);
      
      if (error) throw error;
      
      console.log(`Movie "${movie.title}" added successfully!`);
    } catch (error: any) {
      console.error(`Error processing movie "${movie.title}":`, error);
      throw error;
    }
  };

  // Delete all movies from database
  const deleteAllMovies = async () => {
    if (!confirm('PERINGATAN: Anda yakin ingin MENGHAPUS SEMUA FILM dari database? Tindakan ini tidak dapat dibatalkan!')) {
      return;
    }
    
    // Konfirmasi kedua untuk mencegah penghapusan tidak disengaja
    if (!confirm('KONFIRMASI TERAKHIR: Semua film akan dihapus secara permanen. Lanjutkan?')) {
      return;
    }
    
    setIsUpdating(true);
    setUpdateType('movies');
    setMessage({ text: 'Memulai proses penghapusan semua film...', type: 'info' });
    
    try {
      // 1. Hapus subtitles terlebih dahulu (jika ada)
      try {
        const { error: subtitlesError } = await supabase
          .from('subtitles')
          .delete()
          .filter('movie_id', 'not.is', null);
          
        if (subtitlesError) {
          console.warn('Error menghapus subtitles:', subtitlesError);
        }
      } catch (err) {
        console.warn('Error saat menghapus subtitles:', err);
      }
      
      // 2. Hapus user_movies (daftar favorit pengguna)
      try {
        const { error: userMoviesError } = await supabase
          .from('user_movies')
          .delete()
          .filter('movie_id', 'not.is', null);
          
        if (userMoviesError) {
          console.warn('Error menghapus user_movies:', userMoviesError);
        }
      } catch (err) {
        console.warn('Error saat menghapus user_movies:', err);
      }
      
      // 3. Hapus watchlist jika ada
      try {
        const { error: watchlistError } = await supabase
          .from('watchlist')
          .delete()
          .filter('movie_id', 'not.is', null);
          
        if (watchlistError) {
          console.warn('Error menghapus watchlist:', watchlistError);
        }
      } catch (err) {
        console.warn('Error saat menghapus watchlist:', err);
      }
      
      // 4. Hapus watch_history jika ada
      try {
        const { error: historyError } = await supabase
          .from('watch_history')
          .delete()
          .filter('movie_id', 'not.is', null);
          
        if (historyError) {
          console.warn('Error menghapus watch_history:', historyError);
        }
      } catch (err) {
        console.warn('Error saat menghapus watch_history:', err);
      }
      
      // 5. Hapus movie_sources
      const { error: sourceError } = await supabase
        .from('movie_sources')
        .delete()
        .filter('id', 'not.is', null);
      
      if (sourceError) {
        console.error('Error menghapus movie_sources:', sourceError);
      }
      
      // 6. Akhirnya hapus semua film
      const { error } = await supabase
        .from('movies')
        .delete()
        .filter('id', 'not.is', null);
      
      if (error) throw error;
      
      setMessage({ 
        text: 'Semua film berhasil dihapus dari database', 
        type: 'success' 
      });
      
      // Refresh data
      setExistingMovies([]);
      
      // Add timeout to clear the message after 5 seconds
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
      
    } catch (error: any) {
      console.error('Error menghapus film:', error);
      setMessage({
        text: `Error menghapus film: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Delete all series from database
  const deleteAllSeries = async () => {
    if (!confirm('PERINGATAN: Anda yakin ingin MENGHAPUS SEMUA SERIAL TV dari database? Tindakan ini tidak dapat dibatalkan!')) {
      return;
    }
    
    // Konfirmasi kedua untuk mencegah penghapusan tidak disengaja
    if (!confirm('KONFIRMASI TERAKHIR: Semua serial TV akan dihapus secara permanen. Lanjutkan?')) {
      return;
    }
    
    setIsUpdating(true);
    setUpdateType('series');
    setMessage({ text: 'Memulai proses penghapusan semua serial TV...', type: 'info' });
    
    try {
      // 1. Hapus subtitles untuk episodes terlebih dahulu (jika ada)
      try {
        const { error: subtitlesError } = await supabase
          .from('subtitles')
          .delete()
          .filter('movie_id', 'not.is', null);
          
        if (subtitlesError) {
          console.warn('Error menghapus subtitles untuk episodes:', subtitlesError);
        }
      } catch (err) {
        console.warn('Error saat menghapus subtitles untuk episodes:', err);
      }
      
      // 2. Hapus watchlist/watch_history untuk episodes (jika ada)
      try {
        const { error: watchlistError } = await supabase
          .from('watchlist')
          .delete()
          .filter('movie_id', 'not.is', null);
          
        if (watchlistError) {
          console.warn('Error menghapus watchlist untuk episodes:', watchlistError);
        }
      } catch (err) {
        console.warn('Error saat menghapus watchlist untuk episodes:', err);
      }
      
      // 3. Menghapus semua episode
      const { error: episodesError } = await supabase
        .from('episodes')
        .delete()
        .filter('id', 'not.is', null);
      
      if (episodesError) throw episodesError;
      
      // 4. Menghapus semua serial dari database
      const { error } = await supabase
        .from('series')
        .delete()
        .filter('id', 'not.is', null);
      
      if (error) throw error;
      
      setMessage({ 
        text: 'Semua serial TV berhasil dihapus dari database', 
        type: 'success' 
      });
      
      // Refresh data
      setExistingSeriesList([]);
      
      // Add timeout to clear the message after 5 seconds
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
      
    } catch (error: any) {
      console.error('Error menghapus serial TV:', error);
      setMessage({
        text: `Error menghapus serial TV: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Add new useEffect for trending movies
  useEffect(() => {
    if (activeTab === 'manageTrending') {
      fetchTrendingMovies();
    }
  }, [activeTab]);
  
  // Fetch current trending movies
  const fetchTrendingMovies = async () => {
    setIsFetchingTrending(true);
    try {
      // Get all trending movies
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .filter('is_trending', 'eq', true)
        .order('popularity', { ascending: false });
      
      if (error) throw error;
      
      setTrendingMovies(data || []);
      setSelectedTrendingMovies(data?.map(movie => movie.id) || []);
    } catch (error: any) {
      console.error('Error fetching trending movies:', error);
      setMessage({ text: 'Error fetching trending movies', type: 'error' });
    } finally {
      setIsFetchingTrending(false);
    }
  };
  
  // Set a movie as trending
  const setMovieAsTrending = async (movieId: string, isTrending: boolean) => {
    try {
      const { error } = await supabase
        .from('movies')
        .update({ is_trending: isTrending })
        .eq('id', movieId);
      
      if (error) throw error;
      
      // Update local state
      if (isTrending) {
        setSelectedTrendingMovies(prev => [...prev, movieId]);
      } else {
        setSelectedTrendingMovies(prev => prev.filter(id => id !== movieId));
      }
      
      // Fetch trending movies again if we're in trending tab
      if (activeTab === 'manageTrending') {
        fetchTrendingMovies();
      }
      
      setMessage({ 
        text: `Movie ${isTrending ? 'added to' : 'removed from'} trending successfully`,
        type: 'success' 
      });
    } catch (error: any) {
      console.error('Error updating movie trending status:', error);
      setMessage({ text: 'Error updating trending status', type: 'error' });
    }
  };
  
  // Toggle a movie's trending status
  const toggleTrendingStatus = async (movieId: string) => {
    const isTrending = !selectedTrendingMovies.includes(movieId);
    await setMovieAsTrending(movieId, isTrending);
  };
  
  // Bulk update trending movies based on selection
  const updateTrendingMovies = async () => {
    setIsUpdatingTrending(true);
    try {
      // Get all current movies
      const { data: allMovies, error: fetchError } = await supabase
        .from('movies')
        .select('id, is_trending');
      
      if (fetchError) throw fetchError;
      
      // For each movie, update its trending status if it differs from current
      for (const movie of allMovies || []) {
        const shouldBeTrending = selectedTrendingMovies.includes(movie.id);
        if (movie.is_trending !== shouldBeTrending) {
          const { error } = await supabase
            .from('movies')
            .update({ is_trending: shouldBeTrending })
            .eq('id', movie.id);
          
          if (error) throw error;
        }
      }
      
      setMessage({ text: 'Trending movies updated successfully', type: 'success' });
      fetchTrendingMovies();
    } catch (error: any) {
      console.error('Error bulk updating trending movies:', error);
      setMessage({ text: 'Error updating trending movies', type: 'error' });
    } finally {
      setIsUpdatingTrending(false);
    }
  };
  
  // Recalculate popularity for all movies
  const recalculateAllPopularity = async () => {
    setIsRecalculatingPopularity(true);
    try {
      const { error } = await supabase.rpc('recalculate_all_movie_popularity');
      
      if (error) throw error;
      
      setMessage({ text: 'Popularity recalculated for all movies', type: 'success' });
      fetchTrendingMovies();
      fetchExistingMovies();
    } catch (error: any) {
      console.error('Error recalculating popularity:', error);
      setMessage({ text: 'Error recalculating popularity', type: 'error' });
    } finally {
      setIsRecalculatingPopularity(false);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      
      {/* Admin navigation tabs */}
      <div className="flex flex-wrap mb-6 border-b border-gray-700">
        <button
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'searchMovies' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('searchMovies')}
        >
          Search Movies
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'existingMovies' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => {fetchExistingMovies(); setActiveTab('existingMovies')}}
        >
          Existing Movies
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'bulkImportMovies' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('bulkImportMovies')}
        >
          Bulk Import Movies
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'searchSeries' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('searchSeries')}
        >
          Search Series
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'existingSeries' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => {fetchExistingSeries(); setActiveTab('existingSeries')}}
        >
          Existing Series
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'bulkImportSeries' ? 'bg-blue-600' : 'bg-gray-700'}`}
          onClick={() => setActiveTab('bulkImportSeries')}
        >
          Bulk Import Series
        </button>
        <button
          onClick={() => setActiveTab('manageTrending')}
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'manageTrending' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Manage Trending
        </button>
      </div>

      {/* Search Movies Tab */}
      {activeTab === 'searchMovies' && (
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Search Movies</h2>
          
          <form onSubmit={searchMovies} className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter movie title..."
                className="flex-grow bg-gray-800 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSearching ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <FaSearch className="mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Selected Movies Section */}
          {selectedMovies.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Selected Movies: {selectedMovies.length}</h3>
                <button
                  onClick={processMovies}
                  disabled={isProcessing}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Processing {currentMovieIndex + 1}/{selectedMovies.length}
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-2" />
                      Add to Database
                    </>
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedMovies.map((movie) => (
                  <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
                    <div className="relative h-40 bg-gray-700">
                      {movie.backdrop_path ? (
                        <img
                          src={`${TMDB_IMAGE_BASE_URL}/w500${movie.backdrop_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <FaFilm className="text-gray-600" size={40} />
                        </div>
                      )}
                      <button
                        onClick={() => toggleMovieSelection(movie)}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <FaTimes size={16} />
                      </button>
                    </div>
                    <div className="p-4 flex-grow">
                      <h3 className="font-semibold text-white truncate">{movie.title}</h3>
                      <p className="text-gray-400 text-sm">
                        {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'} • {movie.vote_average.toFixed(1)}★
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Search Results: {searchResults.length}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((movie) => {
                  const isSelected = selectedMovies.some(m => m.id === movie.id);
                  
                  return (
                    <div key={movie.id} className={`bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition cursor-pointer ${isSelected ? 'ring-2 ring-red-500' : ''}`}>
                      <div className="relative h-40 bg-gray-700">
                        {movie.backdrop_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE_URL}/w500${movie.backdrop_path}`}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <FaFilm className="text-gray-600" size={40} />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition">
                          <button
                            onClick={() => toggleMovieSelection(movie)}
                            className={`p-2 rounded-full ${isSelected ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            {isSelected ? <FaTimes size={24} /> : <FaPlus size={24} />}
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-white truncate">{movie.title}</h3>
                        <p className="text-gray-400 text-sm">
                          {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'} • {movie.vote_average.toFixed(1)}★
                        </p>
                        <div className="mt-2">
                          <p className="text-gray-300 text-sm line-clamp-2">{movie.overview || 'No description available'}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {movie.genre_ids.slice(0, 3).map(genreId => (
                            <span key={genreId} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                              {genreMap[genreId] || 'Unknown'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing Movies Tab */}
      {activeTab === 'existingMovies' && (
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Existing Movies</h2>
          
          {/* Update Database Button dan Erase All */}
          <div className="mb-4">
            <div className="flex space-x-4 mb-2">
              <button
                onClick={updateMoviesDatabase}
                disabled={isUpdating}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
              >
                {isUpdating && updateType === 'movies' ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Updating ({updateProgress.current}/{updateProgress.total})...
                  </>
                ) : (
                  <>
                    <FaDatabase className="mr-2" />
                    Update Movie Database
                  </>
                )}
              </button>
              
              {/* Erase All Movies Button */}
              <button
                onClick={deleteAllMovies}
                disabled={isUpdating || existingMovies.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
              >
                {isUpdating && updateType === 'movies' ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaTrash className="mr-2" />
                    Erase All Movies
                  </>
                )}
              </button>
            </div>
            
            <div className="flex space-x-4">
              <p className="text-xs text-gray-400 w-1/2">
                Updates all movies with the latest information from TMDB and fixes any missing data.
              </p>
              <p className="text-xs text-gray-400 w-1/2 text-red-400">
                Warning: This will permanently delete all movies from the database. This action cannot be undone.
              </p>
            </div>
          </div>
          
          {/* Column Selection for Updates */}
          <div className="mb-4 bg-gray-800 p-4 rounded-lg">
            <h3 className="text-md font-medium mb-2">Fields to Update:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.title}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, title: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Title</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.description}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, description: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Description</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.poster_url}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, poster_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Poster</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.backdrop_url}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, backdrop_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Backdrop</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.thumbnail_url}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, thumbnail_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Thumbnail</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.video_url}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, video_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Video URL</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.rating}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, rating: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Rating</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.genre}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, genre: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Genre</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.release_year}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, release_year: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Release Year</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.duration}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, duration: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Duration</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.director}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, director: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Director</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.movie_cast}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, movie_cast: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Cast</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.country}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, country: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Country</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={movieColumnsToUpdate.provider}
                  onChange={(e) => setMovieColumnsToUpdate({...movieColumnsToUpdate, provider: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Provider</span>
              </label>
            </div>
            <div className="mt-2 flex space-x-2">
              <button 
                onClick={() => setMovieColumnsToUpdate({
                  title: true, description: true, poster_url: true, backdrop_url: true, 
                  thumbnail_url: true, video_url: true, rating: true, genre: true, 
                  release_year: true, duration: true, director: true, movie_cast: true, 
                  country: true, provider: true
                })}
                className="text-xs text-blue-500 hover:text-blue-400"
              >
                Select All
              </button>
              <button 
                onClick={() => setMovieColumnsToUpdate({
                  title: false, description: false, poster_url: false, backdrop_url: false, 
                  thumbnail_url: false, video_url: false, rating: false, genre: false, 
                  release_year: false, duration: false, director: false, movie_cast: false, 
                  country: false, provider: false
                })}
                className="text-xs text-blue-500 hover:text-blue-400"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex items-center bg-gray-800 rounded-lg overflow-hidden">
              <input
                type="text"
                value={existingMoviesFilter}
                onChange={(e) => setExistingMoviesFilter(e.target.value)}
                placeholder="Search by title, genre, director, or year..."
                className="flex-grow bg-gray-800 text-white px-4 py-2 focus:outline-none"
              />
              {existingMoviesFilter && (
                <button
                  onClick={() => setExistingMoviesFilter('')}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaTimes />
                </button>
              )}
              <div className="p-2 bg-gray-700 text-gray-300">
                <FaSearch />
              </div>
            </div>
          </div>
          
          {isLoadingExisting ? (
            <div className="flex justify-center items-center py-20">
              <FaSpinner className="animate-spin text-gray-400" size={30} />
            </div>
          ) : existingMovies.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FaFilm className="mx-auto mb-4" size={40} />
              <p>No movies in the database yet.</p>
              <p className="mt-2">Use the Search & Import tab to add movies.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-400">
                Showing {getFilteredMovies().length} of {existingMovies.length} movies
                {existingMoviesFilter && (
                  <span> matching "{existingMoviesFilter}"</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredMovies().map((movie) => (
                  <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="relative h-40 bg-gray-700">
                      {movie.backdrop_url ? (
                        <img
                          src={movie.backdrop_url}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <FaFilm className="text-gray-600" size={40} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
                      <div className="absolute bottom-2 left-3">
                        <h3 className="font-semibold text-white">{movie.title}</h3>
                        <p className="text-gray-300 text-sm">
                          {movie.release_year} • {movie.rating.toFixed(1)}★
                        </p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-300 text-sm line-clamp-2 mb-3">{movie.description || 'No description available'}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(movie.genre || []).slice(0, 3).map((genre: string, index: number) => (
                          <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {genre}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => router.push(`/movie/${movie.id}`)}
                          className="text-sm bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => deleteMovie(movie.id)}
                          className="text-sm bg-red-700 text-white p-2 rounded-full hover:bg-red-600"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bulk Import Movies Tab */}
      {activeTab === 'bulkImportMovies' && (
        <BulkImport
          contentType="movies"
          genreMap={genreMap}
          onImportComplete={() => fetchExistingMovies()}
          processMovieFunction={processSelectedMovie}
        />
      )}

      {/* Search Series Tab */}
      {activeTab === 'searchSeries' && (
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Search Series</h2>
          <form onSubmit={searchSeries} className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={seriesQuery}
                onChange={e => setSeriesQuery(e.target.value)}
                placeholder="Enter series name..."
                className="flex-grow bg-gray-800 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                disabled={isSearchingSeries}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSearchingSeries ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <FaSearch className="mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>
          
          {/* Selected Series Section */}
          {selectedSeries.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Selected Series: {selectedSeries.length}</h3>
                <button
                  onClick={processSeries}
                  disabled={isProcessingSeries}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
                >
                  {isProcessingSeries ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Processing {currentSeriesIndex + 1}/{selectedSeries.length}
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-2" />
                      Add to Database
                    </>
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedSeries.map(s => (
                  <div key={s.id} className="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
                    <div className="relative h-40 bg-gray-700">
                      {s.backdrop_path ? (
                        <img
                          src={`${TMDB_IMAGE_BASE_URL}/w500${s.backdrop_path}`}
                          alt={s.name}
                          className="w-full h-full object-cover"
                        />
                      ) : s.poster_path ? (
                        <img
                          src={`${TMDB_IMAGE_BASE_URL}/w500${s.poster_path}`}
                          alt={s.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <FaFilm className="text-gray-600" size={40} />
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedSeries(selectedSeries.filter(sel => sel.id !== s.id))}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <FaTimes size={16} />
                      </button>
                    </div>
                    <div className="p-4 flex-grow">
                      <h3 className="font-semibold text-white truncate">{s.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'Unknown'} • {s.vote_average?.toFixed(1) || 'N/A'}★
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {seriesResults.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Search Results: {seriesResults.length}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {seriesResults.map((s: any) => {
                  const isSel = selectedSeries.some(sel => sel.id === s.id);
                  return (
                    <div key={s.id} className={`bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition cursor-pointer ${isSel ? 'ring-2 ring-red-500' : ''}`}>
                      <div className="relative h-40 bg-gray-700">
                        {s.backdrop_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE_URL}/w500${s.backdrop_path}`}
                            alt={s.name}
                            className="w-full h-full object-cover"
                          />
                        ) : s.poster_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE_URL}/w500${s.poster_path}`}
                            alt={s.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <FaFilm className="text-gray-600" size={40} />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition">
                          <button
                            onClick={() => setSelectedSeries(isSel ? selectedSeries.filter(sel => sel.id !== s.id) : [...selectedSeries, s])}
                            className={`p-2 rounded-full ${isSel ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            {isSel ? <FaTimes size={24} /> : <FaPlus size={24} />}
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-white truncate">{s.name}</h3>
                        <p className="text-gray-400 text-sm">
                          {s.first_air_date ? new Date(s.first_air_date).getFullYear() : 'Unknown'} • {s.vote_average?.toFixed(1) || 'N/A'}★
                        </p>
                        <div className="mt-2">
                          <p className="text-gray-300 text-sm line-clamp-2">{s.overview || 'No description available'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing Series Tab */}
      {activeTab === 'existingSeries' && (
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Existing Series</h2>
          
          {/* Update Database Button dan Erase All */}
          <div className="mb-4">
            <div className="flex space-x-4 mb-2">
              <button
                onClick={updateSeriesDatabase}
                disabled={isUpdating}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
              >
                {isUpdating && updateType === 'series' ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Updating ({updateProgress.current}/{updateProgress.total})...
                  </>
                ) : (
                  <>
                    <FaDatabase className="mr-2" />
                    Update Series Database
                  </>
                )}
              </button>
              
              {/* Erase All Series Button */}
              <button
                onClick={deleteAllSeries}
                disabled={isUpdating || existingSeriesList.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
              >
                {isUpdating && updateType === 'series' ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaTrash className="mr-2" />
                    Erase All Series
                  </>
                )}
              </button>
            </div>
            
            <div className="flex space-x-4">
              <p className="text-xs text-gray-400 w-1/2">
                Updates all series with the latest information from TMDB and adds missing seasons/episodes data.
              </p>
              <p className="text-xs text-gray-400 w-1/2 text-red-400">
                Warning: This will permanently delete all series and episodes from the database. This action cannot be undone.
              </p>
            </div>
          </div>
          
          {/* Column Selection for Series Updates */}
          <div className="mb-4 bg-gray-800 p-4 rounded-lg">
            <h3 className="text-md font-medium mb-2">Fields to Update:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.title}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, title: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Title</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.description}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, description: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Description</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.poster_url}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, poster_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Poster</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.backdrop_url}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, backdrop_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Backdrop</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.thumbnail_url}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, thumbnail_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Thumbnail</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.video_url}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, video_url: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Video URL</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.rating}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, rating: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Rating</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.genre}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, genre: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Genre</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={seriesColumnsToUpdate.country}
                  onChange={(e) => setSeriesColumnsToUpdate({...seriesColumnsToUpdate, country: e.target.checked})}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Country</span>
              </label>
            </div>
            <div className="mt-2 flex space-x-2">
              <button 
                onClick={() => setSeriesColumnsToUpdate({
                  title: true, description: true, poster_url: true, backdrop_url: true, 
                  thumbnail_url: true, video_url: true, rating: true, genre: true, country: true
                })}
                className="text-xs text-blue-500 hover:text-blue-400"
              >
                Select All
              </button>
              <button 
                onClick={() => setSeriesColumnsToUpdate({
                  title: false, description: false, poster_url: false, backdrop_url: false, 
                  thumbnail_url: false, video_url: false, rating: false, genre: false, country: false
                })}
                className="text-xs text-blue-500 hover:text-blue-400"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex items-center bg-gray-800 rounded-lg overflow-hidden">
              <input
                type="text"
                value={existingSeriesFilter}
                onChange={(e) => setExistingSeriesFilter(e.target.value)}
                placeholder="Search by title, genre, or year..."
                className="flex-grow bg-gray-800 text-white px-4 py-2 focus:outline-none"
              />
              {existingSeriesFilter && (
                <button
                  onClick={() => setExistingSeriesFilter('')}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaTimes />
                </button>
              )}
              <div className="p-2 bg-gray-700 text-gray-300">
                <FaSearch />
              </div>
            </div>
          </div>
          
          {existingSeriesList.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FaFilm className="mx-auto mb-4" size={40} />
              <p>No series in the database yet.</p>
              <p className="mt-2">Use the Search Series tab to add TV shows.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-400">
                Showing {getFilteredSeries().length} of {existingSeriesList.length} series
                {existingSeriesFilter && (
                  <span> matching "{existingSeriesFilter}"</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredSeries().map(s => (
                  <div key={s.id} className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="relative h-40 bg-gray-700">
                      {s.backdrop_url ? (
                        <img
                          src={s.backdrop_url}
                          alt={s.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : s.poster_url ? (
                        <img
                          src={s.poster_url}
                          alt={s.title}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <FaFilm className="text-gray-600" size={40} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
                      <div className="absolute bottom-2 left-3">
                        <h3 className="font-semibold text-white">{s.title}</h3>
                        <p className="text-gray-300 text-sm">
                          {s.release_year || 'N/A'} • {(s.rating || 0).toFixed(1)}★
                        </p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-300 text-sm line-clamp-2 mb-3">{s.description || 'No description available'}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(s.genre || []).slice(0, 3).map((genre: string, index: number) => (
                          <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {genre}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => router.push(`/tvshows/${s.tmdb_id}`)}
                          className="text-sm bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600"
                        >
                          View Details
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete "${s.title}"?`)) {
                              try {
                                await deleteSeries(s.id);
                              } catch (err: any) {
                                console.error('Error deleting series:', err);
                                setMessage({ text: 'Failed to delete series', type: 'error' });
                              }
                            }
                          }}
                          className="text-sm bg-red-700 text-white p-2 rounded-full hover:bg-red-600"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bulk Import Series Tab */}
      {activeTab === 'bulkImportSeries' && (
        <BulkImport
          contentType="series"
          genreMap={genreMap}
          onImportComplete={() => fetchExistingSeries()}
          processSeriesFunction={processSelectedSeries}
        />
      )}

      {/* Manage Trending Tab */}
      {activeTab === 'manageTrending' && (
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Manage Trending Movies</h2>
          
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              onClick={fetchTrendingMovies}
              disabled={isFetchingTrending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
            >
              {isFetchingTrending ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <FaSearch className="mr-2" />
                  Refresh Trending Movies
                </>
              )}
            </button>
            
            <button
              onClick={updateTrendingMovies}
              disabled={isUpdatingTrending}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
            >
              {isUpdatingTrending ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <FaCheck className="mr-2" />
                  Update Selection
                </>
              )}
            </button>
            
            <button
              onClick={recalculateAllPopularity}
              disabled={isRecalculatingPopularity}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
            >
              {isRecalculatingPopularity ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Recalculating...
                </>
              ) : (
                <>
                  <FaDatabase className="mr-2" />
                  Recalculate All Popularity
                </>
              )}
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Current Trending Movies</h3>
            <p className="text-sm text-gray-400 mb-4">
              These movies will appear in the "Trending Now" section on the homepage. You can manually add or remove movies, or use the recalculation function to automatically update based on views, ratings, and recency.
            </p>
            
            {isFetchingTrending ? (
              <div className="flex justify-center items-center py-20">
                <FaSpinner className="animate-spin text-gray-400" size={30} />
              </div>
            ) : trendingMovies.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-800 rounded-lg">
                <p>No trending movies selected.</p>
                <p className="mt-2">Use the search below to add movies to trending.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingMovies.map((movie) => (
                  <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="relative h-40 bg-gray-700">
                      {movie.backdrop_url ? (
                        <img
                          src={movie.backdrop_url}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <FaFilm className="text-gray-600" size={40} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
                      <div className="absolute bottom-2 left-3">
                        <h3 className="font-semibold text-white">{movie.title}</h3>
                        <p className="text-gray-300 text-sm">
                          {movie.release_year} • {movie.rating?.toFixed(1)}★ • Popularity: {movie.popularity?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end">
                      <button
                        onClick={() => toggleTrendingStatus(movie.id)}
                        className="text-sm bg-red-700 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center"
                      >
                        <FaTimes size={12} className="mr-1" /> Remove from Trending
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">Add Movies to Trending</h3>
            <div className="mb-4">
              <input
                type="text"
                value={existingMoviesFilter}
                onChange={(e) => setExistingMoviesFilter(e.target.value)}
                placeholder="Search movies to add to trending..."
                className="w-full bg-gray-800 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            {isLoadingExisting ? (
              <div className="flex justify-center items-center py-20">
                <FaSpinner className="animate-spin text-gray-400" size={30} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {getFilteredMovies()
                  .filter(movie => !selectedTrendingMovies.includes(movie.id))
                  .slice(0, 12)
                  .map((movie) => (
                    <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden">
                      <div className="relative h-40 bg-gray-700">
                        {movie.backdrop_url ? (
                          <img
                            src={movie.backdrop_url}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <FaFilm className="text-gray-600" size={40} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
                        <div className="absolute bottom-2 left-3">
                          <h3 className="font-semibold text-white">{movie.title}</h3>
                          <p className="text-gray-300 text-sm">
                            {movie.release_year} • {movie.rating?.toFixed(1)}★ • Popularity: {movie.popularity?.toFixed(2) || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 flex justify-end">
                        <button
                          onClick={() => toggleTrendingStatus(movie.id)}
                          className="text-sm bg-green-700 text-white px-3 py-1 rounded hover:bg-green-600 flex items-center"
                        >
                          <FaPlus size={12} className="mr-1" /> Add to Trending
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            
            {getFilteredMovies().filter(movie => !selectedTrendingMovies.includes(movie.id)).length > 12 && (
              <div className="text-center mt-4 text-gray-400">
                <p>Showing 12 of {getFilteredMovies().filter(movie => !selectedTrendingMovies.includes(movie.id)).length} movies. Refine your search to see more results.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {(isProcessing || isProcessingSeries) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {isProcessing ? 'Processing Movies' : 'Processing Series'}
            </h3>
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full" 
                  style={{ 
                    width: `${isProcessing 
                      ? ((currentMovieIndex + 1) / selectedMovies.length) * 100
                      : ((currentSeriesIndex + 1) / selectedSeries.length) * 100
                    }%` 
                  }}
                ></div>
              </div>
            </div>
            <p className="text-center">
              {isProcessing 
                ? `Processing ${currentMovieIndex + 1} of ${selectedMovies.length} movies`
                : `Processing ${currentSeriesIndex + 1} of ${selectedSeries.length} series`
              }
            </p>
          </div>
        </div>
      )}

      {/* Database update indicator */}
      {isUpdating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Updating {updateType === 'movies' ? 'Movies' : 'Series'} Database
            </h3>
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ 
                    width: `${(updateProgress.current / updateProgress.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
            <p className="text-center">
              Processing {updateProgress.current} of {updateProgress.total} {updateType}
            </p>
          </div>
        </div>
      )}
      
      {/* Notification message */}
      {message.text && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg max-w-md z-50 ${
          message.type === 'error' ? 'bg-red-600' : 
          message.type === 'success' ? 'bg-green-600' : 
          message.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
} 