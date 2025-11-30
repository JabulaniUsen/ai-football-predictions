import { supabase, DatabaseMatch, DatabasePrediction } from './supabase';
import { Match, MatchPrediction } from '@/types';

/**
 * Save or update a match in the database
 */
export async function saveMatch(match: Match): Promise<string | null> {
  try {
    const matchData: DatabaseMatch = {
      match_id: match.match_id,
      country_id: match.country_id,
      country_name: match.country_name,
      league_id: match.league_id,
      league_name: match.league_name,
      match_date: match.match_date,
      match_time: match.match_time,
      match_hometeam_id: match.match_hometeam_id,
      match_hometeam_name: match.match_hometeam_name,
      match_awayteam_id: match.match_awayteam_id,
      match_awayteam_name: match.match_awayteam_name,
      match_status: match.match_status,
      match_round: match.match_round,
      match_stadium: match.match_stadium,
      match_referee: match.match_referee,
      team_home_badge: match.team_home_badge,
      team_away_badge: match.team_away_badge,
    };

    // Try to find existing match
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('match_id', match.match_id)
      .single();

    let matchDbId: string;

    if (existingMatch) {
      // Update existing match
      const { data, error } = await supabase
        .from('matches')
        .update(matchData)
        .eq('match_id', match.match_id)
        .select('id')
        .single();

      if (error) throw error;
      matchDbId = data.id;
    } else {
      // Insert new match
      const { data, error } = await supabase
        .from('matches')
        .insert(matchData)
        .select('id')
        .single();

      if (error) throw error;
      matchDbId = data.id;
    }

    return matchDbId;
  } catch (error) {
    console.error('Error saving match:', error);
    return null;
  }
}

/**
 * Save a prediction to the database
 */
export async function savePrediction(
  matchDbId: string,
  prediction: MatchPrediction
): Promise<boolean> {
  try {
    const predictionData: DatabasePrediction = {
      match_id: matchDbId,
      api_match_id: prediction.match.match_id,
      winner_home: prediction.winner.home,
      winner_draw: prediction.winner.draw,
      winner_away: prediction.winner.away,
      predicted_score_home: prediction.predictedScore.home,
      predicted_score_away: prediction.predictedScore.away,
      both_teams_to_score_yes: prediction.bothTeamsToScore.yes,
      both_teams_to_score_no: prediction.bothTeamsToScore.no,
      over_under_over25: prediction.overUnder.over25,
      over_under_under25: prediction.overUnder.under25,
      confidence: prediction.confidence,
      h2h_home_wins: prediction.h2hSummary?.homeWins,
      h2h_draws: prediction.h2hSummary?.draws,
      h2h_away_wins: prediction.h2hSummary?.awayWins,
      h2h_avg_home_goals: prediction.h2hSummary?.avgHomeGoals,
      h2h_avg_away_goals: prediction.h2hSummary?.avgAwayGoals,
    };

    const { error } = await supabase
      .from('predictions')
      .insert(predictionData);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving prediction:', error);
    return false;
  }
}

/**
 * Save match and prediction together
 */
export async function saveMatchAndPrediction(
  prediction: MatchPrediction
): Promise<boolean> {
  try {
    const matchDbId = await saveMatch(prediction.match);
    if (!matchDbId) {
      console.error('Failed to save match');
      return false;
    }

    const saved = await savePrediction(matchDbId, prediction);
    return saved;
  } catch (error) {
    console.error('Error saving match and prediction:', error);
    return false;
  }
}

/**
 * Get historical predictions for a date range
 */
export async function getHistoricalPredictions(
  dateFrom: string,
  dateTo: string,
  leagueId?: string,
  countryId?: string
): Promise<(MatchPrediction & { predictionId: string })[]> {
  try {
    let query = supabase
      .from('predictions')
      .select(`
        *,
        matches (
          id,
          match_id,
          country_id,
          country_name,
          league_id,
          league_name,
          match_date,
          match_time,
          match_hometeam_id,
          match_hometeam_name,
          match_awayteam_id,
          match_awayteam_name,
          match_status,
          match_round,
          match_stadium,
          match_referee,
          team_home_badge,
          team_away_badge
        )
      `)
      .gte('matches.match_date', dateFrom)
      .lte('matches.match_date', dateTo)
      .order('created_at', { ascending: false });

    if (leagueId) {
      query = query.eq('matches.league_id', leagueId);
    }

    if (countryId) {
      query = query.eq('matches.country_id', countryId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform database results to MatchPrediction format
    const predictions: (MatchPrediction & { predictionId: string })[] = (data || []).map((pred: any) => {
      const match = pred.matches;
      return {
        predictionId: pred.id, // Include prediction ID for unique keys
        match: {
          match_id: match.match_id,
          country_id: match.country_id,
          country_name: match.country_name,
          league_id: match.league_id,
          league_name: match.league_name,
          match_date: match.match_date,
          match_time: match.match_time,
          match_hometeam_id: match.match_hometeam_id,
          match_hometeam_name: match.match_hometeam_name,
          match_awayteam_id: match.match_awayteam_id,
          match_awayteam_name: match.match_awayteam_name,
          match_status: match.match_status || '',
          match_round: match.match_round,
          match_stadium: match.match_stadium,
          match_referee: match.match_referee,
          team_home_badge: match.team_home_badge,
          team_away_badge: match.team_away_badge,
        },
        winner: {
          home: pred.winner_home,
          draw: pred.winner_draw,
          away: pred.winner_away,
        },
        predictedScore: {
          home: pred.predicted_score_home,
          away: pred.predicted_score_away,
        },
        bothTeamsToScore: {
          yes: pred.both_teams_to_score_yes,
          no: pred.both_teams_to_score_no,
        },
        overUnder: {
          over25: pred.over_under_over25,
          under25: pred.over_under_under25,
        },
        confidence: pred.confidence,
        h2hSummary: pred.h2h_home_wins !== null ? {
          homeWins: pred.h2h_home_wins,
          draws: pred.h2h_draws,
          awayWins: pred.h2h_away_wins,
          avgHomeGoals: pred.h2h_avg_home_goals,
          avgAwayGoals: pred.h2h_avg_away_goals,
        } : undefined,
      };
    });

    return predictions;
  } catch (error) {
    console.error('Error fetching historical predictions:', error);
    return [];
  }
}

/**
 * Get all available dates with predictions
 */
export async function getAvailablePredictionDates() {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('matches!inner(match_date)')
      .order('matches.match_date', { ascending: false });

    if (error) throw error;

    const dates = new Set<string>();
    (data || []).forEach((item: any) => {
      if (item.matches?.match_date) {
        dates.add(item.matches.match_date);
      }
    });

    return Array.from(dates).sort().reverse();
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return [];
  }
}

