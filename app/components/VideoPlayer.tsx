"use client";

import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import type Player from 'video.js/dist/types/player';

interface VideoPlayerProps {
  options: {
    autoplay?: boolean;
    controls?: boolean;
    responsive?: boolean;
    fluid?: boolean;
    sources: {
      src: string;
      type: string;
    }[];
    tracks?: {
      kind: string;
      src: string;
      srclang: string;
      label: string;
      default?: boolean;
    }[];
  };
  onReady?: (player: Player) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ options, onReady }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      // Initialize Video.js player
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered', 'vjs-16-9');
      videoRef.current.appendChild(videoElement);
      
      const player = videojs(videoElement, {
        ...options,
        controls: true,
        autoplay: false,
        preload: 'auto',
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
          children: [
            'playToggle',
            'progressControl',
            'volumePanel',
            'qualitySelector',
            'fullscreenToggle',
            'playbackRateMenuButton',
            'subtitlesButton',
          ],
        },
        userActions: {
          hotkeys: true
        }
      });
      
      // Store player ref only after successful initialization
      playerRef.current = player;
      
      // Setup player ready event
      player.ready(function() {
        // Only setup keyboard controls after player is fully ready
        const setupKeyboardControls = () => {
          const skipTime = 10; // 10 seconds skip time
          
          // Remove any existing event listeners first to prevent duplicates
          document.removeEventListener('keydown', handleKeyDown);
          
          // Add keyboard event listener for arrow keys
          document.addEventListener('keydown', handleKeyDown);
          
          function handleKeyDown(event: KeyboardEvent) {
            if (!player || player.isDisposed()) return;
            
            try {
              // Skip forward with right arrow
              if (event.key === 'ArrowRight') {
                if (player.currentTime && player.duration) {
                  const currentTime = player.currentTime() || 0;
                  const duration = player.duration() || 0;
                  player.currentTime(Math.min(currentTime + skipTime, duration));
                  event.preventDefault();
                }
              }
              
              // Skip backward with left arrow
              if (event.key === 'ArrowLeft') {
                if (player.currentTime) {
                  const currentTime = player.currentTime() || 0;
                  player.currentTime(Math.max(currentTime - skipTime, 0));
                  event.preventDefault();
                }
              }
              
              // Volume up with up arrow
              if (event.key === 'ArrowUp') {
                if (player.volume) {
                  const currentVolume = player.volume() || 0;
                  const newVolume = Math.min(currentVolume + 0.1, 1);
                  player.volume(newVolume);
                  event.preventDefault();
                }
              }
              
              // Volume down with down arrow
              if (event.key === 'ArrowDown') {
                if (player.volume) {
                  const currentVolume = player.volume() || 0;
                  const newVolume = Math.max(currentVolume - 0.1, 0);
                  player.volume(newVolume);
                  event.preventDefault();
                }
              }
            } catch (error) {
              console.error('Error in keyboard handler:', error);
            }
          }
        };
        
        // Setup keyboard controls
        setupKeyboardControls();
        
        // Call onReady callback if provided
        if (onReady) {
          onReady(player);
        }
      });
    } else if (playerRef.current) {
      // Update player options if needed
      const player = playerRef.current;
      
      try {
        player.src(options.sources);
        
        // Update tracks
        if (options.tracks && options.tracks.length > 0) {
          // First, remove any existing text tracks
          const existingTracks = player.remoteTextTracks?.() || [];
          for (let i = existingTracks.length - 1; i >= 0; i--) {
            player.removeRemoteTextTrack(existingTracks[i]);
          }
          
          // Add new tracks
          options.tracks.forEach(track => {
            player.addRemoteTextTrack(track, false);
          });
        }
      } catch (error) {
        console.error('Error updating player:', error);
      }
    }
  }, [options, videoRef, onReady]);

  // Dispose the Video.js player when the component unmounts
  useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        try {
          player.dispose();
          playerRef.current = null;
        } catch (error) {
          console.error('Error disposing player:', error);
        }
      }
    };
  }, []);

  return (
    <div className="w-full h-full bg-black">
      <div data-vjs-player>
        <div ref={videoRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default VideoPlayer; 