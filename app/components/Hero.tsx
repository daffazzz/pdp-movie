"use client";

import { useState, useEffect, useRef } from 'react';
import { FaPlay, FaInfoCircle, FaSpinner, FaVolumeMute, FaVolumeUp, FaTimes, FaExpand } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeroProps {
  title?: string;
  overview?: string;
  backdrop_url?: string;
  id?: string;
  contentType?: 'movie' | 'tvshow';
  tmdb_id?: number;
  video_url?: string; // YouTube trailer URL
}

const Hero: React.FC<HeroProps> = ({ 
  title, 
  overview, 
  backdrop_url, 
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
  const trailerTimer = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // Check if we have content to display
  const hasContent = !!title && !!overview && !!backdrop_url && !!id;

  // Extract YouTube video ID from URL
  useEffect(() => {
    if (video_url && video_url.trim() !== '') {
      // Extract YouTube ID from various YouTube URL formats
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = video_url.match(regExp);
      const extractedId = (match && match[7].length === 11) ? match[7] : null;
      
      setVideoId(extractedId);
      
      // Auto-play trailer after 1 second if we have a valid video ID
      if (extractedId && isLoaded) {
        trailerTimer.current = setTimeout(() => {
          // Always start muted to bypass browser autoplay restrictions
          setIsMuted(true);
          setShowTrailer(true);
          
          // Try to unmute after a short delay once video is playing
          setTimeout(() => {
            setIsMuted(false);
          }, 1000);
        }, 500);
      }
    } else {
      setVideoId(null);
    }
    
    return () => {
      if (trailerTimer.current) {
        clearTimeout(trailerTimer.current);
      }
    };
  }, [video_url, isLoaded]);

  // Load YouTube IFrame API
  useEffect(() => {
    // Only run if we're showing the trailer and have a videoId
    if (!showTrailer || !videoId) return;

    // Add TypeScript interface untuk YouTube API
    interface YouTubeWindow extends Window {
      YT?: any;
      onYouTubeIframeAPIReady?: () => void;
    }
    
    // Create message handler for YouTube events
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        // Try to parse the message data as JSON
        const data = JSON.parse(event.data);
        
        // Check if it's a YouTube API event
        if (data.event === 'onStateChange' && data.info === 0) {
          // State 0 means video ended
          console.log('Video ended, closing trailer');
          // Stop the video first
          if (iframeRef.current && iframeRef.current.contentWindow) {
            try {
              // Send stop command to YouTube iframe
              iframeRef.current.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
              
              // Reset state
              setVideoReady(false);
            } catch (e) {
              console.error('Error stopping YouTube video:', e);
            }
          }
          
          // Then hide the trailer
          setShowTrailer(false);
        }
      } catch (e) {
        // Not JSON or not the expected format, ignore
      }
    };
    
    // Listen for messages from YouTube iframe
    window.addEventListener('message', handleYouTubeMessage);
    
    // Ensure YouTube API is loaded
    const ytWindow = window as YouTubeWindow;
    if (!ytWindow.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

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
          }, 500);
        } catch (e) {
          console.error('Failed to autoplay video:', e);
        }
      }
    };

    // Try repeatedly in case the iframe isn't fully loaded yet
    const attemptPlay = setInterval(() => {
      if (videoReady) {
        playVideo();
        clearInterval(attemptPlay);
      }
    }, 300);

    // Clean up
    return () => {
      clearInterval(attemptPlay);
      window.removeEventListener('message', handleYouTubeMessage);
    };
  }, [showTrailer, videoId, videoReady, iframeRef, setVideoReady, setShowTrailer]);

  // Add a function to properly stop the YouTube video
  const stopVideo = () => {
    // Try to stop the video via postMessage API
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        // Send stop command to YouTube iframe
        iframeRef.current.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
        
        // Reset state
        setVideoReady(false);
      } catch (e) {
        console.error('Error stopping YouTube video:', e);
      }
    }
  };
  
  const closeTrailer = () => {
    // Stop the video first
    stopVideo();
    
    // Then hide the trailer
    setShowTrailer(false);
  };

  // Update the scroll handler to properly stop video
  useEffect(() => {
    const handleScroll = () => {
      // Get the hero element's height to determine when it's scrolled out of view
      const heroElement = document.querySelector('.hero-container');
      if (!heroElement || !showTrailer) return;
      
      const heroHeight = heroElement.getBoundingClientRect().height;
      
      // If user has scrolled past 80% of the hero height, stop and hide the video
      if (window.scrollY > heroHeight * 0.8) {
        stopVideo(); // Stop the video first
        setShowTrailer(false); // Then hide the trailer
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showTrailer]);

  // Clean up video when component unmounts or when video URL changes
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [video_url]);

  // Reset loading state when backdrop changes
  useEffect(() => {
    if (backdrop_url) {
      setIsLoaded(false);
    }
  }, [backdrop_url]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fallback backdrop in case the provided URL is invalid
  const fallbackBackdrop = "https://image.tmdb.org/t/p/original/8c4a8kE7PizaGQQnditMmI1xbRp.jpg";

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = fallbackBackdrop;
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };
  
  const handlePlayClick = () => {
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
  };
  
  const handleMoreInfoClick = () => {
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
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const playTrailer = () => {
    if (videoId) {
      setShowTrailer(true);
    }
  };

  if (!isMounted) return null;
  
  // Show loading skeleton if no content yet
  if (!hasContent) {
    return (
      <div className="relative h-[120vh] w-full overflow-hidden bg-gray-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[120vh] w-full overflow-hidden hero-container">
      {/* Background Image */}
      <div 
        className={`absolute h-full w-full transition-opacity duration-700 ease-in-out z-0 ${
          isLoaded && !showTrailer ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Image
          src={backdrop_url || fallbackBackdrop}
          alt={title || 'Featured content'}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        {/* Tetap pertahankan gradient bawah */}
        <div className="absolute bottom-0 h-[65%] w-full bg-gradient-to-t from-gray-900 via-gray-900/85 via-35% via-gray-900/40 via-70% to-transparent z-[1]" />
        {/* Content transition gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-gray-900 to-gray-900/0 z-[2]" />
        {/* Very subtle overall tint */}
        <div className="absolute bottom-0 h-full w-full bg-black/10 z-[1]" />
      </div>

      {/* YouTube Trailer - menurunkan z-index */}
      {videoId && showTrailer ? (
        <div 
          className="absolute inset-0 z-[10] transition-all duration-700 opacity-100"
        >
          {/* Video container - expanded to cover entire hero area */}
          <div className="absolute inset-0 z-[2]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[140%] md:w-[130%] lg:w-[120%] xl:w-[110%] h-[130%] relative transform translate-y-[-18%] md:translate-y-[-13%] lg:translate-y-[-8%]">
                <div className="relative w-full h-full overflow-hidden rounded-lg shadow-2xl">
                  {!videoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    className="absolute inset-0 w-full h-full scale-[1.2]"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&enablejsapi=1&playsinline=1&cc_load_policy=0&iv_load_policy=3&vq=hd1080&hd=1&loop=0&origin=${encodeURIComponent(window.location.origin)}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    onLoad={() => {
                      setVideoReady(true);
                      
                      // Multiple attempts to start the video
                      const playAttempts = [100, 300, 800, 1500];
                      
                      playAttempts.forEach((delay) => {
                        setTimeout(() => {
                          if (iframeRef.current) {
                            // Click the iframe
                            iframeRef.current.click();
                            
                            // Try to use the YouTube API message
                            if (iframeRef.current.contentWindow) {
                              try {
                                // Message to play and unmute
                                iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                
                                // After video starts playing, attempt to unmute
                                setTimeout(() => {
                                  // We need to use muted parameter in URL first and then unmute via state
                                  // This is because browsers block unmuted autoplay but allow muted autoplay
                                  if (!isMuted) {
                                    iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                                  }
                                }, 500);
                              } catch (e) {
                                console.error('Error controlling YouTube video:', e);
                              }
                            }
                          }
                        }, delay);
                      });
                    }}
                    allowFullScreen
                  ></iframe>
                  
                  {/* Penghalang interaksi - mencegah pengguna berinteraksi dengan player YouTube */}
                  <div className="absolute inset-0 z-[50]"></div>
                  
                  {/* Video title overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent z-[55] pointer-events-none">
                    <h3 className="text-white font-bold text-lg md:text-xl">{title}</h3>
                    <p className="text-gray-300 text-sm">Official Trailer</p>
                  </div>
                  
                  {/* Tombol close - berada di atas penghalang interaksi */}
                  <div className="absolute top-4 right-4 z-[60]">
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
          
          {/* Dark overlay with stronger gradient over the video */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-[4] pointer-events-none"></div>
          
          {/* Stronger bottom gradient for better transition to content below */}
          <div className="absolute bottom-0 h-[40%] w-full bg-gradient-to-t from-gray-900/95 via-gray-900/80 to-transparent z-[4] pointer-events-none" />
        </div>
      ) : null}

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-[15]">
          <div className="w-12 h-12 border-t-4 border-red-600 border-solid rounded-full animate-spin"></div>
        </div>
      )}

      {/* Content dengan z-index yang lebih tinggi */}
      <div 
        className={`absolute bottom-[30%] z-[70] transition-all duration-500 container mx-auto px-4 xl:px-8 2xl:px-16 mb-10 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="max-w-[90%] md:max-w-[75%] lg:max-w-[65%] xl:max-w-[55%] 2xl:max-w-[50%]">
          <div className="flex items-center gap-1 mb-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white text-shadow-lg">{title}</h1>
            {contentType === 'tvshow' && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-sm ml-2 uppercase">Series</span>
            )}
            {contentType === 'movie' && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-red-600 text-white rounded-sm ml-2 uppercase">Movie</span>
            )}
          </div>
          <p className="text-white text-base md:text-lg lg:text-xl mb-5 md:mb-6 max-w-3xl line-clamp-3 text-shadow-md">{overview}</p>
          <div className="flex gap-3 relative">
            <button 
              onClick={handlePlayClick}
              disabled={isPlayLoading}
              className={`flex items-center justify-center gap-1.5 bg-red-600 text-white py-2 px-5 md:py-3 md:px-7 rounded-full font-bold hover:bg-red-700 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-600/30 relative z-[80] min-w-[100px] text-sm md:text-base ${isPlayLoading ? 'opacity-75' : ''}`}
              aria-label={`Play ${contentType === 'tvshow' ? 'TV show' : 'movie'}`}
            >
              {isPlayLoading ? <FaSpinner className="animate-spin text-sm" /> : <FaPlay className="text-sm" />}
              <span>{isPlayLoading ? 'Loading...' : 'Play'}</span>
            </button>
            {videoId && !showTrailer && (
              <button 
                onClick={playTrailer}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-5 md:py-3 md:px-7 rounded-full font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-600/30 relative z-[80] min-w-[120px] text-sm md:text-base"
                aria-label="Play trailer"
              >
                <FaPlay className="text-sm" />
                <span>Trailer</span>
              </button>
            )}
            <button 
              onClick={handleMoreInfoClick}
              disabled={isInfoLoading}
              className={`flex items-center justify-center gap-1.5 bg-gray-700/80 text-white py-2 px-5 md:py-3 md:px-7 rounded-full font-bold hover:bg-gray-700 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-lg hover:shadow-gray-600/30 relative z-[80] min-w-[100px] text-sm md:text-base ${isInfoLoading ? 'opacity-75' : ''}`}
              aria-label={`More information about ${contentType === 'tvshow' ? 'TV show' : 'movie'}`}
            >
              {isInfoLoading ? <FaSpinner className="animate-spin text-sm" /> : <FaInfoCircle className="text-sm" />}
              <span>{isInfoLoading ? 'Loading...' : 'More Info'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;