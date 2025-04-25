"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import MovieRow from './MovieRow';

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

const GenreRecommendations: React.FC<GenreRecommendationsProps> = ({ selectedGenre, contentType }) => {
  const [recommendations, setRecommendations] = useState<{
    byCountry: CountryRecommendation[];
    byProvider: ProviderRecommendation[];
  }>({
    byCountry: [],
    byProvider: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Normalize contentType to ensure backward compatibility
  const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;

  useEffect(() => {
    const fetchRecommendations = async () => {
      // Only fetch recommendations if a genre is selected
      if (!selectedGenre) {
        setRecommendations({ byCountry: [], byProvider: [] });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }

        // Normalize contentType to ensure backward compatibility
        const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;
        const tableName = normalizedContentType === 'movie' ? 'movies' : 'series';
        
        // 1. Get the content for this genre with country info
        const { data: countryData, error: countryError } = await supabase
          .from(tableName)
          .select('id, title, thumbnail_url, poster_url, country, rating, tmdb_id')
          .filter('genre', 'cs', `{${selectedGenre}}`)
          .not('country', 'is', null)
          .order('rating', { ascending: false })
          .limit(100);

        if (countryError) throw countryError;

        // 2. Get the content for this genre with provider info
        const { data: providerData, error: providerError } = await supabase
          .from(tableName)
          .select('id, title, thumbnail_url, poster_url, provider, rating, tmdb_id')
          .filter('genre', 'cs', `{${selectedGenre}}`)
          .not('provider', 'is', null)
          .order('rating', { ascending: false })
          .limit(100);

        if (providerError) throw providerError;

        // Group content by country
        const countryContentMap = new Map<string, any[]>();
        
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
        
        countryData?.forEach(item => {
          if (item.country && Array.isArray(item.country)) {
            item.country.forEach(country => {
              // Normalize country name
              const normalizedCountry = normalizeCountryName(country);
              
              if (!countryContentMap.has(normalizedCountry)) {
                countryContentMap.set(normalizedCountry, []);
              }
              
              // Add to the country's content list if not already there
              const content = countryContentMap.get(normalizedCountry) || [];
              const exists = content.some(c => c.id === item.id);
              
              if (!exists) {
                content.push({
                  id: item.id,
                  title: item.title,
                  thumbnail_url: item.thumbnail_url || item.poster_url,
                  rating: item.rating,
                  tmdb_id: item.tmdb_id
                });
                
                countryContentMap.set(normalizedCountry, content);
              }
            });
          }
        });
        
        // Group content by provider
        const providerContentMap = new Map<string, any[]>();
        
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
        
        providerData?.forEach(item => {
          if (item.provider && Array.isArray(item.provider)) {
            item.provider.forEach(provider => {
              // Normalize provider name
              const normalizedProvider = normalizeProviderName(provider);
              
              if (!providerContentMap.has(normalizedProvider)) {
                providerContentMap.set(normalizedProvider, []);
              }
              
              // Add to the provider's content list if not already there
              const content = providerContentMap.get(normalizedProvider) || [];
              const exists = content.some(c => c.id === item.id);
              
              if (!exists) {
                content.push({
                  id: item.id,
                  title: item.title,
                  thumbnail_url: item.thumbnail_url || item.poster_url,
                  rating: item.rating,
                  tmdb_id: item.tmdb_id
                });
                
                providerContentMap.set(normalizedProvider, content);
              }
            });
          }
        });

        // Convert to arrays and sort by content count (most content first)
        const countryRecommendations: CountryRecommendation[] = Array.from(countryContentMap.entries())
          .filter(([_, content]) => content.length >= 3) // Only include countries with at least 3 items
          .map(([country, content]) => ({ country, content }))
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, 5); // Limit to top 5 countries
        
        const providerRecommendations: ProviderRecommendation[] = Array.from(providerContentMap.entries())
          .filter(([_, content]) => content.length >= 3) // Only include providers with at least 3 items
          .map(([provider, content]) => ({ provider, content }))
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, 5); // Limit to top 5 providers

        setRecommendations({
          byCountry: countryRecommendations,
          byProvider: providerRecommendations
        });
      } catch (err: any) {
        console.error('Error fetching recommendations:', err);
        setError(err.message || 'An error occurred while fetching recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [selectedGenre, contentType]);

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

  // Only render if we have recommendations
  if (recommendations.byCountry.length === 0 && recommendations.byProvider.length === 0) {
    return null;
  }

  return (
    <div className="py-4 space-y-6">
      <h2 className="text-xl font-bold mb-4">More Recommendations For You</h2>
      
      {/* Country-specific recommendations */}
      {recommendations.byCountry.map(item => (
        item.content.length > 0 && (
          <MovieRow 
            key={`country-${item.country}`}
            title={`${selectedGenre} from ${item.country}`}
            movies={item.content}
            contentType={normalizedContentType}
            limit={10}
          />
        )
      ))}
      
      {/* Provider-specific recommendations */}
      {recommendations.byProvider.map(item => (
        item.content.length > 0 && (
          <MovieRow 
            key={`provider-${item.provider}`}
            title={`${selectedGenre} on ${item.provider}`}
            movies={item.content}
            contentType={normalizedContentType}
            limit={10}
          />
        )
      ))}
    </div>
  );
};

export default GenreRecommendations; 