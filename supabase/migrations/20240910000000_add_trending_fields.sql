-- Add trending and TMDB-related fields to movies and series tables

-- Add columns to movies table if they don't exist
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS tmdb_id INTEGER,
ADD COLUMN IF NOT EXISTS external_ids JSONB,
ADD COLUMN IF NOT EXISTS has_sources BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS popularity NUMERIC(10,3) DEFAULT 0;

-- Add columns to series table if they don't exist
ALTER TABLE series 
ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS popularity NUMERIC(10,3) DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_is_trending ON movies(is_trending);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity);
CREATE INDEX IF NOT EXISTS idx_series_tmdb_id ON series(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_series_is_trending ON series(is_trending);
CREATE INDEX IF NOT EXISTS idx_series_popularity ON series(popularity);

-- Create movie_sources table if it doesn't exist (for video source management)
CREATE TABLE IF NOT EXISTS movie_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(movie_id, provider)
);

-- Create series_sources table if it doesn't exist (for TV series source management)
CREATE TABLE IF NOT EXISTS series_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(series_id, provider)
);












