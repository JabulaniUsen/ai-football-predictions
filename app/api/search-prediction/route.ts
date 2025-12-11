import { NextRequest, NextResponse } from 'next/server';
import { generatePrediction } from '@/lib/predictions';
import { findMatchBetweenTeams } from '@/lib/api';
import { Match } from '@/types';
import { format, addDays } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { homeTeamId, homeTeamName, homeTeamBadge, awayTeamId, awayTeamName, awayTeamBadge, leagueId, leagueName, countryId, countryName } = body;

    if (!homeTeamId || !awayTeamId || !homeTeamName || !awayTeamName) {
      return NextResponse.json(
        { error: 'Both teams are required' },
        { status: 400 }
      );
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: 'Home and away teams must be different' },
        { status: 400 }
      );
    }

    // First, try to find an actual match between these two teams
    const existingMatch = await findMatchBetweenTeams(homeTeamId, awayTeamId);

    // If match exists and is finished, return the actual result
    if (existingMatch && existingMatch.match_status === 'Finished') {
      const homeScore = existingMatch.match_hometeam_score 
        ? parseInt(existingMatch.match_hometeam_score, 10) 
        : 0;
      const awayScore = existingMatch.match_awayteam_score 
        ? parseInt(existingMatch.match_awayteam_score, 10) 
        : 0;

      // Check if the teams are in the correct order (home/away)
      const isCorrectOrder = existingMatch.match_hometeam_id === homeTeamId;
      const finalHomeScore = isCorrectOrder ? homeScore : awayScore;
      const finalAwayScore = isCorrectOrder ? awayScore : homeScore;
      
      // Swap badges if teams are in reverse order
      const finalHomeBadge = isCorrectOrder 
        ? (homeTeamBadge || existingMatch.team_home_badge)
        : (awayTeamBadge || existingMatch.team_away_badge);
      const finalAwayBadge = isCorrectOrder
        ? (awayTeamBadge || existingMatch.team_away_badge)
        : (homeTeamBadge || existingMatch.team_home_badge);

      return NextResponse.json({
        finished: true,
        message: 'Match already finished',
        match: {
          ...existingMatch,
          match_hometeam_id: homeTeamId,
          match_hometeam_name: homeTeamName,
          match_awayteam_id: awayTeamId,
          match_awayteam_name: awayTeamName,
          team_home_badge: finalHomeBadge,
          team_away_badge: finalAwayBadge,
        },
        actualScore: {
          home: finalHomeScore,
          away: finalAwayScore,
        },
      });
    }

    // If match exists but not finished, use that match for prediction
    // Otherwise, create a mock match object for prediction
    const matchDate = existingMatch?.match_date || format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const matchTime = existingMatch?.match_time || '15:00';

    const match: Match = existingMatch ? {
      ...existingMatch,
      match_hometeam_id: homeTeamId,
      match_hometeam_name: homeTeamName,
      match_awayteam_id: awayTeamId,
      match_awayteam_name: awayTeamName,
      team_home_badge: homeTeamBadge || existingMatch.team_home_badge,
      team_away_badge: awayTeamBadge || existingMatch.team_away_badge,
    } : {
      match_id: `search_${homeTeamId}_${awayTeamId}_${Date.now()}`,
      country_id: countryId || '',
      country_name: countryName || '',
      league_id: leagueId || '',
      league_name: leagueName || 'Custom Match',
      match_date: matchDate,
      match_time: matchTime,
      match_hometeam_id: homeTeamId,
      match_hometeam_name: homeTeamName,
      match_awayteam_id: awayTeamId,
      match_awayteam_name: awayTeamName,
      match_status: 'Not Started',
      team_home_badge: homeTeamBadge,
      team_away_badge: awayTeamBadge,
    };

    // Generate prediction
    const prediction = await generatePrediction(match);

    return NextResponse.json({ prediction, finished: false });
  } catch (error) {
    console.error('Error generating search prediction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate prediction' },
      { status: 500 }
    );
  }
}
