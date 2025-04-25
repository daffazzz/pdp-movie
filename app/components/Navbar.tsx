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
      className={`px-2 md:px-8 py-1.5 flex items-center justify-between transition duration-500 z-50 w-full fixed ${
        isScrolled || mobileMenuOpen ? "bg-[#0c0908]" : "bg-gradient-to-b from-[#0c0908]/70 to-transparent"
      }`}
    >
      <div className="flex items-center">
        {/* Mobile menu button */}
        <button 
          className="mr-2 text-white md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
        </button>
        
        <Link href="/" className="flex items-center ml-1 md:ml-2">
          <Image 
            src="/logo_pdp_movie.png" 
            alt="PDP Movie Logo" 
            width={90} 
            height={30} 
            className="object-contain"
            priority
          />
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        {/* Desktop navigation */}
        <div className="hidden md:flex gap-5 text-sm ml-6">
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
            <div className="absolute right-0 top-[-8px] md:top-[-5px]">
              <form onSubmit={handleSearch} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-[#0a0807]/90 border border-gray-700 text-white py-1 px-3 rounded-md w-[160px] md:w-[180px] text-sm"
                  disabled={isSearching}
                />
                {isSearching && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <FaSpinner className="animate-spin text-gray-400" size={12} />
                  </div>
                )}
                {searchError && (
                  <div className="absolute left-0 top-full mt-1 bg-red-900/90 text-white text-xs py-1 px-2 rounded z-50 w-full">
                    {searchError}
                  </div>
                )}
              </form>
            </div>
          )}
          
          <button 
            className="text-white search-toggle ml-1 md:ml-0"
            onClick={toggleSearchInput}
            aria-label="Search"
          >
            <FaSearch size={16} />
          </button>
        </div>
        
        <button className="text-white ml-2 md:ml-0">
          <FaBell size={16} />
        </button>
        
        {/* Authentication links or User menu */}
        {!loading && !user && (
          <div className="hidden md:flex gap-4">
            <Link href="/login" className="text-white hover:text-gray-300">Login</Link>
            <Link href="/signup" className="text-white hover:text-gray-300">Sign Up</Link>
          </div>
        )}

        {user && (
          <div className="relative" ref={userMenuRef}>
            <button 
              className="text-white p-0.5 rounded-full hover:bg-gray-800"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <FaUser size={16} />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-[#0a0807] rounded-md shadow-lg py-1 z-50 border border-gray-800">
                <Link href="/profile" className="block px-3 py-1.5 text-sm text-gray-200 hover:bg-[#1a1512]">
                  Profile
                </Link>
                <Link href="/settings" className="block px-3 py-1.5 text-sm text-gray-200 hover:bg-[#1a1512]">
                  Settings
                </Link>
                {user.user_metadata?.role === 'admin' && (
                  <Link href="/admin" className="block px-3 py-1.5 text-sm text-gray-200 hover:bg-[#1a1512] flex items-center">
                    <FaCog className="mr-1.5" size={14} />
                    Admin Panel
                  </Link>
                )}
                <div className="border-t border-gray-800 my-0.5"></div>
                <button 
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#1a1512]"
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
        <div className="absolute top-full left-0 right-0 bg-[#0a0807]/95 border-t border-gray-800 py-2.5 md:hidden z-40">
          <div className="flex flex-col space-y-2.5 px-4">
            <Link 
              href="/" 
              className="text-white hover:text-gray-300 py-1.5 text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/movies" 
              className="text-white hover:text-gray-300 py-1.5 text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Movies
            </Link>
            <Link 
              href="/tvshows" 
              className="text-white hover:text-gray-300 py-1.5 text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              TV Shows
            </Link>
            <Link 
              href="/new" 
              className="text-white hover:text-gray-300 py-1.5 text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              New & Popular
            </Link>
            {user && (
              <Link 
                href="/mylist" 
                className="text-white hover:text-gray-300 py-1.5 text-sm"
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