'use client';

import { useEffect } from 'react';

/**
 * Global VidSrc Fixer component that handles issues with vidsrc.xyz domain
 * This component should be included in the main layout to fix all vidsrc players
 */
const VidsrcFixer = () => {
  useEffect(() => {
    // Fix for preventing loading of sbx.js and other resources from vidsrc.xyz domain
    const fixVidsrcScripts = () => {
      console.log('VidsrcFixer: Initializing');
      
      // Intercept and block resource loading errors from vidsrc.xyz
      const handleResourceError = function(e: any) {
        // Check if the error is related to vidsrc.xyz
        if (e.filename && e.filename.includes('vidsrc.xyz')) {
          console.warn('VidsrcFixer: Blocked resource from deprecated domain:', e.filename);
          e.preventDefault(); // Prevent the error from showing in console
          return true;
        }
        return false;
      };
      
      // Patch fetch to rewrite vidsrc.xyz URLs
      const originalFetch = window.fetch;
      window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
        if (typeof input === 'string' && input.includes('vidsrc.xyz')) {
          // Rewrite URL to use vidsrc.to instead
          const newUrl = input.replace('vidsrc.xyz', 'vidsrc.to');
          console.log('VidsrcFixer: Rewriting fetch URL from', input, 'to', newUrl);
          return originalFetch(newUrl, init);
        }
        return originalFetch(input, init);
      };
      
      // Remove any existing event listeners to prevent duplicates
      window.removeEventListener('error', handleResourceError, true);
      
      // Add event listener for resource errors
      window.addEventListener('error', handleResourceError, true);
      
      // Patching createElement to detect and modify script elements
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName: string, options?: ElementCreationOptions) {
        const element = originalCreateElement.call(document, tagName, options);
        
        if (tagName.toLowerCase() === 'script') {
          // Watch for src attribute being set
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function(name: string, value: string) {
            if (name === 'src' && value.includes('vidsrc.xyz')) {
              const newSrc = value.replace('vidsrc.xyz', 'vidsrc.to');
              console.log('VidsrcFixer: Rewriting script src from', value, 'to', newSrc);
              return originalSetAttribute.call(element, name, newSrc);
            }
            return originalSetAttribute.call(element, name, value);
          };
        }
        
        return element;
      };
    };
    
    // Execute the fix
    fixVidsrcScripts();
    
    // Cleanup function to restore original functions when component unmounts
    return () => {
      console.log('VidsrcFixer: Cleaning up');
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default VidsrcFixer; 