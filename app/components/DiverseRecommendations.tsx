"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import MovieRow from './MovieRow';
import MovieViewMore from './MovieViewMore';
import { FaRandom } from 'react-icons/fa';

interface DiverseRecommendationsProps {
  contentType: 'movie' | 'tvshow' | 'tvseries';
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  tmdb_id?: number;
}

// Define separate interfaces for movies and series to handle different schemas
interface MovieData {
  id: string;
  title: string;
  thumbnail_url?: string;
  poster_url?: string;
  country?: string[];
  provider?: string[];
  rating?: number;
  release_year?: number;
  genre?: string[];
  tmdb_id?: number;
  is_trending?: boolean;
  popularity?: number;
  created_at?: string;
}

interface SeriesData {
  id: string;
  title: string;
  thumbnail_url?: string;
  poster_url?: string;
  country?: string[];
  provider?: string[];
  rating?: number;
  release_year?: number;
  genre?: string[];
  tmdb_id?: number;
  created_at?: string;
}

interface CategoryRecommendation {
  title: string;
  content: ContentItem[];
  type: 'country' | 'provider' | 'year' | 'rating' | 'genre' | 'custom';
  priority?: number; // Higher means it should be shown more often
}

interface ViewMoreState {
  isOpen: boolean;
  title: string;
  movies: ContentItem[];
}

// Helper function to shuffle an array
const shuffleArray = <T extends unknown>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Categories that should always be kept if they have content
const PRIORITY_CATEGORIES = ['Trending on Netflix', 'Indonesian Movies', 'Indonesian Shows'];

// Categories to show per page - can be adjusted
const CATEGORIES_PER_PAGE = 8;

// Helper function to capitalize first letter
const capitalizeFirstLetter = (string: string): string => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const DiverseRecommendations: React.FC<DiverseRecommendationsProps> = ({ contentType }) => {
  const [recommendations, setRecommendations] = useState<CategoryRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // State for View More modal
  const [viewMore, setViewMore] = useState<ViewMoreState>({
    isOpen: false,
    title: '',
    movies: []
  });
  
  // Generate a unique seed for each load/refresh
  const [randomSeed, setRandomSeed] = useState<number>(Math.random());
  
  // Normalize contentType to ensure correct table selection
  const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;

  // Function to refresh categories with new random selections
  const refreshCategories = () => {
    setRefreshing(true);
    setRandomSeed(Math.random());
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }

        const tableName = normalizedContentType === 'movie' ? 'movies' : 'series';
        
        console.log(`DiverseRecommendations: Fetching content for ${contentType} (normalized: ${normalizedContentType}) from table ${tableName}`);
        
        // Adjust the query based on whether we're querying movies or series
        const query = supabase.from(tableName)
          .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, genre, tmdb_id, created_at')
          // Filter out items without thumbnails
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'eq', '');
        
        // Add is_trending and popularity only when querying movies table (they don't exist in series table)
        if (normalizedContentType === 'movie') {
          query.select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, genre, is_trending, popularity, tmdb_id, created_at');
        }
        
        const { data, error: contentError } = await query.order('created_at', { ascending: false });

        if (contentError) {
          console.error(`Error fetching ${tableName}:`, contentError);
          throw contentError;
        }

        if (!data || data.length === 0) {
          console.warn(`No ${tableName} data found`);
          setRecommendations([]);
          setIsLoading(false);
          return;
        }

        // Type the contentData correctly based on the table
        const contentData = normalizedContentType === 'movie' 
          ? data as MovieData[]
          : data as SeriesData[];

        console.log(`Fetched ${contentData.length} items for ${tableName}`);
        
        // Format content item for display
        const formatContentItem = (item: MovieData | SeriesData): ContentItem => ({
          id: item.id,
          title: item.title,
          thumbnail_url: item.thumbnail_url || item.poster_url || '',
          rating: item.rating || 0,
          tmdb_id: item.tmdb_id
        });
        
        // Create diverse category recommendations
        const allRecommendations: CategoryRecommendation[] = [];
        
        // Helper functions to normalize country and provider names
        const normalizeCountryName = (country: string): string => {
          if (country.match(/United States|USA|U\.S\.A\.|US|Amerika|America/i)) {
            return "United States";
          }
          if (country.match(/United Kingdom|UK|U\.K\.|Great Britain|England|Britain/i)) {
            return "United Kingdom";
          }
          if (country.match(/Japan|Jepang|Nihon/i)) {
            return "Japan";
          }
          if (country.match(/South Korea|Korea|Korea, South|Republic of Korea|Korea Selatan/i)) {
            return "South Korea";
          }
          return country;
        };
        
        const normalizeProviderName = (provider: string): string => {
          if (provider.match(/Netflix/i)) return "Netflix";
          if (provider.match(/Disney\+|Disney Plus|DisneyPlus/i)) return "Disney+";
          if (provider.match(/Prime|Amazon Prime|Prime Video/i)) return "Amazon Prime";
          if (provider.match(/HBO|Max|HBO Max/i)) return "HBO Max";
          if (provider.match(/Hulu/i)) return "Hulu";
          if (provider.match(/Paramount\+|Paramount Plus/i)) return "Paramount+";
          return provider;
        };
        
        // --- RECOMMENDATION BY PROVIDERS ---
        const providerContentMap = new Map<string, ContentItem[]>();
        
        // Collect by provider - filter out items without thumbnails
        contentData.forEach(item => {
          // Skip items without thumbnails
          if (!item.thumbnail_url || item.thumbnail_url.trim() === '') return;
          
          if (item.provider && Array.isArray(item.provider)) {
            item.provider.forEach(provider => {
              if (provider.includes("YouTube")) return; // Skip YouTube
              
              const normalizedProvider = normalizeProviderName(provider);
              
              if (!providerContentMap.has(normalizedProvider)) {
                providerContentMap.set(normalizedProvider, []);
              }
              
              const content = providerContentMap.get(normalizedProvider) || [];
              const exists = content.some(c => c.id === item.id);
              
              if (!exists) {
                content.push(formatContentItem(item));
                providerContentMap.set(normalizedProvider, content);
              }
            });
          }
        });
        
        // Add provider recommendations
        providerContentMap.forEach((content, provider) => {
          if (content.length >= 5) { // Only add if we have enough content
            allRecommendations.push({
              title: `${provider} ${normalizedContentType === 'movie' ? 'Movies' : 'Shows'}`,
              content: shuffleArray(content),
              type: 'provider',
              priority: provider === 'Netflix' ? 100 : 70 // Netflix gets higher priority
            });
            
            // Add special categories for major providers
            if (provider === 'Netflix' || provider === 'Disney+' || provider === 'HBO Max') {
              allRecommendations.push({
                title: `Trending on ${provider}`,
                content: shuffleArray(content.filter(item => item.rating >= 7).slice(0, 40)),
                type: 'custom',
                priority: 95
              });
            }
          }
        });
        
        // --- RECOMMENDATION BY COUNTRY ---
        const countryContentMap = new Map<string, ContentItem[]>();
        
        // Collect by country - filter out items without thumbnails
        contentData.forEach(item => {
          // Skip items without thumbnails
          if (!item.thumbnail_url || item.thumbnail_url.trim() === '') return;
          
          if (item.country && Array.isArray(item.country)) {
            item.country.forEach(country => {
              const normalizedCountry = normalizeCountryName(country);
              
              if (!countryContentMap.has(normalizedCountry)) {
                countryContentMap.set(normalizedCountry, []);
              }
              
              const content = countryContentMap.get(normalizedCountry) || [];
              const exists = content.some(c => c.id === item.id);
              
              if (!exists) {
                content.push(formatContentItem(item));
                countryContentMap.set(normalizedCountry, content);
              }
            });
          }
        });
        
        // Add country recommendations
        countryContentMap.forEach((content, country) => {
          if (content.length >= 5) {
            // Create standard country recommendation
            allRecommendations.push({
              title: `${country} ${normalizedContentType === 'movie' ? 'Movies' : 'Shows'}`,
              content: shuffleArray(content),
              type: 'country'
            });
            
            // For Indonesia, add a special high-priority category
            if (country === "Indonesia") {
              const title = `Indonesian ${normalizedContentType === 'movie' ? 'Movies' : 'Shows'}`;
              allRecommendations.push({
                title: title,
                content: shuffleArray(content),
                type: 'country',
                priority: 100 // Highest priority to ensure it always shows
              });
            }
            
            // For countries with lots of content, add more specific categories
            if (content.length > 15 && ['United States', 'Japan', 'South Korea', 'United Kingdom', 'Indonesia'].includes(country)) {
              // Sort by rating for top-rated content
              const topRated = [...content].sort((a, b) => b.rating - a.rating).slice(0, 20);
              
              // Add regular top rated category
              allRecommendations.push({
                title: `Top Rated from ${country}`,
                content: topRated,
                type: 'custom',
                priority: country === 'United States' ? 85 : (country === 'Indonesia' ? 95 : 75)
              });
            }
          }
        });
        
        // --- RECOMMENDATION BY YEAR RANGES ---
        // Define year categories
        const yearCategories = [
          { title: "Classic (Pre-2000)", min: 0, max: 1999 },
          { title: "2000s Hits", min: 2000, max: 2009 },
          { title: "2010s Collection", min: 2010, max: 2019 },
          { title: "Latest Releases", min: 2020, max: new Date().getFullYear() }
        ];
        
        // Group by year ranges - ensure we only include items with thumbnails
        yearCategories.forEach(category => {
          const contentInRange = contentData.filter(item => {
            // Skip items without thumbnails
            if (!item.thumbnail_url || item.thumbnail_url.trim() === '') return false;
            
            const year = item.release_year || 0;
            return year >= category.min && year <= category.max;
          });
          
          if (contentInRange.length >= 5) {
            const formattedContent = contentInRange.map(formatContentItem);
            
            allRecommendations.push({
              title: category.title,
              content: shuffleArray(formattedContent),
              type: 'year',
              priority: category.title === "Latest Releases" ? 90 : 60
            });
          }
        });
        
        // --- RECOMMENDATION BY RATING RANGES ---
        // Define rating categories
        const ratingCategories = [
          { title: "Critically Acclaimed", min: 8.5, max: 10 },
          { title: "Highly Rated", min: 7.5, max: 8.5 },
          { title: "Worth Watching", min: 6.5, max: 7.5 }
        ];
        
        ratingCategories.forEach(category => {
          const contentInRange = contentData.filter(item => {
            const rating = item.rating || 0;
            return rating >= category.min && rating < category.max;
          });
          
          if (contentInRange.length >= 5) {
            const formattedContent = contentInRange.map(formatContentItem);
            
            allRecommendations.push({
              title: category.title,
              content: shuffleArray(formattedContent),
              type: 'rating',
              priority: category.title === "Critically Acclaimed" ? 85 : 55
            });
          }
        });
        
        // --- RECOMMENDATION BY GENRE ---
        if (normalizedContentType === 'movie') {
          const movieData = contentData as MovieData[];
          
          // Function to process and capitalize genre names
          const processGenre = (genreName: string) => {
            // First capitalize the genre name
            return capitalizeFirstLetter(genreName);
          };
          
          // Collect popular genres
          const genreContentMap = new Map<string, ContentItem[]>();
          
          movieData.forEach(item => {
            if (!item.genre || !item.thumbnail_url) return;
            
            item.genre.forEach(genre => {
              if (!genre || genre.trim() === '') return;
              
              const normalizedGenre = processGenre(genre);
              if (!genreContentMap.has(normalizedGenre)) {
                genreContentMap.set(normalizedGenre, []);
              }
              
              // Add movie to the genre's list
              genreContentMap.get(normalizedGenre)?.push(formatContentItem(item));
            });
          });
          
          // Create recommendations for top genres
          genreContentMap.forEach((content, genre) => {
            // Ensure we have enough content for this genre (at least 5 items)
            if (content.length >= 5) {
              const uniqueContent = content.filter((item, index, self) => 
                index === self.findIndex((t) => t.id === item.id)
              );
              
              const titleWithGenre = `${processGenre(genre)} ${normalizedContentType === 'movie' ? 'Movies' : 'Shows'}`;
              
              allRecommendations.push({
                title: titleWithGenre,
                content: shuffleArray(uniqueContent).slice(0, 20),
                type: 'genre',
                priority: 75 // High priority for genres
              });
            }
          });
        }
        
        // --- ADD CUSTOM CATEGORIES ---
        
        // Best rated
        const topRated = [...contentData]
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 30)
          .map(formatContentItem);
          
        if (topRated.length >= 5) {
          allRecommendations.push({
            title: 'Top Rated',
            content: topRated,
            type: 'rating',
            priority: 98
          });
        }
        
        // Trending/Popular - only for movies since series doesn't have these columns
        if (normalizedContentType === 'movie') {
          // Type assertion to safely access movie-specific fields
          const movieData = contentData as MovieData[];
          
          const trending = movieData
            .filter(item => item.is_trending || (item.popularity !== undefined && item.popularity > 0.7))
            .map(formatContentItem);
            
          if (trending.length >= 5) {
            // Skip adding "Popular Now" as requested
            // allRecommendations.push({
            //   title: 'Popular Now',
            //   content: shuffleArray(trending),
            //   type: 'custom',
            //   priority: 99
            // });
          }
        } else {
          // For series, use top rating as a proxy for popularity
          const popularSeries = [...contentData]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 15)
            .map(formatContentItem);
            
          if (popularSeries.length >= 5) {
            // Skip adding "Popular Now" as requested
            // allRecommendations.push({
            //   title: 'Popular Now',
            //   content: shuffleArray(popularSeries),
            //   type: 'custom',
            //   priority: 99
            // });
          }
        }
        
        // Final selection of categories to display
        let selectedRecommendations: CategoryRecommendation[] = [];
        
        // First add priority categories if they exist
        PRIORITY_CATEGORIES.forEach(categoryTitle => {
          const found = allRecommendations.find(rec => rec.title === categoryTitle);
          if (found) {
            selectedRecommendations.push(found);
          }
        });
        
        // Then add random categories to fill up to CATEGORIES_PER_PAGE
        const remainingSlots = CATEGORIES_PER_PAGE - selectedRecommendations.length;
        
        console.log(`DiverseRecommendations: For ${normalizedContentType}, found ${allRecommendations.length} total categories. Selecting ${CATEGORIES_PER_PAGE} to display.`);
        
        if (remainingSlots > 0) {
          // Filter out already selected ones and sort by priority
          const candidates = allRecommendations
            .filter(rec => !selectedRecommendations.some(s => s.title === rec.title))
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
          
          // Use the randomSeed for consistent shuffling
          const pseudoRandom = (index: number) => {
            const hash = (index * 13 + randomSeed * 7919) % 1;
            return hash;
          };
          
          // Weighted random selection based on priority
          const weightedRandomSelection = candidates
            .map((item, index) => ({ 
              item, 
              weight: (item.priority || 50) * pseudoRandom(index) 
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, remainingSlots)
            .map(({ item }) => item);
          
          selectedRecommendations = [...selectedRecommendations, ...weightedRandomSelection];
        }
        
        // Shuffle the non-priority categories for variety
        const priorityCount = selectedRecommendations.filter(item => 
          PRIORITY_CATEGORIES.includes(item.title)
        ).length;
        
        if (priorityCount < selectedRecommendations.length) {
          const priorityItems = selectedRecommendations.slice(0, priorityCount);
          const nonPriorityItems = shuffleArray(selectedRecommendations.slice(priorityCount));
          selectedRecommendations = [...priorityItems, ...nonPriorityItems];
        }
        
        console.log(`DiverseRecommendations: Final categories for ${normalizedContentType}: ${selectedRecommendations.map(r => r.title).join(', ')}`);
        
        // Filter the content to ensure we only use items with valid thumbnails
        selectedRecommendations.forEach(recommendation => {
          recommendation.content = recommendation.content.filter(item => 
            item.thumbnail_url && item.thumbnail_url.trim() !== ''
          );
        });
        
        // Filter out categories with no content after thumbnail filtering
        setRecommendations(selectedRecommendations.filter(category => category.content.length > 0));
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [normalizedContentType, randomSeed]);

  const handleViewMore = (title: string, movies: ContentItem[]) => {
    setViewMore({
      isOpen: true,
      title,
      movies
    });
  };

  const handleCloseViewMore = () => {
    setViewMore({
      ...viewMore,
      isOpen: false
    });
  };

  // Check if there's content to show
  const hasContent = recommendations.length > 0;

  return (
    <div className="mt-6 relative z-50">
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-gray-400">
          <p>{error}</p>
        </div>
      ) : !hasContent ? (
        <div className="text-center py-8 text-gray-400">
          <p>No recommendations available for {normalizedContentType === 'movie' ? 'movies' : 'TV shows'}.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {recommendations.map((category, index) => (
            <MovieRow
              key={`${category.title}-${index}-${randomSeed}`}
              title={category.title}
              movies={category.content}
              limit={20}
              contentType={normalizedContentType}
              onViewMore={() => handleViewMore(category.title, category.content)}
            />
          ))}
        </div>
      )}

      {/* View More Modal */}
      <MovieViewMore
        title={viewMore.title}
        movies={viewMore.movies}
        isOpen={viewMore.isOpen}
        onClose={handleCloseViewMore}
        contentType={normalizedContentType}
      />
    </div>
  );
};

export default DiverseRecommendations;