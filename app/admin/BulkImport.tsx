import { useState, useEffect } from 'react';
import { FaSearch, FaSpinner, FaCheck, FaTimes, FaFilter, FaDownload, FaPlus, FaDatabase } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';
import { 
  discoverMovies, 
  discoverSeries, 
  discoverMoviesMultiPage,
  discoverSeriesMultiPage,
  getWatchProviders,
  getAvailableRegions,
  TMDB_IMAGE_BASE_URL 
} from './bulk-import-helper';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// TMDB API configuration
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface Genre {
  id: number;
  name: string;
}

interface WatchProvider {
  id: number;
  name: string;
  logo_path: string;
}

interface Region {
  iso_3166_1: string;
  english_name: string;
}

interface BulkImportProps {
  contentType: 'movies' | 'series';
  genreMap: Record<number, string>;
  onImportComplete: () => void;
  processMovieFunction?: (movie: any) => Promise<void>;
  processSeriesFunction?: (series: any) => Promise<void>;
}

export default function BulkImport({
  contentType,
  genreMap,
  onImportComplete,
  processMovieFunction,
  processSeriesFunction
}: BulkImportProps) {
  // State variables
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear() - 5);
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
  const [alreadyImported, setAlreadyImported] = useState<number[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
  const [jumpToPage, setJumpToPage] = useState<number | undefined>(undefined);
  const [isMultiYearMode, setIsMultiYearMode] = useState<boolean>(false);
  const [currentYearInMultiMode, setCurrentYearInMultiMode] = useState<number | null>(null);
  const [useYearFilter, setUseYearFilter] = useState<boolean>(true);
  const [discoverType, setDiscoverType] = useState<'regular' | 'popular'>('regular');

  // Add new state variables:

  const [availableWatchProviders, setAvailableWatchProviders] = useState<Record<string, WatchProvider>>({});
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [selectedWatchProvider, setSelectedWatchProvider] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('ID'); // Default to Indonesia
  const [useProviderFilter, setUseProviderFilter] = useState<boolean>(false);

  // Fetch available genres when component mounts
  useEffect(() => {
    fetchGenres();
    fetchExistingContent();
  }, [contentType]);

  // Fetch already imported content to avoid duplicates
  const fetchExistingContent = async () => {
    try {
      setMessage({
        text: `Fetching list of already imported ${contentType}...`,
        type: 'info'
      });
      
      // Coba gunakan filter neq null
      let data;
      let error;
      
      try {
        // Coba dengan filter neq
        const result = await supabase
          .from(contentType === 'movies' ? 'movies' : 'series')
          .select('tmdb_id')
          .neq('tmdb_id', null)
          .limit(10000);
          
        data = result.data;
        error = result.error;
      } catch (queryError) {
        console.error('First query attempt failed, trying without filter:', queryError);
        
        // Jika gagal, coba tanpa filter (fallback)
        const fallbackResult = await supabase
          .from(contentType === 'movies' ? 'movies' : 'series')
          .select('tmdb_id')
          .limit(10000);
          
        data = fallbackResult.data;
        error = fallbackResult.error;
      }
      
      if (error) throw error;
      
      if (data) {
        // Filter null values in JavaScript instead if needed
        const importedIds = data
          .map(item => item.tmdb_id)
          .filter(id => id !== null && id !== undefined);
        
        setAlreadyImported(importedIds);
        console.log(`Found ${importedIds.length} already imported ${contentType}`);
        
        // Only update the message if we're not in the middle of another operation
        if (!isSearching && !isImporting) {
          setMessage({
            text: `Found ${importedIds.length} already imported ${contentType}. Ready to discover new content.`,
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching existing ${contentType}:`, error);
      // Don't show error message if we're in the middle of another operation
      if (!isSearching && !isImporting) {
        setMessage({
          text: `Error fetching existing ${contentType}. Some duplicates might occur.`,
          type: 'warning'
        });
      }
    }
  };

  // Fetch genres for movies or TV series
  const fetchGenres = async () => {
    try {
      let url = `${TMDB_BASE_URL}/genre/${contentType === 'movies' ? 'movie' : 'tv'}/list?api_key=${TMDB_API_KEY}&language=en-US`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.genres) {
        setAvailableGenres(data.genres);
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
      setMessage({
        text: `Error fetching ${contentType} genres. Please try again.`,
        type: 'error'
      });
    }
  };

  // Fetch available watch providers and regions
  useEffect(() => {
    async function loadWatchProvidersData() {
      try {
        // Get watch providers based on content type
        const providers = await getWatchProviders(contentType === 'movies' ? 'movie' : 'tv');
        setAvailableWatchProviders(providers);
        
        // Get available regions
        const regions = await getAvailableRegions();
        setAvailableRegions(regions);
      } catch (error) {
        console.error('Error loading watch providers data:', error);
        setMessage({
          text: 'Error loading streaming providers. Provider filtering might not work correctly.',
          type: 'warning'
        });
      }
    }
    
    loadWatchProvidersData();
  }, [contentType]);

  // Discover content based on filters
  const discoverContent = async () => {
    setIsSearching(true);
    setMessage({ 
      text: `Searching ${contentType}${useYearFilter ? ` from year ${year || 'any'}` : ' (most popular)'}${
        selectedGenreId ? `, genre ${availableGenres.find(g => g.id === selectedGenreId)?.name || selectedGenreId}` : ''
      }${
        useProviderFilter && selectedWatchProvider ? `, provider ${availableWatchProviders[selectedWatchProvider]?.name || selectedWatchProvider}` : ''
      }, page ${currentPage}...`, 
      type: 'info' 
    });
    setLoadingProgress({ current: 0, total: 5 }); // Initial progress estimate
    
    try {
      // Calculate the correct API starting page
      // TMDB shows 20 items per page, but our UI shows 100 items per page (5 TMDB pages)
      const apiStartPage = ((currentPage - 1) * 5) + 1;
      
      // Call the appropriate discover function based on content type
      const multiPageFunction = contentType === 'movies' ? discoverMoviesMultiPage : discoverSeriesMultiPage;
      
      // Prepare provider filter parameters
      const watchProvider = useProviderFilter && selectedWatchProvider ? selectedWatchProvider : undefined;
      const watchRegion = useProviderFilter && selectedWatchProvider ? selectedRegion : undefined;
      
      // Log untuk debugging
      console.log(`Discovering ${contentType} with: year=${useYearFilter ? year : 'undefined (filter disabled)'}, 
        genreId=${selectedGenreId || 'undefined'}, startPage=${apiStartPage}, 
        provider=${watchProvider || 'undefined'}, region=${watchRegion || 'undefined'}`);
      
      const result = await multiPageFunction({
        year: useYearFilter ? year : undefined, // Hanya gunakan year jika useYearFilter = true
        genreId: selectedGenreId || undefined,
        startPage: apiStartPage,
        maxResults: 100,
        watchProvider,
        watchRegion
      });
      
      // Update loading progress during fetch
      for (let i = 1; i <= 5; i++) {
        setLoadingProgress({ current: i, total: 5 });
        // Small delay to show the progress bar animation
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (result.results.length === 0) {
        setMessage({
          text: `No ${contentType} found matching your criteria${useYearFilter ? ` from year ${year}` : ' from popular titles'} on page ${currentPage}.`,
          type: 'info'
        });
        setSearchResults([]);
        setTotalPages(0);
      } else {
        setSearchResults(result.results);
        
        // Calculate total UI pages (each page shows 100 items)
        const totalUiPages = Math.ceil(result.total_results / 100);
        setTotalPages(totalUiPages);
        
        // Calculate item range for this page
        const startItem = ((currentPage - 1) * 100) + 1;
        const endItem = Math.min(currentPage * 100, ((currentPage - 1) * 100) + result.results.length);
        
        setMessage({
          text: `Found ${result.total_results} ${contentType}${useYearFilter ? ` from year ${year}` : ' (most popular)'}${
            selectedGenreId ? `, genre ${availableGenres.find(g => g.id === selectedGenreId)?.name || selectedGenreId}` : ''
          }. Showing items ${startItem}-${endItem} of ${result.total_results} (page ${currentPage} of ${totalUiPages}).`,
          type: 'success'
        });
      }
    } catch (error: any) {
      console.error(`Error discovering ${contentType}:`, error);
      setMessage({
        text: `Error: ${error.message}`,
        type: 'error'
      });
      setSearchResults([]);
      setTotalPages(0);
    } finally {
      setIsSearching(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !isSearching) {
      // Bersihkan hasil pencarian sebelumnya untuk menghindari kebingungan
      setSearchResults([]);
      // Perbarui halaman
      setCurrentPage(newPage);
      // Tampilkan pesan loading
      setMessage({ 
        text: `Loading page ${newPage} of ${totalPages}...`, 
        type: 'info' 
      });
      // Jalankan pencarian dengan halaman baru
      setTimeout(() => {
        discoverContent();
      }, 100); // Delay sedikit untuk memastikan state sudah diperbarui
    }
  };

  // Toggle selection of an item
  const toggleItemSelection = (item: any) => {
    // Check if the item is already selected by comparing both ID and title/name
    const isItemSelected = selectedItems.some(
      selected => selected.id === item.id && 
      (contentType === 'movies' ? selected.title === item.title : selected.name === item.name)
    );
    
    if (isItemSelected) {
      setSelectedItems(selectedItems.filter(
        selected => !(selected.id === item.id && 
        (contentType === 'movies' ? selected.title === item.title : selected.name === item.name))
      ));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (selectedItems.length === 0) {
      setMessage({
        text: `Please select at least one ${contentType === 'movies' ? 'movie' : 'series'} to import.`,
        type: 'error'
      });
      return;
    }
    
    // For series, show a more detailed warning to the user
    if (contentType === 'series' && selectedItems.length > 5) {
      if (!confirm(`You're about to import ${selectedItems.length} series. This will process each series one at a time to ensure all episodes are properly added. This may take a while. Continue?`)) {
        return;
      }
    }
    
    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedItems.length });
    let successCount = 0;
    let failedCount = 0;
    
    // Track failed items for retry
    const failedItems = [];
    const maxRetries = 2; // Maximum number of retry attempts
    
    try {
      // Process only 1 series at a time to ensure episodes are properly associated with their parent series
      // This helps avoid race conditions where episodes might be added for series that don't exist yet
      const batchSize = 1;
      const totalBatches = Math.ceil(selectedItems.length / batchSize);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Get current batch of items
        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min(startIdx + batchSize, selectedItems.length);
        const currentBatch = selectedItems.slice(startIdx, endIdx);
        
        // Process batch in parallel
        const batchPromises = currentBatch.map(async (item, itemIndex) => {
          const overallIndex = startIdx + itemIndex;
          try {
            // Process the item based on content type
            if (contentType === 'movies' && processMovieFunction) {
              await processMovieFunction(item);
              return { success: true };
            } else if (contentType === 'series' && processSeriesFunction) {
              await processSeriesFunction(item);
              // Add a delay after processing each series to ensure database operations complete
              await new Promise(resolve => setTimeout(resolve, 1000));
              return { success: true };
            }
            return { success: false, error: new Error('Processing function not available') };
          } catch (error: any) {
            // Add to failed items for potential retry
            failedItems.push({ item, error, retryCount: 0 });
            
            return { 
              success: false, 
              error, 
              item,
              message: `Error processing ${item.title || item.name}: ${error.message || 'Unknown error'}`
            };
          }
        });
        
        // Wait for all items in the batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Process batch results
        batchResults.forEach((result, idx) => {
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            console.error(`Error processing ${contentType === 'movies' ? 'movie' : 'series'}:`, result.error);
            
            // Display error but continue with next items
            if (result.message) {
              setMessage({
                text: result.message,
                type: 'error'
              });
            }
          }
          
          // Update progress after each item is processed
          setImportProgress({ current: startIdx + idx + 1, total: selectedItems.length });
        });
      }
      
      // Attempt to retry failed items if there are any
      if (failedItems.length > 0 && maxRetries > 0) {
        setMessage({
          text: `Retrying ${failedItems.length} failed items...`,
          type: 'info'
        });
        
        // Implement retry logic here in a future update
        console.log(`Would retry ${failedItems.length} items`);
      }
      
      // Final message
      if (failedCount > 0) {
        setMessage({
          text: `Import completed with some errors: ${successCount} succeeded, ${failedCount} failed. Check console for details.`,
          type: failedCount === selectedItems.length ? 'error' : 'warning'
        });
      } else {
        setMessage({
          text: `Successfully imported ${successCount} ${contentType}.`,
          type: 'success'
        });
      }
      
      // Clear selected items
      setSelectedItems([]);
      
      // Update the list of already imported content
      fetchExistingContent();
      
      // Notify parent component only if there were successful imports
      if (successCount > 0) {
        onImportComplete();
      }
    } catch (error: any) {
      console.error(`Error importing ${contentType}:`, error);
      
      // Extract and show specific database error if available
      let errorMessage = error.message || 'Unknown error';
      if (error.code === 'PGRST109' && error.details?.includes('genres')) {
        errorMessage = "Database schema error: 'genres' column not found. The database expects 'genre' (as an array).";
      } else if (error.code && error.details) {
        errorMessage = `${error.message} - ${error.details}`;
      }
      
      setMessage({
        text: `Error importing ${contentType}: ${errorMessage}`,
        type: 'error'
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Select all items on the current page
  const selectAll = () => {
    // Create a combined array, ensuring no duplicates
    const combinedItems = [...selectedItems];
    
    searchResults.forEach(item => {
      // Skip if already imported
      if (alreadyImported.includes(item.id)) return;
      
      // Skip if already in the selectedItems array
      const isDuplicate = combinedItems.some(
        existing => existing.id === item.id && 
        (contentType === 'movies' ? existing.title === item.title : existing.name === item.name)
      );
      
      if (!isDuplicate) {
        combinedItems.push(item);
      }
    });
    
    setSelectedItems(combinedItems);
  };

  // Deselect all items
  const deselectAll = () => {
    setSelectedItems([]);
  };

  // Import maximum amount of content
  const importMax = async () => {
    setIsSearching(true);
    setMessage({
      text: `Preparing to import maximum amount of ${contentType}. This might take a while...`,
      type: 'info'
    });

    try {
      // Calculate how many items we can reasonably process
      const maxPages = 50; // Set maximum number of pages to process
      const itemsPerPage = 100;
      const maxItems = 1000; // Set maximum number of items to import
      
      // Keep track of total items added
      let totalItemsAdded = 0;
      let allItems: any[] = [];
      
      // Start with the current filters but process multiple pages
      for (let page = 1; page <= maxPages; page++) {
        if (totalItemsAdded >= maxItems) break;
        
        // Calculate API start page
        const apiStartPage = ((page - 1) * 5) + 1;
        
        // Show progress
        setMessage({
          text: `Discovering page ${page}/${maxPages} (${totalItemsAdded}/${maxItems} items found)...${useYearFilter ? ` (Year: ${year})` : ' (Most Popular)'}`,
          type: 'info'
        });
        
        // Call the appropriate discover function based on content type
        const multiPageFunction = contentType === 'movies' ? discoverMoviesMultiPage : discoverSeriesMultiPage;
        
        // Prepare provider filter parameters
        const watchProvider = useProviderFilter && selectedWatchProvider ? selectedWatchProvider : undefined;
        const watchRegion = useProviderFilter && selectedWatchProvider ? selectedRegion : undefined;
        
        const result = await multiPageFunction({
          year: useYearFilter ? year : undefined, // Hanya gunakan year jika useYearFilter = true
          genreId: selectedGenreId || undefined,
          startPage: apiStartPage,
          maxResults: itemsPerPage,
          watchProvider,
          watchRegion
        });
        
        if (result.results.length === 0) {
          break; // No more results
        }
        
        // Filter out already imported content
        const newItems = result.results.filter(item => !alreadyImported.includes(item.id));
        
        if (newItems.length === 0) {
          // If this page had no new items, try the next page
          continue;
        }
        
        // Add new items to our collection
        allItems = [...allItems, ...newItems];
        totalItemsAdded += newItems.length;
        
        // If we have enough items, stop searching
        if (totalItemsAdded >= maxItems) {
          break;
        }
      }
      
      if (allItems.length === 0) {
        setMessage({
          text: `No new ${contentType} found to import. Try changing filters or ${useYearFilter ? 'year' : 'unchecking year filter'}.`,
          type: 'warning'
        });
      } else {
        // Limit to maxItems
        const itemsToImport = allItems.slice(0, maxItems);
        
        setMessage({
          text: `Found ${itemsToImport.length} new ${contentType} to import${useYearFilter ? ` from year ${year}` : ' (most popular)'}${
            useProviderFilter && selectedWatchProvider ? ` from provider ${availableWatchProviders[selectedWatchProvider]?.name || selectedWatchProvider}` : ''
          }. Starting import process...`,
          type: 'success'
        });
        
        // Set selected items and trigger import
        setSelectedItems(itemsToImport);
        
        // Short timeout to ensure state updates before import starts
        setTimeout(() => {
          handleBulkImport();
        }, 500);
      }
    } catch (error: any) {
      console.error(`Error preparing max import:`, error);
      setMessage({
        text: `Error preparing import: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Process multiple years and import content automatically
  const multiYearImport = async () => {
    if (!confirm(`This will search for ${contentType} from ${startYear} to ${endYear} and import them automatically. Continue?`)) {
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Configure our search parameters
      const allItemsToImport: any[] = [];
      const yearsToProcess = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i
      );
      
      // Process each year
      let currentYear = startYear;
      
      for (const yearToProcess of yearsToProcess) {
        setCurrentYearInMultiMode(yearToProcess);
        
        setMessage({
          text: `Searching ${contentType} from year ${yearToProcess}...`,
          type: 'info'
        });
        
        try {
          // Use the appropriate discovery function
          const multiPageFunction = contentType === 'movies' ? discoverMoviesMultiPage : discoverSeriesMultiPage;
          
          // Prepare provider filter parameters
          const watchProvider = useProviderFilter && selectedWatchProvider ? selectedWatchProvider : undefined;
          const watchRegion = useProviderFilter && selectedWatchProvider ? selectedRegion : undefined;
          
          const result = await multiPageFunction({
            year: useYearFilter ? yearToProcess : undefined, // Hanya gunakan year jika useYearFilter = true
            genreId: selectedGenreId || undefined,
            startPage: 1,
            maxResults: 100,
            watchProvider,
            watchRegion
          });
          
          // Filter out already imported items
          const newItems = result.results.filter(item => !alreadyImported.includes(item.id));
          
          if (newItems.length > 0) {
            allItemsToImport.push(...newItems);
            
            setMessage({
              text: `Found ${newItems.length} new ${contentType} from ${useYearFilter ? `year ${yearToProcess}` : 'popular titles'} (total: ${allItemsToImport.length})`,
              type: 'success'
            });
          } else {
            setMessage({
              text: `No new ${contentType} found from ${useYearFilter ? `year ${yearToProcess}` : 'popular titles'}`,
              type: 'info'
            });
          }
        } catch (yearError: any) {
          console.error(`Error processing year ${yearToProcess}:`, yearError);
          setMessage({
            text: `Error with ${useYearFilter ? `year ${yearToProcess}` : 'popular titles'}: ${yearError.message}. Continuing with next year...`,
            type: 'error'
          });
        }
        
        currentYear++;
        
        // Pause briefly to allow UI updates and avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setCurrentYearInMultiMode(null);
      
      if (allItemsToImport.length === 0) {
        setMessage({
          text: `No new ${contentType} found to import${useYearFilter ? ` from years ${startYear} to ${endYear}` : ' from popular titles'}. Try different criteria.`,
          type: 'warning'
        });
      } else {
        // Limit to a reasonable amount if too many items were found
        const maxItemsToImport = 500;
        const itemsToImport = allItemsToImport.slice(0, maxItemsToImport);
        
        setMessage({
          text: `Found ${allItemsToImport.length} new ${contentType}${useYearFilter ? ` from years ${startYear}-${endYear}` : ' (most popular)'} (importing first ${itemsToImport.length})...`,
          type: 'success'
        });
        
        // Set selected items and trigger import
        setSelectedItems(itemsToImport);
        
        // Short timeout to ensure state updates before import starts
        setTimeout(() => {
          handleBulkImport();
        }, 500);
      }
    } catch (error: any) {
      console.error(`Error in multi-year import:`, error);
      setMessage({
        text: `Error during multi-year import: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsSearching(false);
      setCurrentYearInMultiMode(null);
    }
  };

  return (
    <div className="bulk-import-container">
      <h2 className="text-xl font-bold mb-4">Bulk Import {contentType === 'movies' ? 'Movies' : 'TV Series'}</h2>
      
      {/* Filter controls */}
      <div className="filter-controls grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-800 rounded-lg">
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="multiYearToggle"
              checked={isMultiYearMode}
              onChange={() => setIsMultiYearMode(!isMultiYearMode)}
              className="mr-2"
            />
            <label htmlFor="multiYearToggle" className="text-sm font-medium">Multi-Year Mode</label>
          </div>
          
          {isMultiYearMode ? (
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="yearFilterToggleMulti"
                  checked={useYearFilter}
                  onChange={() => setUseYearFilter(!useYearFilter)}
                  className="mr-2"
                />
                <label htmlFor="yearFilterToggleMulti" className="text-sm font-medium">Filter by Year</label>
              </div>
              
              {useYearFilter ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs mb-1">Start Year</label>
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 5}
                      value={startYear}
                      onChange={(e) => setStartYear(parseInt(e.target.value))}
                      className="w-full p-2 bg-gray-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">End Year</label>
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 5}
                      value={endYear}
                      onChange={(e) => setEndYear(parseInt(e.target.value))}
                      className="w-full p-2 bg-gray-700 rounded"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 p-2 bg-gray-700 rounded">
                  No year filter - will import most popular content
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="yearFilterToggle"
                  checked={useYearFilter}
                  onChange={() => setUseYearFilter(!useYearFilter)}
                  className="mr-2"
                />
                <label htmlFor="yearFilterToggle" className="text-sm font-medium">Filter by Year</label>
              </div>
              
              {useYearFilter ? (
                <>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 5}
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full p-2 bg-gray-700 rounded"
                  />
                </>
              ) : (
                <div className="text-sm text-gray-400 p-2 bg-gray-700 rounded">
                  No year filter - will show most popular content
                </div>
              )}
            </>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Genre</label>
          <select
            value={selectedGenreId || ''}
            onChange={(e) => setSelectedGenreId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full p-2 bg-gray-700 rounded"
          >
            <option value="">All Genres</option>
            {availableGenres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="providerFilterToggle"
              checked={useProviderFilter}
              onChange={() => setUseProviderFilter(!useProviderFilter)}
              className="mr-2"
            />
            <label htmlFor="providerFilterToggle" className="text-sm font-medium">Filter by Provider</label>
          </div>
          
          {useProviderFilter ? (
            <div className="space-y-2">
              <label className="block text-xs mb-1">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              >
                {availableRegions.map((region) => (
                  <option key={region.iso_3166_1} value={region.iso_3166_1}>
                    {region.english_name}
                  </option>
                ))}
              </select>
              
              <label className="block text-xs mb-1">Provider</label>
              <select
                value={selectedWatchProvider || ''}
                onChange={(e) => setSelectedWatchProvider(e.target.value || null)}
                className="w-full p-2 bg-gray-700 rounded"
              >
                <option value="">Select Provider</option>
                {Object.entries(availableWatchProviders).map(([id, provider]) => (
                  <option key={id} value={id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-sm text-gray-400 p-2 bg-gray-700 rounded">
              No provider filter - will show content from all services
            </div>
          )}
        </div>

        <div className="flex items-end md:col-span-2">
          {isMultiYearMode ? (
            <button
              onClick={multiYearImport}
              disabled={isSearching || isImporting}
              className="w-full p-2 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center"
            >
              {isSearching ? (
                <><FaSpinner className="animate-spin mr-2" /> Processing Years {currentYearInMultiMode && `(${currentYearInMultiMode})`}...</>
              ) : (
                <><FaSearch className="mr-2" /> {useYearFilter ? `Import from ${startYear}-${endYear} (All Years)` : `Import Popular ${contentType === 'movies' ? 'Movies' : 'Series'} (All Pages)`}</>
              )}
            </button>
          ) : (
            <button
              onClick={discoverContent}
              disabled={isSearching}
              className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center justify-center"
            >
              {isSearching ? (
                <><FaSpinner className="animate-spin mr-2" /> Searching...</>
              ) : (
                <><FaSearch className="mr-2" /> Discover {useYearFilter ? `${contentType === 'movies' ? 'Movies' : 'Series'} from ${year}` : `Popular ${contentType === 'movies' ? 'Movies' : 'Series'}`} (Up to 100 items)</>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Loading progress indicator */}
      {isSearching && loadingProgress.total > 0 && (
        <div className="mt-2 mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Loading data...</span>
            <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Message display */}
      {message.text && (
        <div className={`p-3 mb-4 rounded ${message.type === 'error' ? 'bg-red-700' : message.type === 'success' ? 'bg-green-700' : 'bg-blue-700'}`}>
          {message.text}
        </div>
      )}
      
      {/* Results controls with pagination */}
      {searchResults.length > 0 && (
        <div className="mb-4">
          {/* Top controls: Selection and item count */}
          <div className="results-controls flex flex-col sm:flex-row justify-between mb-2 gap-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex space-x-2 items-center">
              <button
                onClick={selectAll}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                Select All ({searchResults.filter(item => !alreadyImported.includes(item.id)).length})
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                disabled={selectedItems.length === 0}
              >
                Deselect All ({selectedItems.length})
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={importMax}
                disabled={isSearching || isImporting}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center"
                title="Import up to 1000 items automatically"
              >
                <FaDownload className="mr-1" /> Import Max (1000)
              </button>
              <FaDatabase className="text-gray-400" />
              <span className="text-sm text-gray-400">
                {searchResults.length} items loaded
              </span>
            </div>
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="pagination-controls flex items-center mt-2 mb-2 gap-2 p-2 bg-gray-800 rounded-lg">
              <div className="hidden sm:flex items-center">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  Showing {((currentPage - 1) * 100) + 1}-{Math.min(currentPage * 100, searchResults.length + ((currentPage - 1) * 100))} of {totalPages * 100} items
                </span>
              </div>
              
              <div className="flex-grow flex items-center justify-center gap-1 flex-wrap">
                {/* First page button */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage <= 1 || isSearching}
                  className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  title="First page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isSearching}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Prev
                </button>
                
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Calculate which page numbers to show
                    let pageNum = 1;
                    if (totalPages <= 5) {
                      // Show 1 through totalPages if we have 5 or fewer pages
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      // If we're at the beginning, show 1-5
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      // If we're at the end, show last 5 pages
                      pageNum = totalPages - 4 + i;
                    } else {
                      // Otherwise, show 2 before and 2 after current page
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={pageNum === currentPage || isSearching}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs
                          ${pageNum === currentPage 
                            ? 'bg-blue-600 text-white font-bold' 
                            : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isSearching}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-xs"
                >
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Last page button */}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages || isSearching}
                  className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  title="Last page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 15.707a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L8.586 10 4.293 14.293a1 1 0 000 1.414zm6 0a1 1 0 001.414 0l5-5a1 1 0 000-1.414l-5-5a1 1 0 00-1.414 1.414L14.586 10l-4.293 4.293a1 1 0 000 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}
          
          {/* Page jump input below the main pagination controls */}
          {totalPages > 5 && (
            <div className="pagination-jump flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-gray-400">Jump to page:</span>
              <div className="flex">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpToPage || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= totalPages) {
                      setJumpToPage(value);
                    } else if (e.target.value === '') {
                      setJumpToPage(undefined);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && jumpToPage) {
                      handlePageChange(jumpToPage);
                      setJumpToPage(undefined);
                    }
                  }}
                  className="w-16 h-6 px-2 text-xs bg-gray-700 border border-gray-600 rounded-l focus:outline-none focus:border-gray-500"
                  placeholder={`1-${totalPages}`}
                  disabled={isSearching}
                />
                <button
                  onClick={() => {
                    if (jumpToPage) {
                      handlePageChange(jumpToPage);
                      setJumpToPage(undefined);
                    }
                  }}
                  disabled={!jumpToPage || isSearching}
                  className="h-6 px-2 bg-gray-600 hover:bg-gray-500 text-xs rounded-r disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Go
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-6">
          {searchResults.map((item, index) => {
            const isSelected = selectedItems.some(
              selected => selected.id === item.id && 
              (contentType === 'movies' ? selected.title === item.title : selected.name === item.name)
            );
            const isAlreadyImported = alreadyImported.includes(item.id);
            const title = contentType === 'movies' ? item.title : item.name;
            const releaseDate = contentType === 'movies' ? item.release_date : item.first_air_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear() : 'Unknown';
            
            return (
              <div
                key={`${item.id}-${index}`}
                className={`relative rounded overflow-hidden border-2 
                  ${isSelected ? 'border-green-500' : isAlreadyImported ? 'border-yellow-500 opacity-50' : 'border-gray-700'}`}
              >
                {isAlreadyImported && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-black px-2 py-1 text-xs">
                    Imported
                  </div>
                )}
                
                <div className="relative pb-[150%]">
                  {item.poster_path ? (
                    <img
                      src={`${TMDB_IMAGE_BASE_URL}/w300${item.poster_path}`}
                      alt={title}
                      className="absolute w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute w-full h-full bg-gray-800 flex items-center justify-center">
                      No Image
                    </div>
                  )}
                  
                  {/* Quick selection overlay for non-imported items */}
                  {!isAlreadyImported && (
                    <div 
                      className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => toggleItemSelection(item)}
                    >
                      <button className={`p-2 rounded-full ${isSelected ? 'bg-red-500' : 'bg-green-500'}`}>
                        {isSelected ? <FaTimes /> : <FaPlus />}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-2 bg-gray-800">
                  <h3 className="font-medium text-xs truncate" title={title}>{title}</h3>
                  <p className="text-xs text-gray-400">{year} • {item.vote_average}/10</p>
                  
                  <button
                    onClick={() => !isAlreadyImported && toggleItemSelection(item)}
                    disabled={isAlreadyImported}
                    className={`mt-2 w-full p-1 text-xs rounded flex items-center justify-center
                      ${isSelected 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : isAlreadyImported 
                          ? 'bg-gray-600 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isSelected ? (
                      <><FaCheck className="mr-1" /> Selected</>
                    ) : isAlreadyImported ? (
                      <><FaCheck className="mr-1" /> Imported</>
                    ) : (
                      <><FaPlus className="mr-1" /> Select</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Import controls */}
      {selectedItems.length > 0 && (
        <div className="import-controls sticky bottom-0 p-4 bg-gray-900 border-t border-gray-700 mt-4">
          <div className="flex justify-between items-center">
            <span>{selectedItems.length} items selected</span>
            
            <button
              onClick={handleBulkImport}
              disabled={isImporting || selectedItems.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center"
            >
              {isImporting ? (
                <><FaSpinner className="animate-spin mr-2" /> Importing {importProgress.current}/{importProgress.total}...</>
              ) : (
                <><FaDownload className="mr-2" /> Import {selectedItems.length} {contentType}</>
              )}
            </button>
          </div>
          
          {isImporting && (
            <div className="mt-2">
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full" 
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 