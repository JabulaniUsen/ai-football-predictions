import { Match, H2HData, TeamStats, MatchPrediction } from '@/types';
import { getH2H, getTeamStats } from './api';

/**
 * Calculate Poisson probability
 */
function poisson(k: number, lambda: number): number {
  if (lambda <= 0) return 0;
  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}

/**
 * Calculate score probabilities using Poisson distribution
 */
function calculateScoreProbabilities(
  homeExpected: number,
  awayExpected: number
): { home: number; away: number; probability: number }[] {
  const scores: { home: number; away: number; probability: number }[] = [];
  
  // Calculate probabilities for scores up to 5 goals
  for (let home = 0; home <= 5; home++) {
    for (let away = 0; away <= 5; away++) {
      const prob = poisson(home, homeExpected) * poisson(away, awayExpected);
      scores.push({ home, away, probability: prob });
    }
  }
  
  // Sort by probability and return top scores
  return scores.sort((a, b) => b.probability - a.probability);
}

/**
 * Analyze H2H data to extract statistics
 */
function analyzeH2H(h2hData: H2HData | null, homeTeamId: string, awayTeamId: string) {
  if (!h2hData || !h2hData.firstTeam_VS_secondTeam) {
    return {
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      totalMatches: 0,
      avgHomeGoals: 0,
      avgAwayGoals: 0,
    };
  }

  const matches = h2hData.firstTeam_VS_secondTeam;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let validMatches = 0;

  matches.forEach((match) => {
    if (match.match_status !== 'Finished') return;
    
    const homeScore = parseInt(match.match_hometeam_score || '0', 10);
    const awayScore = parseInt(match.match_awayteam_score || '0', 10);
    
    // Determine which team is home/away in this match
    const isHomeTeamFirst = match.match_hometeam_id === homeTeamId;
    
    if (isHomeTeamFirst) {
      totalHomeGoals += homeScore;
      totalAwayGoals += awayScore;
      
      if (homeScore > awayScore) homeWins++;
      else if (homeScore < awayScore) awayWins++;
      else draws++;
    } else {
      totalHomeGoals += awayScore;
      totalAwayGoals += homeScore;
      
      if (awayScore > homeScore) homeWins++;
      else if (awayScore < homeScore) awayWins++;
      else draws++;
    }
    
    validMatches++;
  });

  return {
    homeWins,
    draws,
    awayWins,
    totalMatches: validMatches,
    avgHomeGoals: validMatches > 0 ? totalHomeGoals / validMatches : 0,
    avgAwayGoals: validMatches > 0 ? totalAwayGoals / validMatches : 0,
  };
}

/**
 * Analyze recent form from team's latest matches
 */
function analyzeForm(latestMatches: any[], teamId: string): {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
} {
  if (!latestMatches || latestMatches.length === 0) {
    return {
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      avgGoalsFor: 0,
      avgGoalsAgainst: 0,
    };
  }

  const recentMatches = latestMatches.slice(0, 5); // Last 5 matches
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  recentMatches.forEach((match) => {
    if (match.match_status !== 'Finished') return;

    const isHome = match.match_hometeam_id === teamId;
    const teamScore = isHome
      ? parseInt(match.match_hometeam_score || '0', 10)
      : parseInt(match.match_awayteam_score || '0', 10);
    const opponentScore = isHome
      ? parseInt(match.match_awayteam_score || '0', 10)
      : parseInt(match.match_hometeam_score || '0', 10);

    goalsFor += teamScore;
    goalsAgainst += opponentScore;

    if (teamScore > opponentScore) wins++;
    else if (teamScore < opponentScore) losses++;
    else draws++;
  });

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    avgGoalsFor: recentMatches.length > 0 ? goalsFor / recentMatches.length : 0,
    avgGoalsAgainst: recentMatches.length > 0 ? goalsAgainst / recentMatches.length : 0,
  };
}

/**
 * Calculate expected goals based on team statistics
 */
function calculateExpectedGoals(
  teamStats: TeamStats | null,
  isHome: boolean
): number {
  if (!teamStats) return 1.5; // Default if no stats available

  const played = isHome
    ? parseInt(teamStats.home_league_payed || '0', 10)
    : parseInt(teamStats.away_league_payed || '0', 10);
  const goalsFor = isHome
    ? parseInt(teamStats.home_league_GF || '0', 10)
    : parseInt(teamStats.away_league_GF || '0', 10);

  if (played === 0) return 1.5;
  return goalsFor / played;
}

/**
 * Calculate expected goals conceded
 */
function calculateExpectedGoalsConceded(
  teamStats: TeamStats | null,
  isHome: boolean
): number {
  if (!teamStats) return 1.5;

  const played = isHome
    ? parseInt(teamStats.home_league_payed || '0', 10)
    : parseInt(teamStats.away_league_payed || '0', 10);
  const goalsAgainst = isHome
    ? parseInt(teamStats.home_league_GA || '0', 10)
    : parseInt(teamStats.away_league_GA || '0', 10);

  if (played === 0) return 1.5;
  return goalsAgainst / played;
}

/**
 * Generate prediction for a match
 */
export async function generatePrediction(match: Match): Promise<MatchPrediction> {
  // Fetch H2H data
  const h2hData = await getH2H(match.match_hometeam_id, match.match_awayteam_id);
  
  // Fetch team statistics
  const homeStats = await getTeamStats(match.match_hometeam_id, match.league_id);
  const awayStats = await getTeamStats(match.match_awayteam_id, match.league_id);

  // Analyze H2H
  const h2hAnalysis = analyzeH2H(
    h2hData,
    match.match_hometeam_id,
    match.match_awayteam_id
  );

  // Analyze recent form
  const homeForm = h2hData ? analyzeForm(h2hData.firstTeam_Latest || [], match.match_hometeam_id) : null;
  const awayForm = h2hData ? analyzeForm(h2hData.secondTeam_Latest || [], match.match_awayteam_id) : null;

  // Calculate expected goals
  let homeExpectedGoals = calculateExpectedGoals(homeStats, true);
  let awayExpectedGoals = calculateExpectedGoals(awayStats, false);

  // Adjust based on opponent's defense
  const homeExpectedConceded = calculateExpectedGoalsConceded(homeStats, true);
  const awayExpectedConceded = calculateExpectedGoalsConceded(awayStats, false);
  
  // Factor in opponent's defensive strength
  homeExpectedGoals = (homeExpectedGoals + (2.0 - awayExpectedConceded)) / 2;
  awayExpectedGoals = (awayExpectedGoals + (2.0 - homeExpectedConceded)) / 2;

  // Factor in H2H if available
  if (h2hAnalysis.totalMatches > 0) {
    homeExpectedGoals = (homeExpectedGoals * 0.6) + (h2hAnalysis.avgHomeGoals * 0.4);
    awayExpectedGoals = (awayExpectedGoals * 0.6) + (h2hAnalysis.avgAwayGoals * 0.4);
  }

  // Factor in recent form
  if (homeForm && homeForm.avgGoalsFor > 0) {
    homeExpectedGoals = (homeExpectedGoals * 0.7) + (homeForm.avgGoalsFor * 0.3);
  }
  if (awayForm && awayForm.avgGoalsFor > 0) {
    awayExpectedGoals = (awayExpectedGoals * 0.7) + (awayForm.avgGoalsFor * 0.3);
  }

  // Ensure minimum values
  homeExpectedGoals = Math.max(0.5, Math.min(4.0, homeExpectedGoals));
  awayExpectedGoals = Math.max(0.5, Math.min(4.0, awayExpectedGoals));

  // Calculate score probabilities
  const scoreProbs = calculateScoreProbabilities(homeExpectedGoals, awayExpectedGoals);
  const mostLikelyScore = scoreProbs[0];

  // Calculate match winner probabilities
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  scoreProbs.forEach((score) => {
    if (score.home > score.away) {
      homeWinProb += score.probability;
    } else if (score.home < score.away) {
      awayWinProb += score.probability;
    } else {
      drawProb += score.probability;
    }
  });

  // Normalize probabilities
  const total = homeWinProb + drawProb + awayWinProb;
  if (total > 0) {
    homeWinProb = (homeWinProb / total) * 100;
    drawProb = (drawProb / total) * 100;
    awayWinProb = (awayWinProb / total) * 100;
  }

  // Factor in H2H record
  if (h2hAnalysis.totalMatches >= 3) {
    const h2hHomeWinRate = h2hAnalysis.homeWins / h2hAnalysis.totalMatches;
    const h2hDrawRate = h2hAnalysis.draws / h2hAnalysis.totalMatches;
    const h2hAwayWinRate = h2hAnalysis.awayWins / h2hAnalysis.totalMatches;

    homeWinProb = (homeWinProb * 0.7) + (h2hHomeWinRate * 100 * 0.3);
    drawProb = (drawProb * 0.7) + (h2hDrawRate * 100 * 0.3);
    awayWinProb = (awayWinProb * 0.7) + (h2hAwayWinRate * 100 * 0.3);
  }

  // Calculate BTTS probability
  let bttsYesProb = 0;
  scoreProbs.forEach((score) => {
    if (score.home > 0 && score.away > 0) {
      bttsYesProb += score.probability;
    }
  });
  bttsYesProb = Math.min(95, Math.max(5, bttsYesProb * 100));
  const bttsNoProb = 100 - bttsYesProb;

  // Calculate Over/Under 2.5
  let over25Prob = 0;
  scoreProbs.forEach((score) => {
    if (score.home + score.away > 2.5) {
      over25Prob += score.probability;
    }
  });
  over25Prob = Math.min(95, Math.max(5, over25Prob * 100));
  const under25Prob = 100 - over25Prob;

  // Calculate overall confidence
  const confidenceFactors = [
    h2hAnalysis.totalMatches >= 3 ? 1.0 : 0.5,
    homeStats ? 1.0 : 0.5,
    awayStats ? 1.0 : 0.5,
    homeForm ? 1.0 : 0.5,
    awayForm ? 1.0 : 0.5,
  ];
  const confidence = (confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length) * 100;

  return {
    match,
    winner: {
      home: Math.round(homeWinProb * 10) / 10,
      draw: Math.round(drawProb * 10) / 10,
      away: Math.round(awayWinProb * 10) / 10,
    },
    predictedScore: {
      home: mostLikelyScore.home,
      away: mostLikelyScore.away,
    },
    bothTeamsToScore: {
      yes: Math.round(bttsYesProb * 10) / 10,
      no: Math.round(bttsNoProb * 10) / 10,
    },
    overUnder: {
      over25: Math.round(over25Prob * 10) / 10,
      under25: Math.round(under25Prob * 10) / 10,
    },
    confidence: Math.round(confidence * 10) / 10,
    h2hSummary: h2hAnalysis.totalMatches > 0 ? {
      homeWins: h2hAnalysis.homeWins,
      draws: h2hAnalysis.draws,
      awayWins: h2hAnalysis.awayWins,
      avgHomeGoals: Math.round(h2hAnalysis.avgHomeGoals * 10) / 10,
      avgAwayGoals: Math.round(h2hAnalysis.avgAwayGoals * 10) / 10,
    } : undefined,
  };
}

