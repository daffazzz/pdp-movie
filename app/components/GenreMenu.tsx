"use client";

import { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaTags } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface Genre {
  id: string;
  name: string;
}

interface GenreMenuProps {
  genres: Genre[];
  onSelectGenre: (id: string | null) => void;
  selectedGenre: string | null;
  horizontal?: boolean;
  useRouting?: boolean;
  contentType?: 'movie' | 'tvshow';
}

// Helper function to capitalize first letter
const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const GenreMenu: React.FC<GenreMenuProps> = ({ 
  genres, 
  onSelectGenre, 
  selectedGenre, 
  horizontal = false, 
  useRouting = false,
  contentType = 'movie'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const router = useRouter();

  // Check if screen is mobile or tablet size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectGenre = (id: string) => {
    if (useRouting) {
      // Determine the base path based on content type
      const basePath = contentType === 'tvshow' ? '/tvshows' : '/movies';
      
      // Always use sci-fi for Science Fiction in URL routing
      const routeId = id === 'science-fiction' ? 'sci-fi' : id;
      
      router.push(`${basePath}/genre/${routeId}`);
    } else {
      onSelectGenre(id);
    }
    setIsOpen(false);
  };

  const handleSelectAll = () => {
    if (useRouting) {
      // Navigate to the base content type page
      const basePath = contentType === 'tvshow' ? '/tvshows' : '/movies';
      router.push(basePath);
    } else {
      onSelectGenre(null);
    }
    setIsOpen(false);
  };

  const selectedGenreName = selectedGenre 
    ? capitalizeFirstLetter(genres.find(g => g.id === selectedGenre)?.name || '')
    : 'All Genres';

  if (horizontal) {
    return (
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        <button
          onClick={handleSelectAll}
          className={`whitespace-nowrap py-1 px-3 rounded-full text-sm ${
            selectedGenre === null 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
        >
          All
        </button>
        
        {genres.map(genre => (
          <button
            key={genre.id}
            onClick={() => handleSelectGenre(genre.id)}
            className={`whitespace-nowrap py-1 px-3 rounded-full text-sm ${
              selectedGenre === genre.id 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {capitalizeFirstLetter(genre.name)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Dropdown button */}
      <button
        onClick={toggleMenu}
        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-sm flex items-center justify-between min-w-[140px] text-base"
      >
        <span className="truncate max-w-[150px]">{selectedGenreName}</span>
        <FaChevronDown className={`ml-2 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-[10] dropdown-menu mt-1 bg-gray-800 rounded shadow-lg w-screen max-w-[280px] sm:max-w-[380px] md:max-w-[560px] lg:max-w-[640px] right-0 p-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
          <div className="mb-3">
            <button
              onClick={handleSelectAll}
              className={`w-full text-left py-2 px-3 rounded hover:bg-gray-700 ${
                selectedGenre === null ? 'bg-red-600 text-white' : 'text-white'
              } text-base font-medium`}
            >
              All Genres
            </button>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2`}>
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => handleSelectGenre(genre.id)}
                className={`text-left py-2 px-3 rounded hover:bg-gray-700 ${
                  selectedGenre === genre.id ? 'bg-red-600 text-white' : 'text-white'
                } text-base truncate`}
              >
                {capitalizeFirstLetter(genre.name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreMenu; 