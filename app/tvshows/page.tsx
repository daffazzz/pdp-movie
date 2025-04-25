"use client";

import { useState, useEffect } from 'react';
import MovieRow from '../components/MovieRow';
import { supabase } from '../../lib/supabaseClient';
import Hero from '../components/Hero';
import GenreMenu from '../components/GenreMenu';
import { FaRandom } from 'react-icons/fa';

// Genres untuk series
const genres = [
  { id: 'drama', name: 'Drama' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'action', name: 'Action' },
  { id: 'sci-fi', name: 'Sci-Fi' },
  { id: 'thriller', name: 'Thriller' },
  { id: 'crime', name: 'Crime' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'acara-tv-asia', name: 'Acara TV Asia Tenggara' },
  { id: 'amerika', name: 'Amerika' },
  { id: 'anak', name: 'Anak' },
  { id: 'anime', name: 'Anime' },
  { id: 'bulan-bumi', name: 'Bulan Bumi' },
  { id: 'drama-korea', name: 'Drama Korea' },
  { id: 'fiksi-ilmiah', name: 'Fiksi Ilmiah & Fantasi' },
  { id: 'horor', name: 'Horor' },
  { id: 'inggris', name: 'Inggris' },
  { id: 'kisah-cinta', name: 'Kisah Cinta' },
  { id: 'kriminal', name: 'Kriminal' },
  { id: 'laga', name: 'Laga' },
  { id: 'olahraga', name: 'Olahraga' },
  { id: 'reality-show', name: 'Reality & Talk Show' },
  { id: 'remaja', name: 'Remaja' },
  { id: 'sains-alam', name: 'Sains & Alam' },
  { id: 'serial-dokumenter', name: 'Serial Dokumenter' },
  { id: 'tiongkok', name: 'Tiongkok' },
];

// Function to select a featured series (highest rated with backdrop)
const selectFeaturedSeries = (seriesList: any[]) => {
  if (!seriesList || seriesList.length === 0) return null;
  
  // Filter series with backdrop images
  const seriesWithBackdrops = seriesList.filter(series => 
    series.backdrop_url && series.backdrop_url.trim() !== ''
  );
  
  if (seriesWithBackdrops.length === 0) return null;
  
  // Sort by rating (highest first)
  const sortedSeries = [...seriesWithBackdrops].sort((a, b) => b.rating - a.rating);
  
  // Return one of the top 5 series randomly
  const topSeries = sortedSeries.slice(0, 5);
  const randomIndex = Math.floor(Math.random() * topSeries.length);
  return topSeries[randomIndex];
};

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

interface FeaturedContent {
  id: string;
  title: string;
  overview: string;
  backdrop_url: string;
  contentType: 'movie' | 'tvshow';
  tmdb_id?: number;
}

export default function TVShowsPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [series, setSeries] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredSeries, setFeaturedSeries] = useState<FeaturedContent | null>(null);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Function to refresh the featured content
  const refreshFeaturedContent = () => {
    if (allSeries.length === 0) return;
    
    setRefreshing(true);
    
    // Get current content ID to avoid selecting the same one
    const currentId = featuredSeries?.id;
    
    // Filter to only series with backdrop images
    const seriesWithBackdrops = allSeries.filter(item => 
      item.backdrop_url && item.backdrop_url.trim() !== ''
    );
    
    if (seriesWithBackdrops.length === 0) {
      setRefreshing(false);
      return;
    }
    
    // Try to find different content
    let attempts = 0;
    let randomSeries;
    
    do {
      const randomIndex = Math.floor(Math.random() * seriesWithBackdrops.length);
      randomSeries = seriesWithBackdrops[randomIndex];
      attempts++;
    } while (
      randomSeries && 
      currentId && 
      randomSeries.id === currentId && 
      attempts < 5
    );
    
    if (randomSeries) {
      setFeaturedSeries({
        id: randomSeries.id,
        title: randomSeries.title,
        overview: randomSeries.description || 'No description available',
        backdrop_url: randomSeries.backdrop_url,
        contentType: 'tvshow',
        tmdb_id: randomSeries.tmdb_id
      });
    }
    
    setTimeout(() => setRefreshing(false), 600);
  };
  
  useEffect(() => {
    const fetchSeries = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if Supabase client is available
        if (!supabase) {
          console.error('Supabase client is not initialized');
          setError('Database connection is not available. Please check your internet connection.');
          setIsLoading(false);
          return;
        }
        
        // Fetch all series
        const { data: allSeriesData, error } = await (supabase as NonNullable<typeof supabase>)
          .from('series')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }

        // Store all series for featured content refresh
        setAllSeries(allSeriesData || []);
        
        // Set featured series
        const featured = selectFeaturedSeries(allSeriesData || []);
        if (featured) {
          setFeaturedSeries({
            id: featured.id,
            title: featured.title,
            overview: featured.description || 'No description available',
            backdrop_url: featured.backdrop_url,
            contentType: 'tvshow',
            tmdb_id: featured.tmdb_id
          });
        }

        // Format series for display
        const formatSeries = (seriesList: any[]) => {
          return seriesList.map(show => ({
            id: show.id,
            title: show.title,
            thumbnail_url: show.poster_url || show.thumbnail_url,
            rating: show.rating,
            tmdb_id: show.tmdb_id
          }));
        };

        // Group series by genre
        const seriesMap: Record<string, any[]> = {};
        
        // Add the all series category
        seriesMap['all'] = formatSeries(allSeriesData || []);
        
        // Group by genre
        genres.forEach(genre => {
          const genreName = genre.name;
          const genreSeries = allSeriesData?.filter(show => {
            // Match genre with more flexibility
            if (!show.genre) return false;
            
            // Convert both to lowercase for case-insensitive comparison
            const showGenres = show.genre.map((g: string) => g.toLowerCase());
            const currentGenre = genreName.toLowerCase();
            
            // Special case handling
            if (genre.id === 'sci-fi' || genre.id === 'fiksi-ilmiah') {
              return showGenres.some((g: string) => 
                g.includes('sci-fi') || 
                g.includes('science fiction') || 
                g.includes('fiksi ilmiah') || 
                g.includes('fantasi')
              );
            }
            
            // For other genres, check if any genre includes the current genre name
            return showGenres.some((g: string) => g.includes(currentGenre) || currentGenre.includes(g));
          }) || [];
          
          seriesMap[genre.id] = formatSeries(genreSeries);
        });
        
        // Add popular category based on rating
        const popularSeries = [...(allSeriesData || [])]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 20);
        seriesMap['popular'] = formatSeries(popularSeries);
        
        // Add recent category
        const recentSeries = [...(allSeriesData || [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20);
        seriesMap['recent'] = formatSeries(recentSeries);
        
        setSeries(seriesMap);
      } catch (err: any) {
        console.error('Error fetching series:', err);
        setError(err.message || 'An error occurred while fetching series');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeries();
  }, []);
  
  return (
    <div className="relative pt-0 bg-gray-900">
      {/* Hero Section */}
      {featuredSeries && (
        <div className="relative">
          <Hero 
            title={featuredSeries.title}
            overview={featuredSeries.overview}
            backdrop_url={featuredSeries.backdrop_url}
            id={featuredSeries.id}
            contentType="tvshow"
            tmdb_id={featuredSeries.tmdb_id}
          />
          
          {/* Refresh button */}
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing}
            className={`absolute top-4 right-4 z-[60] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition ${
              refreshing ? 'animate-spin' : ''
            }`}
            aria-label="Show different featured series"
          >
            <FaRandom size={18} />
          </button>
        </div>
      )}
      
      {/* Content Area - dengan margin top negative untuk menaikkan konten */}
      <div className="relative z-[90] w-full max-w-full mx-auto px-3 md:px-8 mt-[-25vh] movie-row-container">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl md:text-3xl font-bold">TV Shows</h1>
          
          {/* Genre dropdown */}
          <GenreMenu 
            genres={genres}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
          />
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-md mb-4">
            <p>Error: {error}</p>
            <p className="text-sm mt-1">Please try refreshing the page.</p>
          </div>
        )}
        
        {/* Series listings */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Always show popular and recent categories */}
            {selectedGenre === null && (
              <>
                {series['popular']?.length > 0 && (
                  <MovieRow 
                    title="Popular TV Shows"
                    movies={series['popular']}
                    contentType="tvshow"
                  />
                )}
                
                {series['recent']?.length > 0 && (
                  <MovieRow 
                    title="Recently Added"
                    movies={series['recent']}
                    contentType="tvshow"
                  />
                )}
                
                {/* Show all genres */}
                {genres.map((genre) => (
                  series[genre.id] && series[genre.id].length > 0 && (
                    <MovieRow 
                      key={genre.id} 
                      title={genre.name} 
                      movies={series[genre.id]}
                      contentType="tvshow"
                    />
                  )
                ))}
              </>
            )}
            
            {/* Show series for selected genre */}
            {selectedGenre && series[selectedGenre] && (
              series[selectedGenre].length > 0 ? (
                <MovieRow 
                  title={genres.find(g => g.id === selectedGenre)?.name || selectedGenre} 
                  movies={series[selectedGenre]}
                  contentType="tvshow"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No TV shows available for this genre yet.</p>
                </div>
              )
            )}
            
            {/* Message when no series are available */}
            {Object.values(series).every(arr => arr.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">No TV shows available yet.</p>
                <p className="text-gray-500">Add some TV shows from the Admin Panel.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 