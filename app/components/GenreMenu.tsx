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

  // Group genres into columns (4 columns untuk lebih padat)
  const columnCount = 4;
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
        className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-sm flex items-center justify-between min-w-[120px] text-sm"
      >
        <span>{selectedGenreName}</span>
        <FaChevronDown className={`ml-2 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-gray-800 rounded shadow-lg w-[640px] right-0 p-3 grid grid-cols-4 gap-2 text-sm">
          <div className="col-span-4 mb-1">
            <button
              onClick={handleSelectAll}
              className={`w-full text-left py-1 px-2 rounded-sm hover:bg-gray-700 ${
                selectedGenre === null ? 'bg-red-600 text-white' : 'text-white'
              } text-sm`}
            >
              All Genres
            </button>
          </div>

          {columns.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-1">
              {column.map(genre => (
                <button
                  key={genre.id}
                  onClick={() => handleSelectGenre(genre.id)}
                  className={`text-left py-1 px-2 rounded-sm hover:bg-gray-700 ${
                    selectedGenre === genre.id ? 'bg-red-600 text-white' : 'text-white'
                  } text-sm truncate`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenreMenu; 