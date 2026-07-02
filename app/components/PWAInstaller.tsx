'use client';

import { useEffect, useState } from 'react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('PWA Service Worker registered context:', reg.scope))
          .catch((err) => console.warn('PWA Service Worker registration failed:', err));
      });
    }

    // Capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt event fired!');
      e.preventDefault();
      // Store event so it can be triggered later
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect if app is already installed
    window.addEventListener('appinstalled', () => {
      console.log('PDP Movie PWA was installed successfully');
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show native prompt
    deferredPrompt.prompt();
    
    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome: ${outcome}`);
    
    // Reset state
    setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  if (!showInstallBtn) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-2.5 px-5 rounded-full shadow-2xl flex items-center gap-2 border border-red-500/30 transition-all duration-300 transform hover:scale-105 active:scale-95 animate-bounce">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <button onClick={handleInstallClick} className="text-sm tracking-wide">
        Install PDP Movie App
      </button>
      <button 
        onClick={() => setShowInstallBtn(false)} 
        className="ml-2 hover:text-gray-300 text-xs p-1"
        aria-label="Dismiss install promotion"
      >
        ✕
      </button>
    </div>
  );
}