-- Create tables for PDP Movie app

-- Drop tables in the correct order to handle dependencies
DROP TABLE IF EXISTS watch_history CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS subtitles CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Movies table to store all movie information
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  backdrop_url TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  video_url TEXT NOT NULL,
  rating NUMERIC(3,1) NOT NULL,
  release_year INTEGER NOT NULL,
  duration TEXT NOT NULL,
  genre TEXT[] NOT NULL,
  director TEXT NOT NULL,
  movie_cast TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subtitles table to store subtitle information for movies
CREATE TABLE IF NOT EXISTS subtitles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  label TEXT NOT NULL,
  srclang TEXT NOT NULL,
  url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Genres table for genre listings
CREATE TABLE IF NOT EXISTS genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table for extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- User watch history table
CREATE TABLE IF NOT EXISTS watch_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER DEFAULT 0,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- Sample data insertion for movies
INSERT INTO movies (title, description, thumbnail_url, backdrop_url, poster_url, video_url, rating, release_year, duration, genre, director, movie_cast)
VALUES 
(
  'The Matrix Resurrections',
  'Return to a world of two realities: one, everyday life; the other, what lies behind it. To find out if his reality is a construct, to truly know himself, Mr. Anderson will have to follow the white rabbit once more.',
  'https://image.tmdb.org/t/p/w500/8c4a8kE7PizaGQQnditMmI1xbRp.jpg',
  'https://image.tmdb.org/t/p/original/8c4a8kE7PizaGQQnditMmI1xbRp.jpg',
  'https://image.tmdb.org/t/p/w500/8c4a8kE7PizaGQQnditMmI1xbRp.jpg',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  4.5,
  2021,
  '2h 28m',
  ARRAY['Action', 'Sci-Fi', 'Adventure'],
  'Lana Wachowski',
  ARRAY['Keanu Reeves', 'Carrie-Anne Moss', 'Yahya Abdul-Mateen II', 'Jessica Henwick']
);

-- Sample data insertion for subtitles
INSERT INTO subtitles (movie_id, language, label, srclang, url, is_default)
VALUES 
(
  (SELECT id FROM movies WHERE title = 'The Matrix Resurrections' LIMIT 1),
  'English',
  'English',
  'en',
  'https://raw.githubusercontent.com/mozilla/vtt.js/master/tests/styletags/styling.vtt',
  FALSE
),
(
  (SELECT id FROM movies WHERE title = 'The Matrix Resurrections' LIMIT 1),
  'Spanish',
  'Spanish',
  'es',
  'https://raw.githubusercontent.com/mozilla/vtt.js/master/tests/underlines/simple.vtt',
  FALSE
),
(
  (SELECT id FROM movies WHERE title = 'The Matrix Resurrections' LIMIT 1),
  'Indonesia',
  'Indonesia',
  'id',
  'https://raw.githubusercontent.com/mozilla/vtt.js/master/tests/cue-settings/align.vtt',
  TRUE
);

-- Sample data insertion for genres
INSERT INTO genres (name)
VALUES 
('Action'),
('Adventure'),
('Comedy'),
('Drama'),
('Horror'),
('Sci-Fi'),
('Thriller'),
('Romance'),
('Animation'),
('Fantasy'); 