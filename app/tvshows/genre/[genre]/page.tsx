"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import Hero from '../../../components/Hero';
import GenreMenu from '../../../components/GenreMenu';
import GenreRecommendations from '../../../components/GenreRecommendations';
import { FaRandom } from 'react-icons/fa';

interface FeaturedContent {
  id: string;
  title: string;
  overview: string;
  backdrop_url: string;
  poster_url?: string;
  contentType: 'movie' | 'tvshow';
}

interface Genre {
  id: string;
  name: string;
}

// Function to select a featured TV show (highest rated with backdrop)
const selectFeaturedTVShow = (tvShowsList: any[]) => {
  if (!tvShowsList || tvShowsList.length === 0) return null;
  
  // Filter TV shows with backdrop images
  const tvShowsWithBackdrops = tvShowsList.filter(tvshow => 
    tvshow.backdrop_url && tvshow.backdrop_url.trim() !== ''
  );
  
  if (tvShowsWithBackdrops.length === 0) return null;
  
  // Sort by rating (highest first)
  const sortedTVShows = [...tvShowsWithBackdrops].sort((a, b) => b.rating - a.rating);
  
  // Return one of the top 5 TV shows randomly
  const topTVShows = sortedTVShows.slice(0, 5);
  const randomIndex = Math.floor(Math.random() * topTVShows.length);
  return topTVShows[randomIndex];
};

export default function GenreTVShowsPage() {
  const params = useParams();
  const genreId = params?.genre as string;
  
  const [selectedGenre, setSelectedGenre] = useState<string | null>(genreId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredTVShow, setFeaturedTVShow] = useState<FeaturedContent | null>(null);
  const [allTVShows, setAllTVShows] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  // Function to refresh the featured content
  const refreshFeaturedContent = () => {
    if (allTVShows.length === 0) return;
    
    setRefreshing(true);
    
    // Get current content ID to avoid selecting the same one
    const currentId = featuredTVShow?.id;
    
    // Filter to only TV shows with backdrop images
    const tvShowsWithBackdrops = allTVShows.filter(item => 
      item.backdrop_url && item.backdrop_url.trim() !== ''
    );
    
    if (tvShowsWithBackdrops.length === 0) {
      setRefreshing(false);
      return;
    }
    
    // Try to find different content
    let attempts = 0;
    let randomTVShow;
    
    do {
      const randomIndex = Math.floor(Math.random() * tvShowsWithBackdrops.length);
      randomTVShow = tvShowsWithBackdrops[randomIndex];
      attempts++;
    } while (
      randomTVShow && 
      currentId && 
      randomTVShow.id === currentId && 
      attempts < 5
    );
    
    if (randomTVShow) {
      setFeaturedTVShow({
        id: randomTVShow.id,
        title: randomTVShow.title,
        overview: randomTVShow.description || randomTVShow.overview || 'No description available',
        backdrop_url: randomTVShow.backdrop_url,
        poster_url: randomTVShow.poster_url,
        contentType: 'tvshow'
      });
    }
    
    setTimeout(() => setRefreshing(false), 600);
  };
  
  // Extract unique genres from the database
  const extractGenresFromTVShows = (tvShowsData: any[]): Genre[] => {
    const genreSet = new Set<string>();
    
    // Collect all unique genres
    tvShowsData.forEach(tvshow => {
      if (tvshow.genre) {
        if (Array.isArray(tvshow.genre)) {
          tvshow.genre.forEach((g: string) => {
            const genre = g.trim();
            
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
            } else if (genre.toLowerCase() === 'sci-fi & fantasy') {
              genreSet.add('Sci-Fi');
              genreSet.add('Fantasy');
            } else if (genre.toLowerCase() === 'science fiction') {
              genreSet.add('Sci-Fi');
            } else {
              genreSet.add(genre);
            }
          });
        } else if (typeof tvshow.genre === 'string') {
          tvshow.genre.split(',').forEach((g: string) => {
            const genre = g.trim();
            
            if (genre.toLowerCase() === 'action & adventure') {
              genreSet.add('Action');
              genreSet.add('Adventure');
            } else if (genre.toLowerCase() === 'sci-fi & fantasy') {
              genreSet.add('Sci-Fi');
              genreSet.add('Fantasy');
            } else if (genre.toLowerCase() === 'science fiction') {
              genreSet.add('Sci-Fi');
            } else {
              genreSet.add(genre);
            }
          });
        }
      }
    });
    
    // Convert to array and format as Genre objects with id and name
    return Array.from(genreSet)
      .filter(genre => genre) // Filter out empty strings
      .sort() // Sort alphabetically
      .map(genre => {
        // Normalize ID for special genres
        let genreId;
        if (genre === "Science Fiction" || genre === "Sci-Fi") {
          genreId = "sci-fi";
        } else {
          genreId = genre.toLowerCase().replace(/[\s&]+/g, '-'); // Convert to lowercase and handle ampersands
        }
        return {
          id: genreId,
          name: genre // Keep original name for display
        };
      });
  };
  
  useEffect(() => {
    const fetchTVShowsByGenre = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if Supabase client is available
        if (!supabase) {
          throw new Error('Supabase client is not initialized. Check your environment variables.');
        }
        
        // Use a non-null assertion since we've checked above
        const { data: allTVShowsData, error } = await (supabase as NonNullable<typeof supabase>)
          .from('series')
          .select('*')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'eq', '')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }

        // Store all TV shows for featured content refresh
        setAllTVShows(allTVShowsData || []);
        
        // Extract genres from the database
        const extractedGenres = extractGenresFromTVShows(allTVShowsData || []);
        setGenres(extractedGenres);
        
        // Normalize genre ID for consistency
        let normalizedGenreId = genreId;
        if (normalizedGenreId === 'science-fiction') {
          normalizedGenreId = 'sci-fi';
        }
        
        // Filter TV shows by selected genre
        let currentGenre = extractedGenres.find(g => g.id === normalizedGenreId);
        
        // Special handling for sci-fi variations in URL
        if (!currentGenre && normalizedGenreId === 'sci-fi') {
          currentGenre = extractedGenres.find(g => 
            g.id === 'sci-fi' || 
            g.name === 'Science Fiction' || 
            g.name === 'Sci-Fi'
          );
        }
        
        if (!currentGenre) {
          throw new Error(`Genre ${genreId} not found`);
        }
        
        // Update selected genre to the normalized version for consistency
        setSelectedGenre(normalizedGenreId);
        
        // Filter TV shows by genre
        const genreTVShows = allTVShowsData?.filter(tvshow => {
          if (!tvshow.genre) return false;
          
          // Convert to array if it's not already
          const tvshowGenres = Array.isArray(tvshow.genre) 
            ? tvshow.genre 
            : tvshow.genre.split(',').map((g: string) => g.trim());
          
          // More flexible matching for special genres like Sci-Fi
          return tvshowGenres.some((g: string) => {
            const trimmedGenre = g.trim();
            
            if (currentGenre.name === 'Sci-Fi') {
              // Match both "Sci-Fi", "Science Fiction", and "Sci-Fi & Fantasy"
              return (
                trimmedGenre.toLowerCase() === 'sci-fi' || 
                trimmedGenre.toLowerCase() === 'science fiction' || 
                trimmedGenre.toLowerCase().includes('sci-fi')
              );
            }
            
            // Default case: direct genre name matching
            return trimmedGenre === currentGenre.name;
          });
        }) || [];
        
        // Set featured TV show from the genre
        const featured = selectFeaturedTVShow(genreTVShows);
        if (featured) {
          setFeaturedTVShow({
            id: featured.id,
            title: featured.title,
            overview: featured.description || featured.overview || 'No description available',
            backdrop_url: featured.backdrop_url,
            poster_url: featured.poster_url,
            contentType: 'tvshow'
          });
        }
      } catch (err: any) {
        console.error('Error fetching TV shows:', err);
        setError(err.message || 'An error occurred while fetching TV shows');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTVShowsByGenre();
  }, [genreId]);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        <Hero 
          id={featuredTVShow?.id}
          title={featuredTVShow?.title}
          overview={featuredTVShow?.overview}
          backdrop_url={featuredTVShow?.backdrop_url}
          poster_url={featuredTVShow?.poster_url}
          contentType="tvshow"
        />
        
        {/* Refresh button - only show when content is loaded */}
        {featuredTVShow && (
          <button
            onClick={refreshFeaturedContent}
            disabled={refreshing || isLoading}
            className="absolute top-24 right-4 z-[20] bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full transition-all"
            title="Show different TV show"
            aria-label="Show different TV show"
          >
            <FaRandom size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      
      {/* Main Content */}
      <div className="relative z-[40] w-full max-w-full mx-auto px-2 md:px-4 mt-[-30vh]">
        {/* Genre Menu - Dropdown at top right */}
        <div className="mb-6 flex justify-end relative z-[80]">
          <div className="bg-gray-800 bg-opacity-70 backdrop-blur-md rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white whitespace-nowrap">Genre:</h3>
              <GenreMenu 
                genres={genres} 
                selectedGenre={selectedGenre} 
                onSelectGenre={setSelectedGenre} 
                horizontal={false}
                useRouting={true}
                contentType="tvshow"
              />
            </div>
          </div>
        </div>
        
        {/* TV Show Content */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 text-red-200 px-4 py-3 rounded-lg">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Genre Recommendations - Enhanced to always include Netflix content for each genre */}
              <GenreRecommendations 
                selectedGenre={genreId} 
                contentType="tvshow" 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
