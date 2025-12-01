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
 * Returns null if insufficient data is available
 */
function calculateExpectedGoals(
  teamStats: TeamStats | null,
  isHome: boolean
): number | null {
  if (!teamStats) return null; // No stats available

  const played = isHome
    ? parseInt(teamStats.home_league_payed || '0', 10)
    : parseInt(teamStats.away_league_payed || '0', 10);
  const goalsFor = isHome
    ? parseInt(teamStats.home_league_GF || '0', 10)
    : parseInt(teamStats.away_league_GF || '0', 10);

  // Require at least 3 matches for reliable statistics
  if (played < 3) return null;
  
  return goalsFor / played;
}

/**
 * Calculate expected goals conceded
 * Returns null if insufficient data is available
 */
function calculateExpectedGoalsConceded(
  teamStats: TeamStats | null,
  isHome: boolean
): number | null {
  if (!teamStats) return null;

  const played = isHome
    ? parseInt(teamStats.home_league_payed || '0', 10)
    : parseInt(teamStats.away_league_payed || '0', 10);
  const goalsAgainst = isHome
    ? parseInt(teamStats.home_league_GA || '0', 10)
    : parseInt(teamStats.away_league_GA || '0', 10);

  // Require at least 3 matches for reliable statistics
  if (played < 3) return null;
  
  return goalsAgainst / played;
}

/**
 * Generate prediction for a match
 */
export async function generatePrediction(match: Match): Promise<MatchPrediction> {
  // Fetch odds if not already present
  let matchWithOdds = { ...match };
  if (!match.match_odd_1 && !match.match_odd_x && !match.match_odd_2) {
    try {
      const { getMatchOdds } = await import('@/lib/api');
      const odds = await getMatchOdds(match.match_id);
      if (odds && (odds.odd_1 || odds.odd_x || odds.odd_2)) {
        matchWithOdds = {
          ...match,
          match_odd_1: odds.odd_1,
          match_odd_x: odds.odd_x,
          match_odd_2: odds.odd_2,
        };
        console.log(`✅ Fetched odds for match ${match.match_id}:`, odds);
      } else {
        console.log(`⚠️ No odds found for match ${match.match_id}`);
      }
    } catch (error) {
      console.warn(`Failed to fetch odds for match ${match.match_id}:`, error);
      // Continue without odds
    }
  } else {
    console.log(`✅ Odds already present for match ${match.match_id}:`, {
      odd_1: match.match_odd_1,
      odd_x: match.match_odd_x,
      odd_2: match.match_odd_2,
    });
  }
  
  // Fetch H2H data
  const h2hData = await getH2H(matchWithOdds.match_hometeam_id, matchWithOdds.match_awayteam_id);
  
  // Fetch team statistics
  const homeStats = await getTeamStats(matchWithOdds.match_hometeam_id, matchWithOdds.league_id);
  const awayStats = await getTeamStats(matchWithOdds.match_awayteam_id, matchWithOdds.league_id);

  // Analyze H2H
  const h2hAnalysis = analyzeH2H(
    h2hData,
    match.match_hometeam_id,
    match.match_awayteam_id
  );

  // Analyze recent form
  const homeForm = h2hData ? analyzeForm(h2hData.firstTeam_Latest || [], match.match_hometeam_id) : null;
  const awayForm = h2hData ? analyzeForm(h2hData.secondTeam_Latest || [], match.match_awayteam_id) : null;

  // Calculate expected goals (require actual data, no defaults)
  const homeExpectedGoalsRaw = calculateExpectedGoals(homeStats, true);
  const awayExpectedGoalsRaw = calculateExpectedGoals(awayStats, false);

  // Check if we have minimum required data
  const hasHomeStats = homeExpectedGoalsRaw !== null;
  const hasAwayStats = awayExpectedGoalsRaw !== null;
  const hasH2H = h2hAnalysis.totalMatches >= 2; // At least 2 H2H matches
  const hasForm = (homeForm && homeForm.avgGoalsFor > 0) || (awayForm && awayForm.avgGoalsFor > 0);

  // Require at least team stats OR H2H data to make a prediction
  if (!hasHomeStats && !hasAwayStats && !hasH2H) {
    console.warn(`⚠️ Insufficient data for match ${match.match_id}: No team stats or H2H data available`);
    // Still proceed but with very low confidence
  }

  // Start with available data or use H2H averages as fallback
  let homeExpectedGoals = homeExpectedGoalsRaw ?? (hasH2H ? h2hAnalysis.avgHomeGoals : 1.2);
  let awayExpectedGoals = awayExpectedGoalsRaw ?? (hasH2H ? h2hAnalysis.avgAwayGoals : 1.2);

  // Adjust based on opponent's defense (only if we have the data)
  const homeExpectedConceded = calculateExpectedGoalsConceded(homeStats, true);
  const awayExpectedConceded = calculateExpectedGoalsConceded(awayStats, false);
  
  // Factor in opponent's defensive strength (only if both stats available)
  if (homeExpectedConceded !== null && awayExpectedConceded !== null) {
    homeExpectedGoals = (homeExpectedGoals * 0.6) + ((2.0 - awayExpectedConceded) * 0.4);
    awayExpectedGoals = (awayExpectedGoals * 0.6) + ((2.0 - homeExpectedConceded) * 0.4);
  } else if (awayExpectedConceded !== null) {
    // Only away defense available
    homeExpectedGoals = (homeExpectedGoals * 0.7) + ((2.0 - awayExpectedConceded) * 0.3);
  } else if (homeExpectedConceded !== null) {
    // Only home defense available
    awayExpectedGoals = (awayExpectedGoals * 0.7) + ((2.0 - homeExpectedConceded) * 0.3);
  }

  // Factor in H2H if available (weight based on number of matches)
  if (hasH2H) {
    const h2hWeight = Math.min(0.5, h2hAnalysis.totalMatches / 10); // Up to 50% weight for 10+ matches
    const statsWeight = 1 - h2hWeight;
    homeExpectedGoals = (homeExpectedGoals * statsWeight) + (h2hAnalysis.avgHomeGoals * h2hWeight);
    awayExpectedGoals = (awayExpectedGoals * statsWeight) + (h2hAnalysis.avgAwayGoals * h2hWeight);
  }

  // Factor in recent form (only if we have meaningful form data)
  if (homeForm && homeForm.avgGoalsFor > 0 && homeForm.goalsFor > 0) {
    const formWeight = 0.2; // 20% weight for form
    homeExpectedGoals = (homeExpectedGoals * (1 - formWeight)) + (homeForm.avgGoalsFor * formWeight);
  }
  if (awayForm && awayForm.avgGoalsFor > 0 && awayForm.goalsFor > 0) {
    const formWeight = 0.2; // 20% weight for form
    awayExpectedGoals = (awayExpectedGoals * (1 - formWeight)) + (awayForm.avgGoalsFor * formWeight);
  }

  // Ensure reasonable values (but don't force defaults)
  homeExpectedGoals = Math.max(0.3, Math.min(4.5, homeExpectedGoals));
  awayExpectedGoals = Math.max(0.3, Math.min(4.5, awayExpectedGoals));

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

  // Factor in H2H record (only if we have sufficient H2H data)
  if (h2hAnalysis.totalMatches >= 2) {
    const h2hHomeWinRate = h2hAnalysis.homeWins / h2hAnalysis.totalMatches;
    const h2hDrawRate = h2hAnalysis.draws / h2hAnalysis.totalMatches;
    const h2hAwayWinRate = h2hAnalysis.awayWins / h2hAnalysis.totalMatches;

    // Weight H2H more heavily if we have many matches
    const h2hWeight = Math.min(0.4, h2hAnalysis.totalMatches / 15); // Up to 40% for 15+ matches
    const statsWeight = 1 - h2hWeight;
    
    homeWinProb = (homeWinProb * statsWeight) + (h2hHomeWinRate * 100 * h2hWeight);
    drawProb = (drawProb * statsWeight) + (h2hDrawRate * 100 * h2hWeight);
    awayWinProb = (awayWinProb * statsWeight) + (h2hAwayWinRate * 100 * h2hWeight);
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

  // Calculate overall confidence based on data availability and quality
  const dataQualityFactors = [
    // H2H data quality (0-1.0)
    h2hAnalysis.totalMatches >= 5 ? 1.0 : 
    h2hAnalysis.totalMatches >= 3 ? 0.8 : 
    h2hAnalysis.totalMatches >= 2 ? 0.6 : 
    h2hAnalysis.totalMatches >= 1 ? 0.4 : 0.0,
    
    // Home team stats quality (0-1.0)
    hasHomeStats ? 1.0 : 0.0,
    
    // Away team stats quality (0-1.0)
    hasAwayStats ? 1.0 : 0.0,
    
    // Recent form quality (0-1.0)
    (homeForm && homeForm.goalsFor > 0) ? 0.8 : 0.0,
    (awayForm && awayForm.goalsFor > 0) ? 0.8 : 0.0,
  ];
  
  const totalDataQuality = dataQualityFactors.reduce((a, b) => a + b, 0);
  const maxPossibleQuality = dataQualityFactors.length;
  
  // Confidence is based on data quality (minimum 30% if we have any data, 0% if no data)
  let confidence = 0;
  if (totalDataQuality > 0) {
    confidence = Math.max(30, (totalDataQuality / maxPossibleQuality) * 100);
  } else {
    confidence = 0; // No data available
  }
  
  // Log data sources used for transparency
  console.log(`📊 Prediction data sources for match ${match.match_id}:`, {
    h2hMatches: h2hAnalysis.totalMatches,
    hasHomeStats,
    hasAwayStats,
    hasHomeForm: !!(homeForm && homeForm.goalsFor > 0),
    hasAwayForm: !!(awayForm && awayForm.goalsFor > 0),
    confidence: Math.round(confidence),
  });

  // Get AI-enhanced prediction from Gemini - REQUIRED
  const { getGeminiAnalysis } = await import('@/lib/gemini-ai');
  const aiPrediction = await getGeminiAnalysis(
    matchWithOdds,
    h2hData,
    homeStats,
    awayStats,
    homeForm,
    awayForm,
    {
      homeExpectedGoals,
      awayExpectedGoals,
      homeWinProb,
      drawProb,
      awayWinProb,
    }
  );

  // If AI analysis fails, throw error - don't provide predictions without AI
  if (!aiPrediction) {
    throw new Error(`AI analysis failed for match ${match.match_id}. Cannot generate prediction without AI analysis.`);
  }

  // Use AI predicted score (weighted 70% AI, 30% statistical)
  const finalPredictedScore = {
    home: Math.round((aiPrediction.predictedScore.home * 0.7) + (mostLikelyScore.home * 0.3)),
    away: Math.round((aiPrediction.predictedScore.away * 0.7) + (mostLikelyScore.away * 0.3)),
  };

  // Blend winner probabilities (60% AI, 40% statistical)
  let finalHomeWinProb = (aiPrediction.winnerProbabilities.home * 0.6) + (homeWinProb * 0.4);
  let finalDrawProb = (aiPrediction.winnerProbabilities.draw * 0.6) + (drawProb * 0.4);
  let finalAwayWinProb = (aiPrediction.winnerProbabilities.away * 0.6) + (awayWinProb * 0.4);

  // Normalize to ensure they sum to 100
  const finalTotal = finalHomeWinProb + finalDrawProb + finalAwayWinProb;
  if (finalTotal > 0) {
    finalHomeWinProb = (finalHomeWinProb / finalTotal) * 100;
    finalDrawProb = (finalDrawProb / finalTotal) * 100;
    finalAwayWinProb = (finalAwayWinProb / finalTotal) * 100;
  }

  // Use AI BTTS and Over/Under if available, otherwise use statistical
  let finalBttsYes = bttsYesProb;
  let finalBttsNo = bttsNoProb;
  let finalOver25 = over25Prob;
  let finalUnder25 = under25Prob;

  if (aiPrediction.bothTeamsToScore) {
    finalBttsYes = (aiPrediction.bothTeamsToScore.yes * 0.6) + (bttsYesProb * 0.4);
    finalBttsNo = 100 - finalBttsYes;
  }
  if (aiPrediction.overUnder) {
    finalOver25 = (aiPrediction.overUnder.over25 * 0.6) + (over25Prob * 0.4);
    finalUnder25 = 100 - finalOver25;
  }

  // Enhance confidence with AI analysis
  const finalConfidence = Math.min(100, (confidence * 0.5) + (aiPrediction.confidence * 0.5));

  console.log(`🤖 AI-enhanced prediction for match ${match.match_id}:`, {
    score: `${finalPredictedScore.home}-${finalPredictedScore.away}`,
    aiScore: `${aiPrediction.predictedScore.home}-${aiPrediction.predictedScore.away}`,
    statScore: `${mostLikelyScore.home}-${mostLikelyScore.away}`,
    confidence: Math.round(finalConfidence),
  });

  return {
    match: matchWithOdds,
    winner: {
      home: Math.round(finalHomeWinProb * 10) / 10,
      draw: Math.round(finalDrawProb * 10) / 10,
      away: Math.round(finalAwayWinProb * 10) / 10,
    },
    predictedScore: finalPredictedScore,
    bothTeamsToScore: {
      yes: Math.round(finalBttsYes * 10) / 10,
      no: Math.round(finalBttsNo * 10) / 10,
    },
    overUnder: {
      over25: Math.round(finalOver25 * 10) / 10,
      under25: Math.round(finalUnder25 * 10) / 10,
    },
    confidence: Math.round(finalConfidence * 10) / 10,
    aiReasoning: aiPrediction.reasoning || undefined,
    h2hSummary: h2hAnalysis.totalMatches > 0 ? {
      homeWins: h2hAnalysis.homeWins,
      draws: h2hAnalysis.draws,
      awayWins: h2hAnalysis.awayWins,
      avgHomeGoals: Math.round(h2hAnalysis.avgHomeGoals * 10) / 10,
      avgAwayGoals: Math.round(h2hAnalysis.avgAwayGoals * 10) / 10,
    } : undefined,
  };
}

