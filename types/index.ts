// API Response Types
export interface Team {
  team_id: string;
  team_name: string;
  team_badge?: string;
}

export interface Match {
  match_id: string;
  country_id: string;
  country_name: string;
  league_id: string;
  league_name: string;
  match_date: string;
  match_time: string;
  match_hometeam_id: string;
  match_hometeam_name: string;
  match_hometeam_score?: string;
  match_awayteam_id: string;
  match_awayteam_name: string;
  match_awayteam_score?: string;
  match_status: string;
  match_round?: string;
  match_stadium?: string;
  match_referee?: string;
  team_home_badge?: string;
  team_away_badge?: string;
  // Odds fields (from API Football v3)
  match_odd_1?: string; // Home win odds
  match_odd_x?: string; // Draw odds
  match_odd_2?: string; // Away win odds
}

export interface H2HMatch {
  match_id: string;
  match_date: string;
  match_hometeam_id: string;
  match_hometeam_name: string;
  match_hometeam_score: string;
  match_awayteam_id: string;
  match_awayteam_name: string;
  match_awayteam_score: string;
  match_status: string;
}

export interface H2HData {
  firstTeam_VS_secondTeam: H2HMatch[];
  firstTeam_Latest: H2HMatch[];
  secondTeam_Latest: H2HMatch[];
}

export interface TeamStats {
  team_id: string;
  team_name: string;
  overall_league_position?: string;
  overall_league_payed?: string;
  overall_league_W?: string;
  overall_league_D?: string;
  overall_league_L?: string;
  overall_league_GF?: string;
  overall_league_GA?: string;
  overall_league_PTS?: string;
  home_league_position?: string;
  home_league_payed?: string;
  home_league_W?: string;
  home_league_D?: string;
  home_league_L?: string;
  home_league_GF?: string;
  home_league_GA?: string;
  away_league_position?: string;
  away_league_payed?: string;
  away_league_W?: string;
  away_league_D?: string;
  away_league_L?: string;
  away_league_GF?: string;
  away_league_GA?: string;
}

// Prediction Types
export interface MatchPrediction {
  match: Match;
  winner: {
    home: number; // percentage
    draw: number;
    away: number;
  };
  predictedScore: {
    home: number;
    away: number;
  };
  bothTeamsToScore: {
    yes: number; // percentage
    no: number;
  };
  overUnder: {
    over25: number; // percentage
    under25: number;
  };
  confidence: number; // overall confidence 0-100
  aiReasoning?: string; // Short AI-generated note explaining the prediction
  h2hSummary?: {
    homeWins: number;
    draws: number;
    awayWins: number;
    avgHomeGoals: number;
    avgAwayGoals: number;
  };
  // Actual result fields (for historical predictions)
  actualScore?: {
    home: number;
    away: number;
  };
  resultStatus?: 'win' | 'loss' | 'draw'; // Whether the prediction was correct
  updatedAt?: string; // When the actual score was last updated
  isMarked?: boolean; // Whether the prediction has been marked/reviewed
}

export interface APIResponse<T> {
  error?: number;
  message?: string;
  data?: T;
}

