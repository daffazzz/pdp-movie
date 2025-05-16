'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const DonationPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Show the popup after a short delay on every page load/reload
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const closePopup = () => {
    setIsOpen(false);
  };
  
  const downloadQRCode = () => {
    // Create a link element
    const link = document.createElement('a');
    link.href = '/qris.png';
    link.download = 'QRIS_Donasi.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-2 pointer-events-none">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg max-w-sm sm:max-w-lg w-full mx-auto relative border border-gray-700 shadow-xl pointer-events-auto">
        <button 
          onClick={closePopup}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="text-center mb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Yuk Donasi!!!!</h2>
          <p className="text-gray-300 text-xs sm:text-sm mb-1">
            Donasi buat maintenance server dan lainnya (seikhlasnya). 
            Daffa juga pingin ngopi
          </p>
        </div>
        
        <div className="flex justify-center mb-2">
          <div className="relative h-[260px] w-[260px] sm:h-[320px] sm:w-[320px] md:h-[380px] md:w-[380px]">
            <Image 
              src="/qris.png" 
              alt="QRIS Donation QR Code" 
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mb-1">
          <button
            onClick={downloadQRCode}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 sm:py-1.5 px-4 rounded transition duration-150 text-sm flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download QR Code
          </button>
          
          <button
            onClick={closePopup}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-1 sm:py-1.5 px-4 rounded transition duration-150 text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationPopup; 