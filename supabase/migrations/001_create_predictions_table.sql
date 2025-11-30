-- Create matches table to store match information
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT UNIQUE NOT NULL,
  country_id TEXT NOT NULL,
  country_name TEXT NOT NULL,
  league_id TEXT NOT NULL,
  league_name TEXT NOT NULL,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  match_hometeam_id TEXT NOT NULL,
  match_hometeam_name TEXT NOT NULL,
  match_awayteam_id TEXT NOT NULL,
  match_awayteam_name TEXT NOT NULL,
  match_status TEXT,
  match_round TEXT,
  match_stadium TEXT,
  match_referee TEXT,
  team_home_badge TEXT,
  team_away_badge TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create predictions table to store AI predictions
CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  api_match_id TEXT NOT NULL,
  winner_home DECIMAL(5,2) NOT NULL,
  winner_draw DECIMAL(5,2) NOT NULL,
  winner_away DECIMAL(5,2) NOT NULL,
  predicted_score_home INTEGER NOT NULL,
  predicted_score_away INTEGER NOT NULL,
  both_teams_to_score_yes DECIMAL(5,2) NOT NULL,
  both_teams_to_score_no DECIMAL(5,2) NOT NULL,
  over_under_over25 DECIMAL(5,2) NOT NULL,
  over_under_under25 DECIMAL(5,2) NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  h2h_home_wins INTEGER,
  h2h_draws INTEGER,
  h2h_away_wins INTEGER,
  h2h_avg_home_goals DECIMAL(4,2),
  h2h_avg_away_goals DECIMAL(4,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, created_at)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_match_id ON matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_api_match_id ON predictions(api_match_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on matches" ON matches
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on predictions" ON predictions
  FOR ALL USING (true) WITH CHECK (true);

