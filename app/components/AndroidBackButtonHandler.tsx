'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AndroidBackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if we are running in a Capacitor environment
    const setupBackButtonListener = async () => {
      try {
        const { App } = await import('@capacitor/app');

        const listener = await App.addListener('backButton', (data) => {
          // If we are at the home page (root '/'), exit the app.
          // Otherwise, go back in history.
          if (pathname === '/' || pathname === '/index.html' || pathname === '/index') {
            App.exitApp();
          } else {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              router.push('/');
            }
          }
        });

        return () => {
          listener.remove();
        };
      } catch (e) {
        // Capacitor might not be available in standard web environments, ignore
        console.log('Capacitor App plugin not available, skipping back button handler.');
      }
    };

    setupBackButtonListener();
  }, [pathname, router]);

  return null;
}
