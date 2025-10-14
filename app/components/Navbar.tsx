"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { FaSearch, FaBell, FaBars, FaTimes, FaSpinner } from "react-icons/fa";
import { useRouter, usePathname } from "next/navigation";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isClickOnSearchButton = searchButtonRef.current?.contains(event.target as Node);
      const isClickOnSearchInput = searchInputRef.current?.contains(event.target as Node);
      const isClickOnMobileSearch = mobileSearchRef.current?.contains(event.target as Node);
      
      if (!isClickOnSearchButton && !isClickOnSearchInput && !isClickOnMobileSearch) {
        setShowSearchInput(false);
        setSearchError(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    
    if (!searchQuery.trim()) {
      setSearchError("Please enter a search term");
      return;
    }
    
    if (searchQuery.trim().length < 2) {
      setSearchError("Search term too short");
      return;
    }
    
    try {
      setIsSearching(true);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchInput(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Search navigation error:", error);
      setSearchError("Error navigating to search");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSearchInput = () => {
    setShowSearchInput(!showSearchInput);
    setSearchError(null);
    
    if (!showSearchInput) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <>
      <nav
        className={`px-0.5 sm:px-1 md:px-5 py-0.5 flex items-center justify-between transition duration-300 z-[100] w-full fixed ${
          isScrolled || mobileMenuOpen ? "bg-background/80 backdrop-blur-lg" : "bg-transparent"
        }`}
      >
        <div className="flex items-center flex-1">
          <button 
            className="ml-1.5 sm:ml-2 mr-0.5 sm:mr-1 text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>
          
          <Link href="/" className="flex items-center ml-1.5 sm:ml-2 md:ml-3">
            <Image 
              src="/logo_pdp_movie.png" 
              alt="PDP Movie Logo" 
              width={55} 
              height={20} 
              className="object-contain sm:w-[60px] md:w-[70px]"
              priority
            />
          </Link>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 pr-2 md:pr-3 mr-0 sm:mr-0 relative right-4 sm:right-2 md:right-0">
          <div className="hidden md:flex gap-5 lg:gap-6 text-xs md:text-sm ml-4">
            <Link href="/" className={`font-medium transition-colors ${pathname === '/' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}>
              Home
            </Link>
            <Link href="/movies" className={`font-medium transition-colors ${pathname === '/movies' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}>
              Movies
            </Link>
            <Link href="/tvshows" className={`font-medium transition-colors ${pathname === '/tvshows' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}>
              TV Shows
            </Link>
            <Link href="/new" className={`font-medium transition-colors ${pathname === '/new' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}>
              New & Popular
            </Link>
          </div>
          
          <div className="relative flex items-center md:hidden" ref={mobileSearchRef}>
            {showSearchInput && (
              <div 
                className="absolute right-8 sm:right-10 top-[-2px] w-[180px] sm:w-[220px]"
                onClick={(e) => e.stopPropagation()}
              >
                <form onSubmit={handleSearch} className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies..."
                    className="bg-transparent border border-gray-600 text-white py-1.5 px-3 rounded-md w-full text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    disabled={isSearching}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <FaSpinner className="animate-spin text-gray-400" size={12} />
                    </div>
                  )}
                  {searchError && (
                    <div className="absolute left-0 top-full mt-1 bg-red-900/95 text-white text-xs py-1 px-2 rounded-md z-50 w-full shadow-md">
                      {searchError}
                    </div>
                  )}
                </form>
              </div>
            )}
            
            <button 
              className="text-white search-toggle p-1.5 hover:bg-gray-800/50 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleSearchInput();
              }}
              aria-label="Search"
            >
              <FaSearch size={16} className="sm:text-sm" />
            </button>
          </div>
          
          <div className="hidden md:block relative">
            <button 
              ref={searchButtonRef}
              className="text-white search-toggle p-1.5 hover:bg-gray-800/50 rounded-full transition-colors"
              onClick={toggleSearchInput}
              aria-label="Search"
            >
              <FaSearch size={16} className="sm:text-sm" />
            </button>
            
            {showSearchInput && (
              <div className="absolute right-0 top-[35px] z-50 w-[320px] animate-fadeIn">
                <div className="bg-background/80 backdrop-blur-lg rounded-lg border border-gray-700 p-3 shadow-xl">
                  <form onSubmit={handleSearch} className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies or TV shows..."
                      className="bg-transparent border border-gray-600 text-white py-2.5 px-4 rounded-md w-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      disabled={isSearching}
                    />
                    {isSearching && (
                      <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2">
                        <FaSpinner className="animate-spin text-gray-400" size={16} />
                      </div>
                    )}
                    {searchError && (
                      <div className="absolute left-0 top-full mt-1.5 bg-red-900/95 text-white text-xs py-1.5 px-3 rounded-md z-50 w-full shadow-md">
                        {searchError}
                      </div>
                    )}
                    <button 
                      type="submit" 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      disabled={isSearching}
                    >
                      {!isSearching && <FaSearch size={16} />}
                    </button>
                  </form>
                  <div className="mt-2 text-xs text-gray-400">
                    <p>Press Enter to search</p>
                  </div>
                </div>
                <div className="absolute -top-2 right-3 w-4 h-4 bg-background/80 border-t border-l border-gray-700 transform rotate-45"></div>
              </div>
            )}
          </div>
          
          <button className="text-white">
            <FaBell size={16} className="sm:text-sm" />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-gray-800 py-2 md:hidden z-40">
            <div className="flex flex-col space-y-3 px-3 sm:px-4">
              <Link 
                href="/" 
                className={`py-1.5 text-sm font-medium transition-colors ${pathname === '/' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/movies" 
                className={`py-1.5 text-sm font-medium transition-colors ${pathname === '/movies' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Movies
              </Link>
              <Link 
                href="/tvshows" 
                className={`py-1.5 text-sm font-medium transition-colors ${pathname === '/tvshows' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                TV Shows
              </Link>
              <Link 
                href="/new" 
                className={`py-1.5 text-sm font-medium transition-colors ${pathname === '/new' ? 'text-red-500' : 'text-white hover:text-gray-300'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                New & Popular
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;