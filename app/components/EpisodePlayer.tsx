'use client';

import React, { useEffect, useState, useRef } from 'react';

const VIDEO_SERVERS = {
  DEFAULT: 'player.vidplus.to',
  ALTERNATE: 'vidsrc.to'
};

interface EpisodePlayerProps {
  seriesId?: string;
  season?: number;
  episode?: number;
  height?: string;
  onError?: (errorMsg: string) => void;
}

const EpisodePlayer: React.FC<EpisodePlayerProps> = ({
  seriesId,
  season,
  episode,
  height = '360px',
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playerUrl, setPlayerUrl] = useState('');
  const [currentServer, setCurrentServer] = useState<string>(VIDEO_SERVERS.DEFAULT);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (seriesId && season && episode) {
        const url = `https://${currentServer}/embed/tv/${seriesId}/${season}/${episode}`;
        setPlayerUrl(url);
        setLoading(false);
    } else {
        setError(true);
        setLoading(false);
        if(onError) onError('Missing seriesId, season, or episode');
    }
  }, [seriesId, season, episode, currentServer]);

  const handleIframeLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
    if (onError) onError('Failed to load episode player iframe');
  };

  const toggleVideoServer = () => {
    const newServer = currentServer === VIDEO_SERVERS.DEFAULT 
      ? VIDEO_SERVERS.ALTERNATE 
      : VIDEO_SERVERS.DEFAULT;
    setCurrentServer(newServer);
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
          <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900 flex items-center justify-center">
          <p className="text-white">Failed to load video.</p>
        </div>
      )}
      
      {playerUrl && !error && (
        <iframe
          ref={iframeRef}
          src={playerUrl}
          className="video-embed"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen; clipboard-write"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            zIndex: 1,
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
};

export default EpisodePlayer;