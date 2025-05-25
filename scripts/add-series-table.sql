-- Create TV Series table if it doesn't exist
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  backdrop_url TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  tmdb_id INTEGER,
  rating NUMERIC(3,1) NOT NULL,
  release_year INTEGER NOT NULL,
  seasons INTEGER DEFAULT 1,
  genre TEXT[] NOT NULL,
  director TEXT,
  series_cast TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create episodes table if it doesn't exist
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(series_id, season, episode)
);

-- Create subtitles table for episodes if it doesn't exist
CREATE TABLE IF NOT EXISTS episode_subtitles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  label TEXT NOT NULL,
  srclang TEXT NOT NULL,
  url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add sample data for series (if table is empty)
INSERT INTO series (title, description, thumbnail_url, backdrop_url, poster_url, tmdb_id, rating, release_year, seasons, genre, director, series_cast)
SELECT 
  'Stranger Things',
  'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.',
  'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
  'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
  'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
  66732,
  4.7,
  2016,
  4,
  ARRAY['Drama', 'Mystery', 'Sci-Fi', 'Fantasy'],
  'The Duffer Brothers',
  ARRAY['Millie Bobby Brown', 'Finn Wolfhard', 'Winona Ryder', 'David Harbour']
WHERE NOT EXISTS (SELECT 1 FROM series LIMIT 1); 