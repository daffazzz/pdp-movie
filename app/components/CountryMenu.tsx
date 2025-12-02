"use client";

import { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';

interface Country {
    iso_3166_1: string;
    english_name: string;
    native_name: string;
}

interface CountryMenuProps {
    countries: Country[];
    onSelectCountry: (code: string | null) => void;
    selectedCountry: string | null;
    useRouting?: boolean;
    contentType?: 'movie' | 'tvshow';
}

const CountryMenu: React.FC<CountryMenuProps> = ({
    countries,
    onSelectCountry,
    selectedCountry,
    useRouting = false,
    contentType = 'movie'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

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

    const handleSelectCountry = (code: string) => {
        if (useRouting) {
            const basePath = contentType === 'tvshow' ? '/tvshows' : '/movies';

            // Check if we are on a genre page or country page to preserve other filters if needed
            // But for now, let's follow the plan: /movies/country/[code]
            // Or if we are on a genre page, maybe we want to keep the genre?
            // The plan said: "Verify URL updates to /movies/genre/28?country=JP"

            // Let's check current path
            const currentPath = window.location.pathname;

            if (currentPath.includes('/genre/')) {
                // We are on a genre page, add country as query param
                const params = new URLSearchParams(searchParams?.toString());
                params.set('country', code);
                router.push(`${currentPath}?${params.toString()}`);
            } else {
                // Go to country page
                // If we are already on a country page, we just switch country
                // But the route is /movies/country/[code]
                router.push(`${basePath}/country/${code}`);
            }
        } else {
            onSelectCountry(code);
        }
        setIsOpen(false);
    };

    const handleSelectAll = () => {
        if (useRouting) {
            const basePath = contentType === 'tvshow' ? '/tvshows' : '/movies';
            // If on genre page, remove country param
            const currentPath = window.location.pathname;
            if (currentPath.includes('/genre/')) {
                const params = new URLSearchParams(searchParams?.toString());
                params.delete('country');
                router.push(`${currentPath}?${params.toString()}`);
            } else {
                router.push(basePath);
            }
        } else {
            onSelectCountry(null);
        }
        setIsOpen(false);
    };

    const selectedCountryName = selectedCountry
        ? countries.find(c => c.iso_3166_1 === selectedCountry)?.english_name || selectedCountry
        : 'All Countries';

    // Sort countries by name
    const sortedCountries = [...countries].sort((a, b) => a.english_name.localeCompare(b.english_name));

    // Common countries to show at top
    const commonCodes = ['US', 'GB', 'KR', 'JP', 'CN', 'IN', 'FR', 'DE', 'ES', 'IT', 'ID'];
    const commonCountries = sortedCountries.filter(c => commonCodes.includes(c.iso_3166_1));
    const otherCountries = sortedCountries.filter(c => !commonCodes.includes(c.iso_3166_1));

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-sm flex items-center justify-between min-w-[140px] text-base"
            >
                <span className="truncate max-w-[150px]">{selectedCountryName}</span>
                <FaChevronDown className={`ml-2 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[10] dropdown-menu mt-1 bg-gray-800 rounded shadow-lg w-screen max-w-[280px] sm:max-w-[380px] md:max-w-[560px] lg:max-w-[640px] right-0 p-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
                    <div className="mb-3">
                        <button
                            onClick={handleSelectAll}
                            className={`w-full text-left py-2 px-3 rounded hover:bg-gray-700 ${selectedCountry === null ? 'bg-red-600 text-white' : 'text-white'
                                } text-base font-medium`}
                        >
                            All Countries
                        </button>
                    </div>

                    <div className="mb-2 text-xs text-gray-400 uppercase font-bold tracking-wider">Popular</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                        {commonCountries.map(country => (
                            <button
                                key={country.iso_3166_1}
                                onClick={() => handleSelectCountry(country.iso_3166_1)}
                                className={`text-left py-2 px-3 rounded hover:bg-gray-700 ${selectedCountry === country.iso_3166_1 ? 'bg-red-600 text-white' : 'text-white'
                                    } text-base truncate`}
                                title={country.english_name}
                            >
                                {country.english_name}
                            </button>
                        ))}
                    </div>

                    <div className="mb-2 text-xs text-gray-400 uppercase font-bold tracking-wider">All Countries</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {otherCountries.map(country => (
                            <button
                                key={country.iso_3166_1}
                                onClick={() => handleSelectCountry(country.iso_3166_1)}
                                className={`text-left py-2 px-3 rounded hover:bg-gray-700 ${selectedCountry === country.iso_3166_1 ? 'bg-red-600 text-white' : 'text-white'
                                    } text-base truncate`}
                                title={country.english_name}
                            >
                                {country.english_name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CountryMenu;
