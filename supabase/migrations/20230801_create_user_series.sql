-- Create user_series table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  series_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, series_id),
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_series
    FOREIGN KEY(series_id)
    REFERENCES series(id)
    ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_series_user_id ON user_series(user_id);
CREATE INDEX IF NOT EXISTS idx_user_series_series_id ON user_series(series_id);

-- Enable RLS
ALTER TABLE user_series ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own series list" ON user_series
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add series to their list" ON user_series
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete series from their list" ON user_series
  FOR DELETE USING (auth.uid() = user_id); 