"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import MovieRow from './MovieRow';
import MovieViewMore from './MovieViewMore';

interface GenreRecommendationsProps {
  selectedGenre: string | null;
  contentType: 'movie' | 'tvshow' | 'tvseries';
}

interface CountryRecommendation {
  country: string;
  content: any[];
}

interface ProviderRecommendation {
  provider: string;
  content: any[];
}

interface YearRecommendation {
  label: string;
  yearRange: { min: number; max: number | null };
  content: any[];
}

interface RatingRecommendation {
  label: string;
  ratingRange: { min: number; max: number | null };
  content: any[];
}

interface ViewMoreState {
  isOpen: boolean;
  title: string;
  movies: any[];
}

// Helper function to capitalize first letter
const capitalizeFirstLetter = (string: string): string => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const GenreRecommendations: React.FC<GenreRecommendationsProps> = ({ selectedGenre, contentType }) => {
  // Create a state to track when to reshuffle (only when genre or content type changes)
  const [reshuffleKey, setReshuffleKey] = useState(0);
  const [recommendations, setRecommendations] = useState<{
    byCountry: CountryRecommendation[];
    byProvider: ProviderRecommendation[];
    byYear: YearRecommendation[];
    byRating: RatingRecommendation[];
  }>({
    byCountry: [],
    byProvider: [],
    byYear: [],
    byRating: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // State for View More modal
  const [viewMore, setViewMore] = useState<ViewMoreState>({
    isOpen: false,
    title: '',
    movies: []
  });
  
  // Normalize contentType to ensure backward compatibility
  const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;

  // Function to shuffle an array randomly (for more variety in presentation)
  const shuffleArray = <T extends unknown>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // When genre or content type changes, trigger a reshuffle
  useEffect(() => {
    setReshuffleKey(prevKey => prevKey + 1);
  }, [selectedGenre, contentType]);

  // Function to fetch Netflix content if not already present
  const ensureNetflixContent = async () => {
    if (!selectedGenre || !supabase) return;
    
    // If we already have Netflix content, don't fetch again
    if (recommendations.byProvider.some(item => item.provider === "Netflix" && item.content.length > 0)) {
      return;
    }
    
    console.log(`Ensuring Netflix content for ${selectedGenre} in ${normalizedContentType}`);
    
    // Helper to format content item consistently
    const formatItem = (item: any) => ({
      id: item.id,
      title: item.title,
      thumbnail_url: item.thumbnail_url || item.poster_url,
      rating: item.rating,
      tmdb_id: item.tmdb_id
    });
    
    try {
      // Correctly determine the table name - 'movies' for movie, 'series' for tvshow
      const tableName = normalizedContentType === 'movie' ? 'movies' : 'series';
      const lowercaseGenre = selectedGenre.toLowerCase();
      
      console.log(`Querying ${tableName} table for ${lowercaseGenre} on Netflix`);
      
      // Create the query
      let query = supabase
        .from(tableName)
        .select('id, title, thumbnail_url, poster_url, rating, tmdb_id')
        .filter('provider', 'cs', '{Netflix}')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '');
      
      // Special handling for Sci-Fi
      if (lowercaseGenre === 'sci-fi' || lowercaseGenre === 'science-fiction') {
        query = query.or(`genre.cs.{"Sci-Fi"},genre.cs.{"Science Fiction"},genre.cs.{"Sci-Fi & Fantasy"}`);
      }
      // Special handling for Action and Adventure
      else if (lowercaseGenre === "action" || lowercaseGenre === "adventure") {
        const capitalizedGenre = lowercaseGenre.charAt(0).toUpperCase() + lowercaseGenre.slice(1);
        query = query.or(`genre.cs.{"${capitalizedGenre}"},genre.cs.{"Action & Adventure"}`);
      }
      // Normal genre search
      else {
        const capitalizedGenre = lowercaseGenre.charAt(0).toUpperCase() + lowercaseGenre.slice(1);
        query = query.or(`genre.cs.{"${capitalizedGenre}"},genre.cs.{"${lowercaseGenre}"}`);
      }
      
      const { data, error } = await query.order('rating', { ascending: false }).limit(20);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} Netflix ${normalizedContentType}s for ${selectedGenre}`);
        
        const formattedItems = data.map(item => formatItem(item));
        
        // Add or update Netflix in the provider recommendations
        const updatedProviders = [...recommendations.byProvider];
        const netflixIndex = updatedProviders.findIndex(p => p.provider === "Netflix");
        
        if (netflixIndex >= 0) {
          updatedProviders[netflixIndex] = {
            ...updatedProviders[netflixIndex],
            content: formattedItems
          };
        } else {
          updatedProviders.push({
            provider: "Netflix",
            content: formattedItems
          });
        }
        
        setRecommendations(prevState => ({
          ...prevState,
          byProvider: updatedProviders
        }));
      } else {
        console.log(`No Netflix content found for ${selectedGenre}, trying general Netflix content...`);
        
        // Fallback: Get any Netflix content if genre-specific content not found
        const { data: generalData, error: generalError } = await supabase
          .from(tableName)
          .select('id, title, thumbnail_url, poster_url, rating, tmdb_id')
          .filter('provider', 'cs', '{Netflix}')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'eq', '')
          .order('rating', { ascending: false })
          .limit(20);
          
        if (generalError) throw generalError;
        
        if (generalData && generalData.length > 0) {
          console.log(`Found ${generalData.length} general Netflix ${normalizedContentType}s as fallback`);
          
          const formattedItems = generalData.map(item => formatItem(item));
          
          // Add or update Netflix in the provider recommendations
          const updatedProviders = [...recommendations.byProvider];
          const netflixIndex = updatedProviders.findIndex(p => p.provider === "Netflix");
          
          if (netflixIndex >= 0) {
            updatedProviders[netflixIndex] = {
              ...updatedProviders[netflixIndex],
              content: formattedItems
            };
          } else {
            updatedProviders.push({
              provider: "Netflix",
              content: formattedItems
            });
          }
          
          setRecommendations(prevState => ({
            ...prevState,
            byProvider: updatedProviders
          }));
        }
      }
    } catch (err) {
      console.error("Error ensuring Netflix content:", err);
    }
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      // Only fetch recommendations if a genre is selected
      if (!selectedGenre) {
        setRecommendations({ byCountry: [], byProvider: [], byYear: [], byRating: [] });
        return;
      }

      console.log(`Fetching recommendations for genre: ${selectedGenre}, content type: ${contentType}`);
      setIsLoading(true);
      setError(null);

      try {
        console.log("Supabase client availability:", !!supabase);
        
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }

        // Normalize contentType to ensure backward compatibility
        const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;
        const tableName = normalizedContentType === 'movie' ? 'movies' : 'series';
        
        console.log(`Using table: ${tableName}, searching for genre: ${selectedGenre}`);
        
        // Prepare case variations for the genre to improve match likelihood
        const lowercaseGenre = selectedGenre.toLowerCase();
        const capitalizedGenre = lowercaseGenre.charAt(0).toUpperCase() + lowercaseGenre.slice(1);
        const uppercaseGenre = selectedGenre.toUpperCase();

        // Create an exact match pattern for array contains query
        // Improved query to ensure precise genre matching using double quotes around each genre variation
        // This prevents partial matches like "Action" matching "Action Adventure"
        let genreData;
        
        // Check for special case handling functions for Sci-Fi and Fantasy genres
        const specialCaseHandler = handleSciFiAndFantasyGenres(lowercaseGenre, capitalizedGenre, tableName);
        
        if (specialCaseHandler) {
          const specialCaseData = await specialCaseHandler();
          if (specialCaseData) {
            genreData = specialCaseData;
          }
        }
        
        // If no special case data found, continue with regular flow
        if (!genreData) {
          // Handle special case for genres with ampersands (like "action & adventure")
          if (lowercaseGenre.includes('&')) {
            // If genre contains ampersand (&), split it for query
            const genreParts = capitalizedGenre.split(/\s*&\s*/);
            
            console.log(`Genre contains ampersand, splitting into parts:`, genreParts);
            
            // First attempt: Using array contains with exact genre parts
            let query = supabase
              .from(tableName)
              .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
              // Filter out items without thumbnails
              .not('thumbnail_url', 'is', null)
              .not('thumbnail_url', 'eq', '');
            
            // Apply genre filter based on each part (AND condition)
            genreParts.forEach(part => {
              query = query.filter('genre', 'cs', `{${part}}`);
            });
            
            // Add ordering
            const { data, error } = await query.order('rating', { ascending: false });
            
            if (error) {
              console.error("Error with split genre query:", error);
              throw error;
            }
            
            if (data && data.length > 0) {
              console.log(`Found ${data.length} results for split genre parts`);
              genreData = data;
            } else {
              console.log("No results for split genre query, trying fallback...");
              // Fallback to a more lenient query
              const fallbackGenre = genreParts[0]; // Use just the first part
              const { data: fallbackData, error: fallbackError } = await supabase
                .from(tableName)
                .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
                .filter('genre', 'cs', `{${fallbackGenre}}`)
                // Filter out items without thumbnails
                .not('thumbnail_url', 'is', null)
                .not('thumbnail_url', 'eq', '')
                .order('rating', { ascending: false });
                
              if (fallbackError) {
                console.error("Fallback query error:", fallbackError);
                throw fallbackError;
              }
              
              if (fallbackData && fallbackData.length > 0) {
                console.log(`Fallback found ${fallbackData.length} results for genre "${fallbackGenre}"`);
                genreData = fallbackData;
              } else {
                setRecommendations({ byCountry: [], byProvider: [], byYear: [], byRating: [] });
                setIsLoading(false);
                return;
              }
            }
          } else {
            // Normal flow for genres without ampersands
            let { data, error } = await supabase
              .from(tableName)
              .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
              .or(`genre.cs.{"${capitalizedGenre}"},genre.cs.{"${lowercaseGenre}"},genre.cs.{"${uppercaseGenre}"}`)
              // Filter out items without thumbnails
              .not('thumbnail_url', 'is', null)
              .not('thumbnail_url', 'eq', '')
              .order('rating', { ascending: false });

            if (error || !data || data.length === 0) {
              console.log("First query attempt: No results found. Trying alternative search strategies...");
              
              // Special handling for Action and Adventure genres (often stored as "Action & Adventure")
              if (lowercaseGenre === "action" || lowercaseGenre === "adventure") {
                console.log(`Searching for "${lowercaseGenre}" as part of "Action & Adventure" compound genre`);
                
                const { data: compoundData, error: compoundError } = await supabase
                  .from(tableName)
                  .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
                  .filter('genre', 'cs', '{Action & Adventure}')
                  // Filter out items without thumbnails
                  .not('thumbnail_url', 'is', null)
                  .not('thumbnail_url', 'eq', '')
                  .order('rating', { ascending: false });
                  
                if (!compoundError && compoundData && compoundData.length > 0) {
                  console.log(`Found ${compoundData.length} results with "Action & Adventure" compound genre`);
                  genreData = compoundData;
                } else {
                  // Continue with regular fallback approach
                  console.log("No results with compound genre, trying regular fallback approach...");
                  
                  // Regular fallback approach for other genres
                  console.log("Second search strategy: Trying exact match with array contains...");
                  const { data: secondAttemptData, error: secondAttemptError } = await supabase
                    .from(tableName)
                    .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
                    .filter('genre', 'cs', `{${capitalizedGenre}}`)
                    // Filter out items without thumbnails
                    .not('thumbnail_url', 'is', null)
                    .not('thumbnail_url', 'eq', '')
                    .order('rating', { ascending: false });
                    
                  if (secondAttemptError || !secondAttemptData || secondAttemptData.length === 0) {
                    console.log("Second search attempt: No results with capitalized genre. Trying lowercase...");
                    
                    // Last resort: try with lowercase
                    const { data: thirdAttemptData, error: thirdAttemptError } = await supabase
                      .from(tableName)
                      .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
                      .filter('genre', 'cs', `{${lowercaseGenre}}`)
                      // Filter out items without thumbnails
                      .not('thumbnail_url', 'is', null)
                      .not('thumbnail_url', 'eq', '')
                      .order('rating', { ascending: false });

                    if (thirdAttemptError) {
                      console.error("Search failed: Database query error:", thirdAttemptError);
                      throw thirdAttemptError;
                    } else if (thirdAttemptData && thirdAttemptData.length > 0) {
                      console.log(`Success! Third search attempt found ${thirdAttemptData.length} results`);
                      genreData = thirdAttemptData;
                    } else {
                      setRecommendations({ byCountry: [], byProvider: [], byYear: [], byRating: [] });
                      setIsLoading(false);
                      return;
                    }
                  } else {
                    console.log(`Success! Second search attempt found ${secondAttemptData.length} results`);
                    genreData = secondAttemptData;
                  }
                }
              } else {
                // Regular fallback approach for other genres
                console.log("Second search strategy: Trying exact match with array contains...");
                const { data: secondAttemptData, error: secondAttemptError } = await supabase
                  .from(tableName)
                  .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
                  .filter('genre', 'cs', `{${capitalizedGenre}}`)
                  // Filter out items without thumbnails
                  .not('thumbnail_url', 'is', null)
                  .not('thumbnail_url', 'eq', '')
                  .order('rating', { ascending: false });

                if (secondAttemptError || !secondAttemptData || secondAttemptData.length === 0) {
                  console.log("Second attempt failed or no results, trying with lowercase...");
                  
                  // Last resort: try with lowercase
                  const { data: thirdAttemptData, error: thirdAttemptError } = await supabase
                    .from(tableName)
                    .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
                    .filter('genre', 'cs', `{${lowercaseGenre}}`)
                    // Filter out items without thumbnails
                    .not('thumbnail_url', 'is', null)
                    .not('thumbnail_url', 'eq', '')
                    .order('rating', { ascending: false });
                    
                  if (thirdAttemptError) {
                    console.error("Search failed: Database query error:", thirdAttemptError);
                    throw thirdAttemptError;
                  } else if (thirdAttemptData && thirdAttemptData.length > 0) {
                    console.log(`Success! Third search attempt found ${thirdAttemptData.length} results`);
                    genreData = thirdAttemptData;
                  } else {
                    setRecommendations({ byCountry: [], byProvider: [], byYear: [], byRating: [] });
                    setIsLoading(false);
                    return;
                  }
                } else {
                  console.log(`Success! Second search attempt found ${secondAttemptData.length} results`);
                  genreData = secondAttemptData;
                }
              }
            } else {
              genreData = data;
            }
          }
        }

        if (!genreData || genreData.length === 0) {
          console.log("No data found for genre", selectedGenre);
          setRecommendations({ byCountry: [], byProvider: [], byYear: [], byRating: [] });
          setIsLoading(false);
          return;
        }

        console.log(`Retrieved data count: ${genreData?.length || 0}`);
        
        // Filter the data one more time in-memory to ensure exact genre matches
        // or to ensure that films with special genres are shown when searching
        genreData = genreData.filter(item => {
          if (!item.genre || !Array.isArray(item.genre)) return false;
          
          // Handle special case for Sci-Fi/Science Fiction
          if (lowercaseGenre === "sci-fi" || lowercaseGenre === "science-fiction") {
            return item.genre.some((g: string) => {
              const normalizedG = g.trim().toLowerCase();
              return normalizedG === "science fiction" || normalizedG === "sci-fi" || normalizedG === "sci-fi & fantasy";
            });
          }
          
          // Handle special case for Fantasy in TV shows
          if (lowercaseGenre === "fantasy" && tableName === "series") {
            return item.genre.some((g: string) => {
              const normalizedG = g.trim().toLowerCase();
              return normalizedG === "fantasy" || normalizedG === "sci-fi & fantasy";
            });
          }
          
          // Handle special case for Action and Adventure
          if (lowercaseGenre === "action" || lowercaseGenre === "adventure") {
            // If searching for "action" or "adventure", also match "Action & Adventure"
            return item.genre.some((g: string) => {
              const normalizedG = g.trim().toLowerCase();
              
              // Direct match with exact genre
              if (normalizedG === lowercaseGenre) return true;
              
              // Match with "action & adventure" for either "action" or "adventure" search
              if (normalizedG === "action & adventure") return true;
              
              return false;
            });
          }
          
          // Check if the genre array contains the exact genre we're looking for
          const exactMatch = item.genre.some((g: string) => {
            const normalizedG = g.trim().toLowerCase();
            return normalizedG === lowercaseGenre;
          });
          
          if (exactMatch) return true;
          
          // If we're searching for a part of a compound genre (e.g., "Action" in "Action & Adventure")
          // Check if any of the item's genres contain our search term as part of a compound genre
          if (!lowercaseGenre.includes('&')) {
            return item.genre.some((g: string) => {
              const normalizedG = g.trim().toLowerCase();
              // Check if this is a compound genre containing our search term
              if (normalizedG.includes('&')) {
                const parts = normalizedG.split(/\s*&\s*/);
                return parts.some((part: string) => part.trim() === lowercaseGenre);
              }
              return false;
            });
          }
          
          return false;
        });
        
        console.log(`After filtering, found ${genreData.length} matches for genre "${selectedGenre}"`);
        
        // Log the first item to inspect its structure
        if (genreData && genreData.length > 0) {
          console.log("First item data structure:", genreData[0]);
        } else {
          console.log("No data found for exact genre match");
          setRecommendations({ byCountry: [], byProvider: [], byYear: [], byRating: [] });
          setIsLoading(false);
          return;
        }

        // At this point, genreData should be populated, continue with processing

        // Log the total count of movies found
        console.log(`Found ${genreData.length} movies/shows for genre "${selectedGenre}"`);
        
        // Helper function to normalize country names
        const normalizeCountryName = (country: string): string => {
          // USA variants
          if (country === "United States of America" || 
              country === "United States" || 
              country === "USA" || 
              country === "U.S.A." || 
              country === "US" ||
              country === "Amerika" ||
              country === "America") {
            return "United States";
          }
          // UK variants
          if (country === "United Kingdom" || 
              country === "UK" || 
              country === "U.K." || 
              country === "Great Britain" || 
              country === "England" ||
              country === "Britain") {
            return "United Kingdom";
          }
          // Japan variants
          if (country === "Japan" || country === "Jepang" || country === "Nihon") {
            return "Japan";
          }
          // South Korea variants
          if (country === "South Korea" || 
              country === "Korea" || 
              country === "Korea, South" || 
              country === "Republic of Korea" ||
              country === "Korea Selatan") {
            return "South Korea";
          }
          // Default: return the original country name
          return country;
        };
        
        // Helper function to normalize provider names
        const normalizeProviderName = (provider: string): string => {
          // Netflix variants
          if (provider.includes("Netflix") || provider.includes("netflix")) {
            return "Netflix";
          }
          // Disney+ variants
          if (provider.includes("Disney+") || provider.includes("Disney Plus") || provider.includes("DisneyPlus")) {
            return "Disney+";
          }
          // Amazon Prime variants
          if (provider.includes("Prime") || provider.includes("Amazon Prime") || provider.includes("Prime Video")) {
            return "Amazon Prime";
          }
          // HBO variants
          if (provider.includes("HBO") || provider.includes("Max") || provider.includes("HBO Max")) {
            return "HBO Max";
          }
          // Hulu variants
          if (provider.includes("Hulu")) {
            return "Hulu";
          }
          // Paramount+ variants
          if (provider.includes("Paramount") || provider.includes("Paramount+") || provider.includes("Paramount Plus")) {
            return "Paramount+";
          }
          // Default: return the original provider name
          return provider;
        };

        // Check if a provider should be excluded (e.g., YouTube)
        const shouldExcludeProvider = (provider: string): boolean => {
          return provider.includes("YouTube") || 
                 provider.includes("youtube") || 
                 provider.includes("Youtube");
        };

        // Format content items and make sure they have thumbnails
        const formatContentItem = (item: any) => {
          // Skip items without thumbnails
          if (!item.thumbnail_url || item.thumbnail_url.trim() === '') return null;
          
          return {
          id: item.id,
          title: item.title,
            thumbnail_url: item.thumbnail_url,
            rating: item.rating || 0,
          tmdb_id: item.tmdb_id
          };
        };
        
        // --- ORGANIZE RECOMMENDATIONS BY COUNTRY ---
        const countryRecommendations: CountryRecommendation[] = [];
        
        const countryContentMap = new Map<string, any[]>();
        
        // Process country data
        genreData.forEach(item => {
          if (item.country && Array.isArray(item.country)) {
            item.country.forEach((country: string) => {
              // Normalize country name for consistency
              const normalizedCountry = normalizeCountryName(country);
              
              if (!countryContentMap.has(normalizedCountry)) {
                countryContentMap.set(normalizedCountry, []);
              }
              
              const content = countryContentMap.get(normalizedCountry);
              if (content) {
                // Check if this item is already in the content array
                const exists = content.some(c => c.id === item.id);
                if (!exists) {
                  content.push(formatContentItem(item));
                }
              }
            });
          }
        });
        
        // Sort countries by content count and create recommendations
        Array.from(countryContentMap.entries())
          .sort((a, b) => {
            // Put Indonesia first if it exists
            if (a[0] === 'Indonesia') return -1;
            if (b[0] === 'Indonesia') return 1;
            // Then sort by content count (descending)
            return b[1].length - a[1].length;
          })
          .forEach(([country, content]) => {
            // Only include countries with at least 5 items
            if (content.length >= 5) {
              countryRecommendations.push({
                country,
                content: shuffleArray(content) // Shuffle for variety
              });
            }
          });
        
        // GROUP BY PROVIDER
        const providerContentMap = new Map<string, any[]>();
        
        genreData.forEach(item => {
          if (item.provider && Array.isArray(item.provider)) {
            item.provider.forEach((provider: string) => {
              // Skip YouTube providers
              if (shouldExcludeProvider(provider)) {
                return;
              }
              
              // Normalize provider name
              const normalizedProvider = normalizeProviderName(provider);
              
              if (!providerContentMap.has(normalizedProvider)) {
                providerContentMap.set(normalizedProvider, []);
              }
              
              // Add to the provider's content list if not already there
              const content = providerContentMap.get(normalizedProvider) || [];
              const exists = content.some(c => c.id === item.id);
              
              if (!exists) {
                content.push(formatContentItem(item));
                providerContentMap.set(normalizedProvider, content);
              }
            });
          }
        });

        // GROUP BY YEAR RANGES
        const yearRanges = [
          { label: "Classic", yearRange: { min: 0, max: 1999 } },
          { label: "2000s", yearRange: { min: 2000, max: 2009 } },
          { label: "2010s", yearRange: { min: 2010, max: 2019 } },
          { label: "Latest", yearRange: { min: 2020, max: null } },
        ];
        
        const yearContentMap = new Map<string, { yearRange: { min: number; max: number | null }; content: any[] }>();
        
        yearRanges.forEach(range => {
          yearContentMap.set(range.label, { yearRange: range.yearRange, content: [] });
        });
        
        // Current year for comparison
        const currentYear = new Date().getFullYear();
        
        genreData.forEach(item => {
          if (item.release_year) {
            // For each year range, check if this item falls within it
            for (const [label, { yearRange, content }] of yearContentMap.entries()) {
              const { min, max } = yearRange;
              
              // Check if item falls within this year range
              const withinRange = max === null 
                ? item.release_year >= min && item.release_year <= currentYear 
                : item.release_year >= min && item.release_year <= max;
              
              if (withinRange) {
                // Check for duplicates
                const exists = content.some(c => c.id === item.id);
                if (!exists) {
                  content.push(formatContentItem(item));
                  yearContentMap.set(label, { yearRange, content });
                }
              }
            }
          }
        });
        
        // GROUP BY RATING RANGES
        const ratingRanges = [
          { label: "Top Rated", ratingRange: { min: 8, max: null } },
          { label: "Highly Rated", ratingRange: { min: 7, max: 7.9 } },
          { label: "Well Received", ratingRange: { min: 6, max: 6.9 } },
          { label: "Mixed Reviews", ratingRange: { min: 0, max: 5.9 } },
        ];
        
        const ratingContentMap = new Map<string, { ratingRange: { min: number; max: number | null }; content: any[] }>();
        
        ratingRanges.forEach(range => {
          ratingContentMap.set(range.label, { ratingRange: range.ratingRange, content: [] });
        });
        
        genreData.forEach(item => {
          if (item.rating !== null && item.rating !== undefined) {
            // For each rating range, check if this item falls within it
            for (const [label, { ratingRange, content }] of ratingContentMap.entries()) {
              const { min, max } = ratingRange;
              
              // Check if item falls within this rating range
              const withinRange = max === null 
                ? item.rating >= min 
                : item.rating >= min && item.rating <= max;
              
              if (withinRange) {
                // Check for duplicates
                const exists = content.some(c => c.id === item.id);
                if (!exists) {
                  content.push(formatContentItem(item));
                  ratingContentMap.set(label, { ratingRange, content });
                }
              }
            }
          }
        });

        // PREPARE FINAL RECOMMENDATIONS
        
        // Convert provider data to array and filter to useful categories
        let providerRecommendations: ProviderRecommendation[] = Array.from(providerContentMap.entries())
          .filter(([provider, content]) => !shouldExcludeProvider(provider) && content.length >= 3) // Only include providers with at least 3 items and exclude YouTube
          .map(([provider, content]) => ({ 
            provider, 
            // Shuffle content to ensure variety
            content: shuffleArray(content) 
          }))
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, 5); // Limit to top 5 providers

        // Sort the country recommendations to ensure Indonesia appears first if it exists
        const sortedCountryRecommendations = [...countryRecommendations].sort((a, b) => {
          // Put Indonesia first if it exists
          if (a.country === 'Indonesia') return -1;
          if (b.country === 'Indonesia') return 1;
          // Then sort by content count (descending)
          return b.content.length - a.content.length;
        });

        // Convert year data to array and filter to useful categories
        const yearRecommendations: YearRecommendation[] = Array.from(yearContentMap.entries())
          .filter(([_, { content }]) => content.length >= 3) // Only include year ranges with at least 3 items
          .map(([label, { yearRange, content }]) => ({ 
            label, 
            yearRange, 
            // Shuffle content once when loading data
            content: shuffleArray(content) 
          }))
          .sort((a, b) => b.content.length - a.content.length); // Show most populous categories first

        // Convert rating data to array and filter to useful categories
        const ratingRecommendations: RatingRecommendation[] = Array.from(ratingContentMap.entries())
          .filter(([_, { content }]) => content.length >= 3) // Only include rating ranges with at least 3 items
          .map(([label, { ratingRange, content }]) => ({ 
            label, 
            ratingRange, 
            // Shuffle content once when loading data
            content: shuffleArray(content) 
          }))
          .sort((a, b) => b.content.length - a.content.length); // Show most populous categories first

        // Restore the original code structure but prioritize Indonesia
        // First, prepare our top five countries, ensuring Indonesia is included if available
        const topFiveCountries = [...countryRecommendations]
          .sort((a, b) => {
            // Put Indonesia first if it exists
            if (a.country === 'Indonesia') return -1;
            if (b.country === 'Indonesia') return 1;
            // Then sort by content count (descending)
            return b.content.length - a.content.length;
          })
          .slice(0, 5); // Limit to top 5 countries

        // Final filtering step - only keep items with thumbnails
        const filteredCountryRecommendations: CountryRecommendation[] = topFiveCountries
          .map(item => ({
            ...item,
            content: item.content
              .filter(c => c && c.thumbnail_url && c.thumbnail_url.trim() !== '') // Remove items without thumbnails
          }))
          .filter(item => item.content.length > 0); // Only keep categories with content

        const filteredProviderRecommendations: ProviderRecommendation[] = providerRecommendations
          .map(item => ({
            ...item,
            content: item.content
              .filter(c => c && c.thumbnail_url && c.thumbnail_url.trim() !== '') // Remove items without thumbnails
          }))
          .filter(item => item.content.length > 0);

        const filteredYearRecommendations: YearRecommendation[] = yearRecommendations
          .map(item => ({
            ...item,
            content: item.content
              .filter(c => c && c.thumbnail_url && c.thumbnail_url.trim() !== '') // Remove items without thumbnails
          }))
          .filter(item => item.content.length > 0);

        const filteredRatingRecommendations: RatingRecommendation[] = ratingRecommendations
          .map(item => ({
            ...item,
            content: item.content
              .filter(c => c && c.thumbnail_url && c.thumbnail_url.trim() !== '') // Remove items without thumbnails
          }))
          .filter(item => item.content.length > 0);

        setRecommendations({
          byCountry: filteredCountryRecommendations,
          byProvider: filteredProviderRecommendations,
          byYear: filteredYearRecommendations,
          byRating: filteredRatingRecommendations,
        });
      } catch (err: any) {
        console.error('Error fetching recommendations:', err);
        setError(err.message || 'An error occurred while fetching recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [selectedGenre, contentType, reshuffleKey]);

  // Handle opening the View More modal
  const handleViewMore = (title: string, movies: any[]) => {
    console.log(`Opening View More for "${title}" with ${movies.length} movies`);
    
    // Check if this is Netflix and we should fetch all movies directly
    if (title.includes('Netflix') && selectedGenre) {
      fetchAllNetflixMovies(title, movies);
    } else {
      // Use the already-shuffled movies from our state
      setViewMore({
        isOpen: true,
        title,
        movies: [...movies] // Create a copy but don't shuffle again
      });
    }
  };

  // Fetch all Netflix movies for the selected genre
  const fetchAllNetflixMovies = async (title: string, fallbackMovies: any[]) => {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }
      
      // Show loading state but don't block UI while fetching
      setViewMore({
        isOpen: true,
        title,
        movies: [...fallbackMovies] // Start with fallback movies immediately
      });
      
      // Then fetch all movies in background
      const tableName = normalizedContentType === 'movie' ? 'movies' : 'series';
      
      if (!selectedGenre) return;
      
      // Prepare case variations for the genre to improve match likelihood
      const lowercaseGenre = selectedGenre.toLowerCase();
      const capitalizedGenre = lowercaseGenre.charAt(0).toUpperCase() + lowercaseGenre.slice(1);
      
      // Handle special case for genres with ampersands (like "action-&-adventure")
      // by splitting them into separate genres
      let query = supabase
        .from(tableName)
        .select('id, title, thumbnail_url, poster_url, rating, tmdb_id');
      
      // First, apply the Netflix provider filter
      query = query.filter('provider', 'cs', '{Netflix}');
      
      // Special handling for Action and Adventure
      if (lowercaseGenre === "action" || lowercaseGenre === "adventure") {
        // If searching for "action" or "adventure", also look for "Action & Adventure"
        query = query.filter('genre', 'cs', '{Action & Adventure}');
      } else if (lowercaseGenre.includes('&')) {
        // If genre contains ampersand (&), split it for query
        const genreParts = capitalizedGenre.split(/\s*&\s*/);
        
        // Apply genre filter based on each part (AND condition)
        genreParts.forEach(part => {
          query = query.filter('genre', 'cs', `{${part}}`);
        });
      } else {
        // Normal query for single genres
        query = query.or(`genre.cs.{"${capitalizedGenre}"},genre.cs.{"${lowercaseGenre}"}`);
      }
      
      // Add ordering
      const { data, error } = await query.order('rating', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log(`Fetched ${data.length} Netflix movies directly for Watch More`);
        
        // Format the data
        const formattedMovies = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          thumbnail_url: item.thumbnail_url || item.poster_url,
          rating: item.rating,
          tmdb_id: item.tmdb_id
        }));
        
        // Update the modal with all Netflix movies
        setViewMore(prev => ({
          ...prev,
          movies: formattedMovies
        }));
      }
    } catch (err: any) {
      console.error('Error fetching Netflix movies:', err);
      // Already showing fallback movies, so no need to update
    } finally {
      setIsLoading(false);
    }
  };

  // Handle closing the View More modal
  const handleCloseViewMore = () => {
    setViewMore({
      ...viewMore,
      isOpen: false
    });
  };

  // Only render if we have recommendations
  const hasRecommendations = 
    recommendations.byCountry.length > 0 || 
    recommendations.byProvider.length > 0 || 
    recommendations.byYear.length > 0 || 
    recommendations.byRating.length > 0;
  
  // Function to generate title with genre
  const getTitleWithGenre = (baseTitle: string) => {
    return `${baseTitle} ${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''}`; 
  };
  
  // Call the function to ensure Netflix content when recommendations change
  useEffect(() => {
    if (selectedGenre && supabase) {
      ensureNetflixContent();
    }
  }, [selectedGenre, contentType, hasRecommendations]);

  if (!selectedGenre) return null;
  
  if (isLoading) {
    return (
      <div className="py-4">
        <div className="animate-pulse w-48 h-6 bg-gray-700 rounded mb-4"></div>
        <div className="animate-pulse grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-700 rounded h-40"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }
  
  if (!hasRecommendations) {
    return null;
  }

  return (
    <div className="py-4 space-y-6">
      <h2 className="text-xl font-bold mb-4">Explore More {selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''}</h2>
      
      {/* MIX UP THE RECOMMENDATIONS FOR MORE VARIETY */}
      <div className="space-y-8">
        {/* NETFLIX RECOMMENDATIONS (ALWAYS SHOW FIRST IF AVAILABLE) */}
        {recommendations.byProvider.find(item => item.provider === "Netflix" && item.content.length > 0) && (() => {
          const netflixItem = recommendations.byProvider.find(item => item.provider === "Netflix" && item.content.length > 0);
          const netflixContent = netflixItem?.content || [];
          
          return (
            <MovieRow 
              key={`provider-Netflix-${reshuffleKey}`}
              title={`${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''} on Netflix`}
              movies={netflixContent}
              contentType={normalizedContentType}
              limit={20}
              onViewMore={() => fetchAllNetflixMovies(
                `${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''} on Netflix`,
                netflixContent
              )}
            />
          );
        })()}
        
        {/* RATING-BASED RECOMMENDATIONS (HIGH PRIORITY) */}
        {recommendations.byRating.map(item => (
          item.content.length > 0 && (
            <MovieRow 
              key={`rating-${item.label}-${reshuffleKey}`}
              title={getTitleWithGenre(`${item.label}`)}
              movies={item.content} // Use the already shuffled content
              contentType={normalizedContentType}
              limit={20} // Changed from 10 to 20
              onViewMore={() => handleViewMore(getTitleWithGenre(`${item.label}`), item.content)} // Pass same shuffled content
            />
          )
        ))}
        
        {/* YEAR-BASED RECOMMENDATIONS (HIGH PRIORITY) */}
        {recommendations.byYear.map(item => {
          const titleForYear = item.label === "Classic" 
            ? `Classic ${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''}` 
            : item.label === "Latest" 
              ? `Latest ${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''}` 
              : `${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''} from the ${item.label}`;
              
          return item.content.length > 0 && (
            <MovieRow 
              key={`year-${item.label}-${reshuffleKey}`}
              title={titleForYear}
              movies={item.content} // Use the already shuffled content
              contentType={normalizedContentType}
              limit={20} // Changed from 10 to 20
              onViewMore={() => handleViewMore(titleForYear, item.content)} // Pass same shuffled content
            />
          );
        })}
        
        {/* OTHER STREAMING PROVIDERS (MEDIUM PRIORITY) */}
        {recommendations.byProvider.filter(item => item.provider !== "Netflix" && item.content.length > 0).map(item => (
          <MovieRow 
            key={`provider-${item.provider}-${reshuffleKey}`}
            title={`${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''} on ${item.provider}`}
            movies={item.content} // Use the already shuffled content
            contentType={normalizedContentType}
            limit={20} // Changed from 10 to 20
            onViewMore={() => handleViewMore(
              `${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''} on ${item.provider}`,
              item.content // Pass same shuffled content
            )}
          />
        ))}
        
        {/* COUNTRY-SPECIFIC RECOMMENDATIONS (IF AVAILABLE) */}
        {recommendations.byCountry.map(item => {
          const titleForCountry = `${selectedGenre ? capitalizeFirstLetter(selectedGenre) : ''} from ${item.country}`;
          
          return item.content.length > 0 && (
            <MovieRow 
              key={`country-${item.country}-${reshuffleKey}`}
              title={titleForCountry}
              movies={item.content} // Use the already shuffled content
              contentType={normalizedContentType}
              limit={20} // Changed from 10 to 20
              onViewMore={() => handleViewMore(titleForCountry, item.content)} // Pass same shuffled content
            />
          );
        })}
      </div>

      {/* View More Modal */}
      <MovieViewMore
        isOpen={viewMore.isOpen}
        onClose={handleCloseViewMore}
        title={viewMore.title}
        movies={viewMore.movies}
        contentType={normalizedContentType}
      />
    </div>
  );
};

// Saat queryGenre adalah "sci-fi" atau "science-fiction", perlu coba semua variasi penulisan genre sci-fi
const handleSciFiAndFantasyGenres = (lowercaseGenre: string, capitalizedGenre: string, tableName: string) => {
  // Handle special case for Sci-Fi and Science Fiction
  if (lowercaseGenre === "sci-fi" || lowercaseGenre === "science-fiction") {
    return async () => {
      console.log(`Special handling for Sci-Fi/Science Fiction genre`);
      
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return null;
      }
      
      // Coba cari dengan "Science Fiction" (untuk movies)
      const { data: scienceData, error: scienceError } = await supabase
        .from(tableName)
        .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
        .filter('genre', 'cs', '{Science Fiction}')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '')
        .order('rating', { ascending: false });
      
      // Coba cari dengan "Sci-Fi & Fantasy" (untuk series)
      const { data: scifiFantasyData, error: scifiFantasyError } = await supabase
        .from(tableName)
        .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
        .filter('genre', 'cs', '{Sci-Fi & Fantasy}')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '')
        .order('rating', { ascending: false });
      
      // Gabungkan hasil dari kedua query
      let combinedResults: any[] = [];
      
      if (!scienceError && scienceData && scienceData.length > 0) {
        combinedResults = [...combinedResults, ...scienceData];
      }
      
      if (!scifiFantasyError && scifiFantasyData && scifiFantasyData.length > 0) {
        combinedResults = [...combinedResults, ...scifiFantasyData];
      }
      
      if (combinedResults.length > 0) {
        return combinedResults;
      }
      
      // Tidak ada hasil yang ditemukan
      return null;
    };
  }
  
  // Handle special case for Fantasy in TV shows
  if (lowercaseGenre === "fantasy") {
    return async () => {
      console.log(`Special handling for Fantasy genre`);
      
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return null;
      }
      
      // Coba cari dengan "Sci-Fi & Fantasy" (untuk series jika ini tvshow)
      if (tableName === 'series') {
        const { data: fantasyData, error: fantasyError } = await supabase
          .from(tableName)
          .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
          .filter('genre', 'cs', '{Sci-Fi & Fantasy}')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'eq', '')
          .order('rating', { ascending: false });
          
        if (!fantasyError && fantasyData && fantasyData.length > 0) {
          return fantasyData;
        }
      }
      
      // Coba pencarian langsung dengan 'Fantasy'
      const { data: directFantasyData, error: directFantasyError } = await supabase
        .from(tableName)
        .select('id, title, thumbnail_url, poster_url, country, provider, rating, release_year, tmdb_id, genre')
        .filter('genre', 'cs', '{Fantasy}')
        .not('thumbnail_url', 'is', null)
        .not('thumbnail_url', 'eq', '')
        .order('rating', { ascending: false });
        
      if (!directFantasyError && directFantasyData && directFantasyData.length > 0) {
        return directFantasyData;
      }
      
      // Tidak ada hasil yang ditemukan
      return null;
    };
  }
  
  return null;
};

export default GenreRecommendations; 