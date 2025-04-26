"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { FaSearch, FaBell, FaUser, FaCog, FaBars, FaTimes, FaSpinner } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, loading, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      
      // Close search input when clicking outside
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node) && 
          !(event.target as Element).classList.contains('search-toggle')) {
        setShowSearchInput(false);
        setSearchError(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search submission
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

  // Toggle search input visibility
  const toggleSearchInput = () => {
    setShowSearchInput(!showSearchInput);
    setSearchError(null);
    
    // Focus the input when it becomes visible
    if (!showSearchInput) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    setUserMenuOpen(false);
  };

  return (
    <nav
      className={`px-0.5 sm:px-1 md:px-5 py-0.5 flex items-center justify-between transition duration-500 z-[100] w-full fixed ${
        isScrolled || mobileMenuOpen ? "bg-[#0c0908]" : "bg-gradient-to-b from-[#0c0908]/70 to-transparent"
      }`}
    >
      <div className="flex items-center flex-1">
        {/* Mobile menu button */}
        <button 
          className="mr-0.5 sm:mr-1 text-white md:hidden"
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

      <div className="flex-1">
        {/* Spacer */}
      </div>

      <div className="flex items-center gap-3 sm:gap-4 md:gap-5 pr-2 md:pr-3 mr-0 sm:mr-0 relative right-4 sm:right-2 md:right-0">
        {/* Desktop navigation */}
        <div className="hidden md:flex gap-4 text-xs ml-4">
          <Link href="/" className="text-white hover:text-gray-300">
            Home
          </Link>
          <Link href="/movies" className="text-white hover:text-gray-300">
            Movies
          </Link>
          <Link href="/tvshows" className="text-white hover:text-gray-300">
            TV Shows
          </Link>
          <Link href="/new" className="text-white hover:text-gray-300">
            New & Popular
          </Link>
          {user && <Link href="/mylist" className="text-white hover:text-gray-300">My List</Link>}
        </div>
        
        {/* Search input */}
        <div className="relative flex items-center">
          {showSearchInput && (
            <div className="absolute right-0 top-[-5px] md:top-[-4px]">
              <form onSubmit={handleSearch} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-[#0a0807]/90 border border-gray-700 text-white py-0.5 px-1.5 sm:px-2 rounded-md w-[110px] sm:w-[140px] md:w-[160px] text-[10px] sm:text-xs"
                  disabled={isSearching}
                />
                {isSearching && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <FaSpinner className="animate-spin text-gray-400" size={8} />
                  </div>
                )}
                {searchError && (
                  <div className="absolute left-0 top-full mt-0.5 bg-red-900/90 text-white text-[10px] py-0.5 px-1.5 rounded z-50 w-full">
                    {searchError}
                  </div>
                )}
              </form>
            </div>
          )}
          
          <button 
            className="text-white search-toggle"
            onClick={toggleSearchInput}
            aria-label="Search"
          >
            <FaSearch size={16} className="sm:text-sm" />
          </button>
        </div>
        
        <button className="text-white">
          <FaBell size={16} className="sm:text-sm" />
        </button>
        
        {/* Authentication links or User menu */}
        {!loading && !user && (
          <div className="hidden md:flex gap-3">
            <Link href="/login" className="text-white hover:text-gray-300 text-xs">Login</Link>
            <Link href="/signup" className="text-white hover:text-gray-300 text-xs">Sign Up</Link>
          </div>
        )}

        {user && (
          <div className="relative" ref={userMenuRef}>
            <button 
              className="text-white p-0.5 rounded-full hover:bg-gray-800"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <FaUser size={16} className="sm:text-sm" />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-0.5 sm:mt-1 w-36 sm:w-40 bg-[#0a0807] rounded-md shadow-lg py-0.5 sm:py-1 z-50 border border-gray-800 text-[10px] sm:text-xs">
                <Link href="/profile" className="block px-2 sm:px-2.5 py-0.5 sm:py-1 text-gray-200 hover:bg-[#1a1512]">
                  Profile
                </Link>
                <Link href="/settings" className="block px-2 sm:px-2.5 py-0.5 sm:py-1 text-gray-200 hover:bg-[#1a1512]">
                  Settings
                </Link>
                {user.user_metadata?.role === 'admin' && (
                  <Link href="/admin" className="block px-2 sm:px-2.5 py-0.5 sm:py-1 text-gray-200 hover:bg-[#1a1512] flex items-center">
                    <FaCog className="mr-0.5 sm:mr-1" size={12} />
                    Admin Panel
                  </Link>
                )}
                <div className="border-t border-gray-800 my-0.5"></div>
                <button 
                  onClick={handleSignOut}
                  className="block w-full text-left px-2 sm:px-2.5 py-0.5 sm:py-1 text-gray-200 hover:bg-[#1a1512]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#0a0807]/95 border-t border-gray-800 py-1 sm:py-2 md:hidden z-40">
          <div className="flex flex-col space-y-1 sm:space-y-2 px-2 sm:px-3">
            <Link 
              href="/" 
              className="text-white hover:text-gray-300 py-0.5 sm:py-1 text-[10px] sm:text-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/movies" 
              className="text-white hover:text-gray-300 py-0.5 sm:py-1 text-[10px] sm:text-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              Movies
            </Link>
            <Link 
              href="/tvshows" 
              className="text-white hover:text-gray-300 py-0.5 sm:py-1 text-[10px] sm:text-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              TV Shows
            </Link>
            <Link 
              href="/new" 
              className="text-white hover:text-gray-300 py-0.5 sm:py-1 text-[10px] sm:text-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              New & Popular
            </Link>
            {user && (
              <Link 
                href="/mylist" 
                className="text-white hover:text-gray-300 py-0.5 sm:py-1 text-[10px] sm:text-xs"
                onClick={() => setMobileMenuOpen(false)}
              >
                My List
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 