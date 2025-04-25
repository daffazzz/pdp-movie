export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  backdrop_url?: string;
  poster_url?: string;
  genre: string[];
  rating: number;
  release_year: number;
  duration: string;
  video_url: string;
  director?: string;
  movie_cast?: string[];
  subtitles?: Subtitle[];
}

export interface Subtitle {
  language: string;
  url: string;
  label?: string;
  srclang?: string;
  default?: boolean;
}

export interface Genre {
  id: string;
  name: string;
} 