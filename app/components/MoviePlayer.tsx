'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3 seconds of inactivity
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    // Start initial hide timer
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [resetHideTimer]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
    setEmbedUrl(embedUrl + ' ');
    setTimeout(() => {
      setEmbedUrl(embedUrl.trim());
    }, 100)
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-md overflow-hidden embedded-player-container mx-auto"
      style={{
        width: '100%',
        height: '100%',
        aspectRatio: '16/9'
      }}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
    >
      {/* Server toggle button - top right */}
      <div
        className="absolute top-2 right-2 z-20 transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
      >
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

      {/* Fullscreen button - bottom right */}
      <div
        className="absolute bottom-3 right-3 z-20 transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
      >
        <button
          onClick={toggleFullscreen}
          className="bg-black/70 hover:bg-white/20 text-white p-2 rounded-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
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
          key={embedUrl}
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