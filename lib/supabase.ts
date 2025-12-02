import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cmjefszkbalkfdxnbkui.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtamVmc3prYmFsa2ZkeG5ia3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTM0MzgsImV4cCI6MjA3OTk4OTQzOH0.EkmlVwy-FpJfzxGcCOXm9ZLzA1aV7-5VtF-J0J1R3oY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DatabaseMatch {
  id?: string;
  match_id: string;
  country_id: string;
  country_name: string;
  league_id: string;
  league_name: string;
  match_date: string;
  match_time: string;
  match_hometeam_id: string;
  match_hometeam_name: string;
  match_awayteam_id: string;
  match_awayteam_name: string;
  match_status?: string;
  match_round?: string;
  match_stadium?: string;
  match_referee?: string;
  team_home_badge?: string;
  team_away_badge?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabasePrediction {
  id?: string;
  match_id?: string;
  api_match_id: string;
  winner_home: number;
  winner_draw: number;
  winner_away: number;
  predicted_score_home: number;
  predicted_score_away: number;
  both_teams_to_score_yes: number;
  both_teams_to_score_no: number;
  over_under_over25: number;
  over_under_under25: number;
  confidence: number;
  h2h_home_wins?: number;
  h2h_draws?: number;
  h2h_away_wins?: number;
  h2h_avg_home_goals?: number;
  h2h_avg_away_goals?: number;
  actual_score_home?: number;
  actual_score_away?: number;
  result_status?: 'win' | 'loss' | 'draw';
  is_marked?: boolean;
  ai_reasoning?: string;
  created_at?: string;
  updated_at?: string;
}

