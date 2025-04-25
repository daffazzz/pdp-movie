"use client";

import { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

interface Genre {
  id: string;
  name: string;
}

interface GenreMenuProps {
  genres: Genre[];
  onSelectGenre: (id: string | null) => void;
  selectedGenre: string | null;
}

const GenreMenu: React.FC<GenreMenuProps> = ({ genres, onSelectGenre, selectedGenre }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

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

  // Group genres into columns (responsive based on screen size)
  const getColumnCount = () => {
    if (isMobile) return 2; // 2 columns on mobile
    if (isTablet) return 3; // 3 columns on tablet
    return 4; // 4 columns on desktop
  };
  
  const columnCount = getColumnCount();
  const genresPerColumn = Math.ceil(genres.length / columnCount);
  
  const columns: Genre[][] = [];
  for (let i = 0; i < columnCount; i++) {
    columns.push(genres.slice(i * genresPerColumn, (i + 1) * genresPerColumn));
  }

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
    onSelectGenre(id);
    setIsOpen(false);
  };

  const handleSelectAll = () => {
    onSelectGenre(null);
    setIsOpen(false);
  };

  const selectedGenreName = selectedGenre 
    ? genres.find(g => g.id === selectedGenre)?.name 
    : 'Genre';

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
        <div className="absolute z-50 mt-1 bg-gray-800 rounded shadow-lg w-screen max-w-[280px] sm:max-w-[380px] md:max-w-[560px] lg:max-w-[640px] right-0 p-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
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
                {genre.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreMenu; 