/**
 * Aggressive Caching System
 * Multi-layer caching with memory, localStorage, and IndexedDB support
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
  hits: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
}

class AggressiveCache {
  private memoryCache = new Map<string, CacheItem<any>>();
  private maxMemorySize = 500; // Maximum items in memory
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };

  // Default cache durations (in milliseconds)
  private readonly CACHE_DURATIONS = {
    TRENDING: 5 * 60 * 1000,      // 5 minutes
    MOVIES: 30 * 60 * 1000,       // 30 minutes  
    SERIES: 30 * 60 * 1000,       // 30 minutes
    GENRES: 24 * 60 * 60 * 1000,  // 24 hours
    MOVIE_DETAILS: 60 * 60 * 1000, // 1 hour
    USER_DATA: 15 * 60 * 1000,    // 15 minutes
    SEARCH: 10 * 60 * 1000,       // 10 minutes
    DEFAULT: 15 * 60 * 1000       // 15 minutes
  };

  constructor() {
    // Clean up expired items every 5 minutes
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
    }
  }

  /**
   * Set cache with automatic expiry and storage strategy
   */
  set<T>(key: string, data: T, duration?: number): void {
    const expiry = duration || this.CACHE_DURATIONS.DEFAULT;
    const now = Date.now();
    
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiry: now + expiry,
      hits: 0,
      lastAccessed: now
    };

    // Memory cache
    this.setMemoryCache(key, cacheItem);
    
    // Persistent cache for larger items
    if (typeof window !== 'undefined') {
      try {
        // Use localStorage for smaller items
        if (JSON.stringify(data).length < 50000) {
          localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
        }
        // Use IndexedDB for larger items (implement if needed)
      } catch (error) {
        console.warn('Failed to set persistent cache:', error);
      }
    }

    this.stats.sets++;
  }

  /**
   * Get cache with fallback strategy
   */
  get<T>(key: string): T | null {
    const now = Date.now();

    // Try memory cache first
    const memoryCacheItem = this.memoryCache.get(key);
    if (memoryCacheItem && memoryCacheItem.expiry > now) {
      memoryCacheItem.hits++;
      memoryCacheItem.lastAccessed = now;
      this.stats.hits++;
      return memoryCacheItem.data;
    }

    // Try persistent cache
    if (typeof window !== 'undefined') {
      try {
        const persistentData = localStorage.getItem(`cache_${key}`);
        if (persistentData) {
          const cacheItem: CacheItem<T> = JSON.parse(persistentData);
          if (cacheItem.expiry > now) {
            // Restore to memory cache
            cacheItem.hits++;
            cacheItem.lastAccessed = now;
            this.setMemoryCache(key, cacheItem);
            this.stats.hits++;
            return cacheItem.data;
          } else {
            // Remove expired item
            localStorage.removeItem(`cache_${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to get persistent cache:', error);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Get cache with statistics
   */
  getWithStats<T>(key: string): T | null {
    const data = this.get<T>(key);
    if (data) {
      console.log(`Cache HIT: ${key}`);
    } else {
      console.log(`Cache MISS: ${key}`);
    }
    return data;
  }

  /**
   * Delete cache item
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cache_${key}`);
    }
    this.stats.deletes++;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Set memory cache with LRU eviction
   */
  private setMemoryCache<T>(key: string, item: CacheItem<T>): void {
    // If at capacity, evict least recently used item
    if (this.memoryCache.size >= this.maxMemorySize) {
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [k, v] of this.memoryCache.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.memoryCache.set(key, item);
  }

  /**
   * Clean up expired items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry <= now) {
        this.memoryCache.delete(key);
      }
    }

    // Clean persistent cache
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const cacheItem = JSON.parse(data);
              if (cacheItem.expiry <= now) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Remove corrupted cache items
            localStorage.removeItem(key);
          }
        }
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { memorySize: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      memorySize: this.memoryCache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  /**
   * Specialized cache methods for different data types
   */
  
  // Trending cache
  setTrending(key: string, data: any): void {
    this.set(key, data, this.CACHE_DURATIONS.TRENDING);
  }

  // Movies cache
  setMovies(key: string, data: any): void {
    this.set(key, data, this.CACHE_DURATIONS.MOVIES);
  }

  // Series cache
  setSeries(key: string, data: any): void {
    this.set(key, data, this.CACHE_DURATIONS.SERIES);
  }

  // Genres cache (long-lived)
  setGenres(key: string, data: any): void {
    this.set(key, data, this.CACHE_DURATIONS.GENRES);
  }

  // Movie details cache
  setMovieDetails(key: string, data: any): void {
    this.set(key, data, this.CACHE_DURATIONS.MOVIE_DETAILS);
  }

  // Search results cache
  setSearch(key: string, data: any): void {
    this.set(key, data, this.CACHE_DURATIONS.SEARCH);
  }

  // User data cache
  setUserData(key: string, data: any): void {
    this.set(key, data, this.CACHE_DURATIONS.USER_DATA);
  }
}

// Cache key generators
export const CacheKeys = {
  // Trending
  trending: (type: string, page: number) => `trending_${type}_page_${page}`,
  
  // Movies
  movies: (page?: number, filters?: string) => 
    `movies${page ? `_page_${page}` : ''}${filters ? `_${filters}` : ''}`,
  movieDetails: (id: string) => `movie_details_${id}`,
  
  // Series
  series: (page?: number, filters?: string) => 
    `series${page ? `_page_${page}` : ''}${filters ? `_${filters}` : ''}`,
  seriesDetails: (id: string) => `series_details_${id}`,
  
  // Genres
  genres: (type?: string) => `genres${type ? `_${type}` : ''}`,
  
  // Search
  search: (query: string, type?: string, page?: number) => 
    `search_${query}${type ? `_${type}` : ''}${page ? `_page_${page}` : ''}`,
  
  // User data
  watchlist: (userId: string) => `watchlist_${userId}`,
  watchHistory: (userId: string) => `watch_history_${userId}`,
  
  // API responses
  apiResponse: (endpoint: string, params?: string) => 
    `api_${endpoint}${params ? `_${params}` : ''}`,
};

// Global cache instance
export const cache = new AggressiveCache();

// Cache debugging tools
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.cacheDebug = {
    stats: () => cache.getStats(),
    clear: () => cache.clear(),
    cache: cache
  };
}


