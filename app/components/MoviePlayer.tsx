'use client';

import { useState, useEffect, useRef } from 'react';

const VIDEO_SERVERS = {
  DEFAULT: 'player.vidplus.to',
  ALTERNATE: 'vidsrc.to'
};

interface MoviePlayerProps {
  tmdbId: string;
  height?: string;
  autoPlay?: boolean;
  allowFullScreen?: boolean;
  onError?: (error: string) => void;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, 
  height = '360px',
  autoPlay = false,
  allowFullScreen = true,
  onError
}) => {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [currentServer, setCurrentServer] = useState<string>(VIDEO_SERVERS.DEFAULT);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (tmdbId) {
      setLoading(true);
      setError(false);
      const videoUrl = `https://${currentServer}/embed/movie/${tmdbId}?controls=1`;
      setEmbedUrl(videoUrl);
    }
  }, [tmdbId, currentServer]);

  const toggleVideoServer = () => {
    const newServer = currentServer === VIDEO_SERVERS.DEFAULT 
      ? VIDEO_SERVERS.ALTERNATE 
      : VIDEO_SERVERS.DEFAULT;
    setCurrentServer(newServer);
  };

  const handleIframeLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
    if (onError) onError('Failed to load movie player iframe');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    // Re-trigger the useEffect by changing the key of the iframe or the src
    setEmbedUrl(embedUrl + ' '); // a space to re-trigger
    setTimeout(() => {
        setEmbedUrl(embedUrl.trim());
    }, 100)
  };

  return (
    <div 
      className="relative bg-black rounded-md overflow-hidden embedded-player-container mx-auto"
      style={{
        width: '100%', 
        height: '100%',
        aspectRatio: '16/9'
      }}
    >
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={toggleVideoServer}
          className="bg-black/70 hover:bg-black/90 text-white text-xs px-2 py-1 rounded flex items-center"
          title={`Switch to ${currentServer === VIDEO_SERVERS.DEFAULT ? 'alternate' : 'default'} server`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Server: {currentServer === VIDEO_SERVERS.DEFAULT ? 'Default' : 'Alternate'}
        </button>
      </div>

      {loading && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
            <p className="text-white">Loading movie...</p>
            <p className="text-gray-400 text-xs">Using server: {currentServer}</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="mb-4 text-orange-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white font-bold mb-2">Playback Error</p>
            <p className="text-white mb-2">Unable to load movie</p>
            <p className="text-gray-400 text-xs mb-4">Server: {currentServer}</p>
            <div className="flex justify-center space-x-2">
              <button 
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded flex items-center"
                onClick={handleRetry}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
              <button 
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center"
                onClick={toggleVideoServer}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Try Another Server
              </button>
            </div>
          </div>
        </div>
      )}
      
      {embedUrl && (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          key={embedUrl} // Re-mounts the iframe when src changes
          className="video-embed"
          frameBorder="0"
          allowFullScreen={allowFullScreen}
          allow={`${autoPlay ? "autoplay; " : ""}encrypted-media; picture-in-picture; web-share; fullscreen; clipboard-write`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            zIndex: (loading || error) ? 0 : 1,
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
};