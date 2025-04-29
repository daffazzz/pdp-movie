"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaInfoCircle, FaSpinner, FaVolumeMute, FaVolumeUp, FaTimes, FaExpand } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeroProps {
  title?: string;
  overview?: string;
  backdrop_url?: string;
  poster_url?: string;
  id?: string;
  contentType?: 'movie' | 'tvshow' | 'tvseries';
  tmdb_id?: number;
  video_url?: string; // YouTube trailer URL
}

// Add TypeScript interface for YouTube API
interface YouTubeWindow extends Window {
  YT?: any;
  onYouTubeIframeAPIReady?: () => void;
}

const Hero: React.FC<HeroProps> = ({ 
  title, 
  overview, 
  backdrop_url, 
  poster_url,
  id, 
  contentType = 'movie', 
  tmdb_id,
  video_url 
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [isInfoLoading, setIsInfoLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<number>(-1);
  const [youtubeApiLoaded, setYoutubeApiLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const trailerTimer = useRef<NodeJS.Timeout | null>(null);
  const playerReadyTimer = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerInitAttempts = useRef<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  
  // Check if we have content to display
  const hasContent = !!title && !!overview && (!!backdrop_url || !!poster_url) && !!id;

  // Optimize backdrop URL if it's from TMDB
  const optimizedBackdropUrl = backdrop_url && backdrop_url.includes('image.tmdb.org') 
    ? backdrop_url.replace('/original/', '/w1280/') 
    : backdrop_url;
  
  // Optimize poster URL if it's from TMDB
  const optimizedPosterUrl = poster_url && poster_url.includes('image.tmdb.org')
    ? poster_url.replace('/w500/', '/original/')
    : poster_url;

  // Detect mobile devices
  useEffect(() => {
    const checkIfMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
    };
    
    // Check on initial render
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Extract YouTube video ID from URL - Optimized using useCallback
  const extractYoutubeId = useCallback((url: string) => {
    if (!url || url.trim() === '') {
      console.log('Video URL is empty or invalid:', url);
      return null;
    }
    
    // Try multiple patterns to extract YouTube ID
    let videoId = null;
    
    // YouTube watch URL pattern
    const watchPattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const watchMatch = url.match(watchPattern);
    
    if (watchMatch && watchMatch[1]) {
      videoId = watchMatch[1];
    } else {
      // Try direct ID pattern
      const directPattern = /^[a-zA-Z0-9_-]{11}$/;
      const directMatch = url.match(directPattern);
      
      if (directMatch) {
        videoId = directMatch[0];
      }
    }
    
    console.log('Extracted YouTube ID:', videoId || 'No match found', 'from URL:', url);
    return videoId;
  }, []);

  // Process video URL only once
  useEffect(() => {
    console.log('Processing video URL:', video_url);
    // Reset videoId whenever new content is loaded
    setVideoId(null);
    setShowTrailer(false);
    
    // Only process video_url if it exists, is not empty, and is not the fallback URL
    if (video_url && video_url.trim() !== '' && !video_url.includes('KK8FHdFluOQ')) {
      const extractedId = extractYoutubeId(video_url);
      if (extractedId) {
        setVideoId(extractedId);
        console.log('Set video ID to:', extractedId);
        
        // Only start auto-play if the hero is fully loaded and visible
        if (isLoaded && isMounted) {
          // Clear any existing timers to prevent multiple timers
          if (trailerTimer.current) {
            clearTimeout(trailerTimer.current);
          }
          
          trailerTimer.current = setTimeout(() => {
            setIsMuted(true);
            setShowTrailer(true);
            
            // Try to unmute after a delay once video is playing
            setTimeout(() => {
              setIsMuted(false);
            }, 1000);
          }, 700); 
        }
      } else {
        console.log('Could not extract valid YouTube ID from URL:', video_url);
      }
    } else {
      console.log('No valid video URL provided, showing banner only');
    }
    
    // Clear timers on cleanup
    return () => {
      if (trailerTimer.current) {
        clearTimeout(trailerTimer.current);
      }
      if (playerReadyTimer.current) {
        clearTimeout(playerReadyTimer.current);
      }
    };
  }, [video_url, isLoaded, isMounted, extractYoutubeId]);

  // Lazy load YouTube API only when needed
  const loadYouTubeApi = useCallback(() => {
    if (youtubeApiLoaded) return;
    
    const ytWindow = window as YouTubeWindow;
    if (!ytWindow.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onload = () => {
        setYoutubeApiLoaded(true);
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    } else {
      setYoutubeApiLoaded(true);
    }
  }, [youtubeApiLoaded]);

  // Load YouTube API only when we need to show a trailer
  useEffect(() => {
    if (showTrailer && videoId) {
      loadYouTubeApi();
    }
  }, [showTrailer, videoId, loadYouTubeApi]);

  // Setup YouTube player when trailer is shown
  useEffect(() => {
    // Only run if we're showing the trailer and have a videoId
    if (!showTrailer || !videoId) return;
    
    // Create message handler for YouTube events
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        // Try to parse the message data as JSON
        const data = JSON.parse(event.data);
        
        // Check if it's a YouTube API event
        if (data.event === 'onReady') {
          setVideoReady(true);
        } else if (data.event === 'onStateChange') {
          setPlayerState(data.info);
          
          // State 0 means video ended
          if (data.info === 0) {
            stopVideo();
            setShowTrailer(false);
          } else if (data.info === 1) {
            // State 1 means video is playing
            // If we initially set to muted but want to unmute
            if (!isMuted) {
              setTimeout(() => {
                if (iframeRef.current?.contentWindow) {
                  iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                }
              }, 300);
            }
          }
        }
      } catch (e) {
        // Not JSON or not the expected format, ignore
      }
    };
    
    // Listen for messages from YouTube iframe
    window.addEventListener('message', handleYouTubeMessage);
    
    // Try to force play video using iframe's contentWindow
    const playVideo = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          // There are several methods to attempt autoplay
          iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          
          // Also simulate a click on the iframe to satisfy browser autoplay policies
          setTimeout(() => {
            if (iframeRef.current) {
              iframeRef.current.click();
            }
          }, 200);
        } catch (e) {
          console.error('Failed to autoplay video:', e);
        }
      }
    };

    // Clear previous attempt timer
    if (playerReadyTimer.current) {
      clearTimeout(playerReadyTimer.current);
    }

    // Try repeatedly in case the iframe isn't fully loaded yet
    const attemptPlay = setInterval(() => {
      if (videoReady) {
        playVideo();
        clearInterval(attemptPlay);
      } else {
        // Increment attempt counter
        playerInitAttempts.current += 1;
        
        // If we've tried too many times, force a reload of the iframe
        if (playerInitAttempts.current > 5) { // Reduced from 10 to 5 attempts
          setVideoReady(false);
          if (iframeRef.current) {
            const src = iframeRef.current.src;
            iframeRef.current.src = '';
            
            // Small delay before resetting the source
            setTimeout(() => {
              if (iframeRef.current) {
                iframeRef.current.src = src;
              }
              playerInitAttempts.current = 0;
            }, 100);
          }
        }
      }
    }, 300);

    // Clean up
    return () => {
      clearInterval(attemptPlay);
      window.removeEventListener('message', handleYouTubeMessage);
    };
  }, [showTrailer, videoId, videoReady, isMuted]);

  // Add a function to properly stop the YouTube video
  const stopVideo = useCallback(() => {
    // Try to stop the video via postMessage API
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        // Send stop command to YouTube iframe
        iframeRef.current.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        
        // Reset state
        setVideoReady(false);
        playerInitAttempts.current = 0;
      } catch (e) {
        console.error('Error stopping YouTube video:', e);
      }
    }
  }, []);
  
  const closeTrailer = useCallback(() => {
    // Stop the video first
    stopVideo();
    
    // Then hide the trailer
    setShowTrailer(false);
  }, [stopVideo]);

  // Update the scroll handler to properly stop video - optimized with useCallback
  useEffect(() => {
    const handleScroll = () => {
      if (!showTrailer || !heroRef.current) return;
      
      const heroRect = heroRef.current.getBoundingClientRect();
      const heroHeight = heroRect.height;
      
      // If hero is more than 80% scrolled out of view, close trailer
      if (heroRect.bottom < heroHeight * 0.2 || heroRect.top > window.innerHeight * 0.8) {
        stopVideo();
        setShowTrailer(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showTrailer, stopVideo]);

  // Clean up video when component unmounts or when video URL changes
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [video_url, stopVideo]);

  // Set mounted state once (no dependencies needed)
  useEffect(() => {
    setIsMounted(true);
    
    // Set loaded to true if we already have a backdrop cached
    if (backdrop_url) {
      // Check if image is cached or available quickly
      const checkImageLoaded = () => {
        const tempImg = document.createElement('img');
        tempImg.src = optimizedBackdropUrl || '';
        
        // If it's already loaded in browser cache
        if (tempImg.complete) {
          setIsLoaded(true);
        }
      };
      
      checkImageLoaded();
    }
  }, [backdrop_url, optimizedBackdropUrl]);

  // handleImageError untuk backdrop dan poster
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const fallbackBackdrop = "https://image.tmdb.org/t/p/w1280/8c4a8kE7PizaGQQnditMmI1xbRp.jpg";
    const fallbackPoster = "https://image.tmdb.org/t/p/w500/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg";
    
    // Gunakan fallback yang sesuai berdasarkan tipe gambar
    if (target.classList.contains('backdrop-image')) {
      target.src = fallbackBackdrop;
    } else if (target.classList.contains('poster-image')) {
      target.src = fallbackPoster;
    }
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };
  
  const handlePlayClick = useCallback(() => {
    if (isPlayLoading || !id) return; // Prevent double clicks or if no ID
    setIsPlayLoading(true);
    
    if (contentType === 'tvshow') {
      // Gunakan tmdb_id jika tersedia, jika tidak gunakan id UUID
      if (tmdb_id) {
        router.push(`/tvshows/${tmdb_id}`);
      } else {
        router.push(`/tvshows/${id}`);
      }
    } else {
      router.push(`/movie/${id}`);
    }
    
    // Reset after a short delay in case navigation fails
    setTimeout(() => setIsPlayLoading(false), 3000);
  }, [isPlayLoading, id, contentType, tmdb_id, router]);
  
  const handleMoreInfoClick = useCallback(() => {
    if (isInfoLoading || !id) return; // Prevent double clicks or if no ID
    setIsInfoLoading(true);
    
    if (contentType === 'tvshow') {
      // Gunakan tmdb_id jika tersedia, jika tidak gunakan id UUID
      if (tmdb_id) {
        router.push(`/tvshows/${tmdb_id}`);
      } else {
        router.push(`/tvshows/${id}`);
      }
    } else {
      router.push(`/movie/${id}`);
    }
    
    // Reset after a short delay in case navigation fails
    setTimeout(() => setIsInfoLoading(false), 3000);
  }, [isInfoLoading, id, contentType, tmdb_id, router]);
  
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        if (isMuted) {
          // If currently muted, unmute
          iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        } else {
          // If currently unmuted, mute
          iframeRef.current.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
        }
      } catch (e) {
        console.error('Error toggling mute:', e);
      }
    }
  }, [isMuted]);
  
  const playTrailer = useCallback(() => {
    console.log('playTrailer called, videoId:', videoId);
    if (videoId && video_url && !video_url.includes('KK8FHdFluOQ')) {
      // Start with mute true to ensure video starts playing
      setIsMuted(true);
      setShowTrailer(true);
      setVideoReady(false);
      playerInitAttempts.current = 0;
      
      // Also load YouTube API if not already loaded
      loadYouTubeApi();
      
      // When user manually clicks Play Trailer button, try to unmute sooner and more aggressively
      const attemptUnmute = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          try {
            // Unmute immediately using YouTube API
            iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            // Also update our state
            setIsMuted(false);
          } catch (e) {
            console.error('Error unmuting video:', e);
          }
        }
      };

      // More aggressive unmute attempts with various delays
      // More frequent at the beginning when the player is likely to be ready
      [100, 300, 600, 1000, 1500, 2000, 3000].forEach(delay => {
        setTimeout(attemptUnmute, delay);
      });
    } else {
      console.error('Cannot play trailer: No valid YouTube videoId available');
      
      // Create and show a user-friendly error message
      const errorContainer = document.createElement('div');
      errorContainer.className = 'fixed inset-0 flex items-center justify-center bg-black/70 z-[20]';
      errorContainer.innerHTML = `
        <div class="bg-gray-800 p-5 rounded-lg shadow-xl max-w-md text-center">
          <h3 class="text-xl font-bold text-white mb-3">Trailer Not Available</h3>
          <p class="text-gray-300 mb-4">This content does not have a trailer available.</p>
          <button id="closeErrorBtn" class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-full">
            Close
          </button>
        </div>
      `;
      
      document.body.appendChild(errorContainer);
      
      // Add event listener to close button
      document.getElementById('closeErrorBtn')?.addEventListener('click', () => {
        document.body.removeChild(errorContainer);
      });
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        if (document.body.contains(errorContainer)) {
          document.body.removeChild(errorContainer);
        }
      }, 5000);
    }
  }, [videoId, loadYouTubeApi, video_url]);

  // Normalize contentType to handle 'tvseries' as 'tvshow'
  const normalizedContentType = contentType === 'tvseries' ? 'tvshow' : contentType;

  if (!isMounted) return null;
  
  // Show loading skeleton if no content yet
  if (!hasContent) {
    return (
      <div className="relative h-[100vh] w-full overflow-hidden bg-gray-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={heroRef} className="relative h-[100vh] w-full overflow-hidden hero-container">
      {/* Background Image - Responsif untuk mobile dan desktop */}
      <div 
        className={`absolute h-full w-full transition-opacity duration-500 ease-in-out z-0 ${
          isLoaded && !showTrailer ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Tampilkan backdrop di desktop, poster di mobile */}
        {!isMobile ? (
          // Backdrop untuk desktop
          <Image
            src={optimizedBackdropUrl || "https://image.tmdb.org/t/p/w1280/8c4a8kE7PizaGQQnditMmI1xbRp.jpg"}
            alt={title || 'Featured content'}
            fill
            priority={true}
            loading="eager"
            className="object-cover backdrop-image"
            sizes="100vw"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          // Poster untuk mobile
          <Image
            src={optimizedPosterUrl || "https://image.tmdb.org/t/p/w500/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg"}
            alt={title || 'Featured content'}
            fill
            priority={true}
            loading="eager"
            className="object-cover poster-image object-top"
            sizes="100vw"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        )}
        {/* Optimized gradients for both mobile and desktop */}
        <div className="absolute bottom-0 h-[65%] w-full bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent z-[1] pointer-events-none" />
        {isMobile && (
          // Tambahan gradient samping untuk poster pada mobile
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 to-gray-900/50 z-[1] pointer-events-none" />
        )}
      </div>

      {/* YouTube Trailer - Lazy loaded */}
      {videoId && showTrailer ? (
        <div 
          className="absolute inset-0 z-[5] transition-all duration-500 opacity-100"
        >
          {/* Video container */}
          <div className="absolute inset-0 z-[2]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[140%] md:w-[130%] lg:w-[120%] xl:w-[110%] h-[130%] relative transform translate-y-[-18%] md:translate-y-[-13%] lg:translate-y-[-8%]">
                <div className="relative w-full h-full overflow-hidden rounded-lg shadow-2xl">
                  {!videoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-[5]">
                      <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    className="absolute inset-0 w-full h-full scale-[1.2]"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&enablejsapi=1&playsinline=1&cc_load_policy=0&iv_load_policy=3&vq=hd720&hd=1&loop=0&origin=${encodeURIComponent(window.location.origin)}&widgetid=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    onLoad={() => {
                      setVideoReady(true);
                      
                      // Multiple attempts with shorter delays for faster response
                      const playAttempts = [100, 300, 600, 1000];
                      
                      playAttempts.forEach((delay) => {
                        setTimeout(() => {
                          if (iframeRef.current) {
                            iframeRef.current.click();
                            
                            if (iframeRef.current.contentWindow) {
                              try {
                                iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                
                                if (!isMuted && playerState === 1) {
                                  setTimeout(() => {
                                    iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                                  }, 300);
                                }
                              } catch (e) {
                                console.error('Error controlling YouTube video:', e);
                              }
                            }
                          }
                        }, delay);
                      });
                    }}
                    loading="lazy"
                    allowFullScreen
                  ></iframe>
                  
                  {/* Invisible overlay to prevent user interaction with YouTube player */}
                  <div className="absolute inset-0 z-[20]"></div>
                  
                  {/* Video title overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent z-[25] pointer-events-none">
                    <h3 className="text-white font-bold text-lg md:text-xl">{title}</h3>
                    <p className="text-gray-300 text-sm">Official Trailer</p>
                  </div>
                  
                  {/* Controls */}
                  <div className="absolute bottom-4 left-4 z-[30] flex items-center gap-3">
                    <button 
                      onClick={toggleMute}
                      className="bg-gray-900/70 hover:bg-gray-800 text-white p-3 rounded-full transition-all backdrop-blur-sm"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
                    </button>
                  </div>
                  
                  {/* Close button */}
                  <div className="absolute top-4 right-4 z-[30]">
                    <button 
                      onClick={closeTrailer}
                      className="bg-red-600/90 hover:bg-red-700 text-white p-4 rounded-full transition-all backdrop-blur-sm"
                      aria-label="Close trailer"
                    >
                      <FaTimes size={22} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dark overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 z-[4] pointer-events-none"></div>
          
          {/* Bottom gradient - added pointer-events-none to ensure it doesn't block clicks */}
          <div className="absolute bottom-0 h-[40%] w-full bg-gradient-to-t from-gray-900/95 via-gray-900/80 to-transparent z-[4] pointer-events-none" />
        </div>
      ) : null}

      {/* Loading state - simplified */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-[15]">
          <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
      )}

      {/* Content */}
      <div 
        className={`absolute bottom-[30%] z-[20] transition-all duration-300 container mx-auto px-4 xl:px-8 2xl:px-16 mb-10 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="max-w-[90%] md:max-w-[75%] lg:max-w-[65%] xl:max-w-[55%] 2xl:max-w-[50%]">
          <div className="flex items-center gap-1 mb-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white text-shadow-lg">{title}</h1>
            {normalizedContentType === 'tvshow' && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-sm ml-2 uppercase">Series</span>
            )}
            {normalizedContentType === 'movie' && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-red-600 text-white rounded-sm ml-2 uppercase">Movie</span>
            )}
          </div>
          <p className="text-white text-base md:text-lg lg:text-xl mb-5 md:mb-6 max-w-3xl line-clamp-3 text-shadow-md">{overview}</p>
          <div className="flex gap-3 relative z-[20]">
            <button 
              onClick={handlePlayClick}
              disabled={isPlayLoading}
              className={`flex items-center justify-center gap-1.5 bg-red-600 text-white py-2 px-5 md:py-3 md:px-7 rounded-full font-bold hover:bg-red-700 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-600/30 relative z-[20] min-w-[100px] text-sm md:text-base ${isPlayLoading ? 'opacity-75' : ''}`}
              aria-label={`Play ${normalizedContentType === 'tvshow' ? 'TV show' : 'movie'}`}
            >
              {isPlayLoading ? <FaSpinner className="animate-spin text-sm" /> : <FaPlay className="text-sm" />}
              <span>{isPlayLoading ? 'Loading...' : 'Play'}</span>
            </button>
            {videoId && !showTrailer && video_url && !video_url.includes('KK8FHdFluOQ') && (
              <button 
                onClick={playTrailer}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-5 md:py-3 md:px-7 rounded-full font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-600/30 relative z-[20] min-w-[120px] text-sm md:text-base"
                style={{ position: 'relative', zIndex: 20 }}
                aria-label="Play trailer"
              >
                <FaPlay className="text-sm" />
                <span>Trailer</span>
              </button>
            )}
            <button 
              onClick={handleMoreInfoClick}
              disabled={isInfoLoading}
              className={`flex items-center justify-center gap-1.5 bg-gray-700/80 text-white py-2 px-5 md:py-3 md:px-7 rounded-full font-bold hover:bg-gray-700 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-gray-600/30 relative z-[20] min-w-[100px] text-sm md:text-base ${isInfoLoading ? 'opacity-75' : ''}`}
              aria-label={`More information about ${normalizedContentType === 'tvshow' ? 'TV show' : 'movie'}`}
            >
              {isInfoLoading ? <FaSpinner className="animate-spin text-sm" /> : <FaInfoCircle className="text-sm" />}
              <span>{isInfoLoading ? 'Loading...' : 'More Info'}</span>
            </button>
            
            {/* Debug info - only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute bottom-[-40px] text-xs text-white/50">
                {video_url ? `Trailer URL: ${video_url.substring(0, 40)}...` : 'No trailer URL provided'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;