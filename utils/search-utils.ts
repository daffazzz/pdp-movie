const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface SearchResult {
  id: string;
  title: string;
  thumbnail_url: string;
  rating: number;
  tmdb_id?: number;
  contentType: 'movie' | 'tvshow';
}

const transformTMDBData = (item: any): SearchResult | null => {
    if (item.media_type !== 'movie' && item.media_type !== 'tv') {
        return null;
    }

    return {
        id: item.id.toString(),
        tmdb_id: item.id,
        title: item.title || item.name,
        thumbnail_url: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        rating: item.vote_average,
        contentType: item.media_type === 'movie' ? 'movie' : 'tvshow',
    };
};

export async function enhancedSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim() || !TMDB_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`
    );

    if (!response.ok) {
      throw new Error(`TMDB API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return [];
    }

    const results = data.results
        .map(transformTMDBData)
        .filter((item: SearchResult | null): item is SearchResult => item !== null);

    return results.sort((a, b) => b.rating - a.rating);

  } catch (err: any) {
    console.error('Error performing enhanced search:', err);
    throw new Error(`Enhanced search failed: ${err.message}`);
  }
}