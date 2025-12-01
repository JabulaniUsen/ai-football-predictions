import { GoogleGenAI } from '@google/genai';
import { Match, H2HData, TeamStats } from '@/types';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Google Gemini API key not found. Set NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY in .env.local');
}

// The client gets the API key from the environment variable `GEMINI_API_KEY` or we can pass it explicitly
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface AIAnalysisResult {
  predictedScore: {
    home: number;
    away: number;
  };
  winnerProbabilities: {
    home: number;
    draw: number;
    away: number;
  };
  confidence: number;
  reasoning?: string;
  bothTeamsToScore?: {
    yes: number;
    no: number;
  };
  overUnder?: {
    over25: number;
    under25: number;
  };
}

/**
 * Prepare comprehensive match context for AI analysis
 */
function prepareMatchContext(
  match: Match,
  h2hData: H2HData | null,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: any,
  awayForm: any,
  statisticalPrediction: {
    homeExpectedGoals: number;
    awayExpectedGoals: number;
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
  }
): string {
  let context = `Football Match Analysis and Prediction Request\n\n`;
  context += `MATCH INFORMATION:\n`;
  context += `Home Team: ${match.match_hometeam_name}\n`;
  context += `Away Team: ${match.match_awayteam_name}\n`;
  context += `League: ${match.league_name} (${match.country_name})\n`;
  context += `Date: ${match.match_date} at ${match.match_time}\n`;
  if (match.match_round) context += `Round: ${match.match_round}\n`;
  context += `\n`;

  // Statistical Prediction Summary
  context += `STATISTICAL MODEL PREDICTION:\n`;
  context += `Expected Goals: Home ${statisticalPrediction.homeExpectedGoals.toFixed(2)}, Away ${statisticalPrediction.awayExpectedGoals.toFixed(2)}\n`;
  context += `Win Probabilities: Home ${statisticalPrediction.homeWinProb.toFixed(1)}%, Draw ${statisticalPrediction.drawProb.toFixed(1)}%, Away ${statisticalPrediction.awayWinProb.toFixed(1)}%\n`;
  context += `\n`;

  // H2H Data
  if (h2hData && h2hData.firstTeam_VS_secondTeam) {
    const h2hMatches = h2hData.firstTeam_VS_secondTeam.filter(m => m.match_status === 'Finished');
    if (h2hMatches.length > 0) {
      context += `HEAD-TO-HEAD HISTORY (${h2hMatches.length} matches):\n`;
      h2hMatches.slice(0, 10).forEach((m, i) => {
        const isHomeFirst = m.match_hometeam_id === match.match_hometeam_id;
        const homeTeam = isHomeFirst ? m.match_hometeam_name : m.match_awayteam_name;
        const awayTeam = isHomeFirst ? m.match_awayteam_name : m.match_hometeam_name;
        const homeScore = isHomeFirst ? m.match_hometeam_score : m.match_awayteam_score;
        const awayScore = isHomeFirst ? m.match_awayteam_score : m.match_hometeam_score;
        context += `  ${i + 1}. ${m.match_date}: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}\n`;
      });
      context += `\n`;
    }
  }

  // Home Team Stats
  if (homeStats) {
    context += `HOME TEAM STATISTICS (${match.match_hometeam_name}):\n`;
    context += `  Overall Position: ${homeStats.overall_league_position || 'N/A'}\n`;
    context += `  Overall Record: ${homeStats.overall_league_W || '0'}W-${homeStats.overall_league_D || '0'}D-${homeStats.overall_league_L || '0'}L\n`;
    context += `  Goals: ${homeStats.overall_league_GF || '0'} For, ${homeStats.overall_league_GA || '0'} Against\n`;
    context += `  Home Record: ${homeStats.home_league_W || '0'}W-${homeStats.home_league_D || '0'}D-${homeStats.home_league_L || '0'}L\n`;
    context += `  Home Goals: ${homeStats.home_league_GF || '0'} For, ${homeStats.home_league_GA || '0'} Against\n`;
    context += `  Home Matches Played: ${homeStats.home_league_payed || '0'}\n`;
    context += `\n`;
  }

  // Away Team Stats
  if (awayStats) {
    context += `AWAY TEAM STATISTICS (${match.match_awayteam_name}):\n`;
    context += `  Overall Position: ${awayStats.overall_league_position || 'N/A'}\n`;
    context += `  Overall Record: ${awayStats.overall_league_W || '0'}W-${awayStats.overall_league_D || '0'}D-${awayStats.overall_league_L || '0'}L\n`;
    context += `  Goals: ${awayStats.overall_league_GF || '0'} For, ${awayStats.overall_league_GA || '0'} Against\n`;
    context += `  Away Record: ${awayStats.away_league_W || '0'}W-${awayStats.away_league_D || '0'}D-${awayStats.away_league_L || '0'}L\n`;
    context += `  Away Goals: ${awayStats.away_league_GF || '0'} For, ${awayStats.away_league_GA || '0'} Against\n`;
    context += `  Away Matches Played: ${awayStats.away_league_payed || '0'}\n`;
    context += `\n`;
  }

  // Recent Form
  if (homeForm) {
    context += `HOME TEAM RECENT FORM (Last 5 matches):\n`;
    context += `  Record: ${homeForm.wins}W-${homeForm.draws}D-${homeForm.losses}L\n`;
    context += `  Goals For: ${homeForm.goalsFor} (Avg: ${homeForm.avgGoalsFor.toFixed(2)})\n`;
    context += `  Goals Against: ${homeForm.goalsAgainst} (Avg: ${homeForm.avgGoalsAgainst.toFixed(2)})\n`;
    context += `\n`;
  }

  if (awayForm) {
    context += `AWAY TEAM RECENT FORM (Last 5 matches):\n`;
    context += `  Record: ${awayForm.wins}W-${awayForm.draws}D-${awayForm.losses}L\n`;
    context += `  Goals For: ${awayForm.goalsFor} (Avg: ${awayForm.avgGoalsFor.toFixed(2)})\n`;
    context += `  Goals Against: ${awayForm.goalsAgainst} (Avg: ${awayForm.avgGoalsAgainst.toFixed(2)})\n`;
    context += `\n`;
  }

  return context;
}

/**
 * Get AI-enhanced prediction from Google Gemini
 */
export async function getGeminiAnalysis(
  match: Match,
  h2hData: H2HData | null,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: any,
  awayForm: any,
  statisticalPrediction: {
    homeExpectedGoals: number;
    awayExpectedGoals: number;
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
  }
): Promise<AIAnalysisResult | null> {
  if (!ai || !apiKey) {
    console.warn('Google Gemini AI not configured. Set NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY in .env.local');
    return null;
  }

  try {
    const context = prepareMatchContext(
      match,
      h2hData,
      homeStats,
      awayStats,
      homeForm,
      awayForm,
      statisticalPrediction
    );

    const prompt = `${context}

Based on the comprehensive match data above, provide a detailed AI analysis and prediction. 

Consider:
- Head-to-head history and patterns
- Team form and recent performance (last 5 matches)
- Home/away advantage and records
- Goal scoring and defensive statistics
- League position and overall quality
- Statistical model predictions as baseline
- Any notable trends or factors

Please respond in the following JSON format (ONLY JSON, no other text):
{
  "predictedScore": {
    "home": <integer 0-5>,
    "away": <integer 0-5>
  },
  "winnerProbabilities": {
    "home": <percentage 0-100>,
    "draw": <percentage 0-100>,
    "away": <percentage 0-100>
  },
  "confidence": <percentage 0-100>,
  "reasoning": "<short note (2-3 sentences) explaining your prediction based on the data>",
  "bothTeamsToScore": {
    "yes": <percentage 0-100>,
    "no": <percentage 0-100>
  },
  "overUnder": {
    "over25": <percentage 0-100>,
    "under25": <percentage 0-100>
  }
}

IMPORTANT:
- Winner probabilities must sum to 100%
- Predicted score should be realistic integers (0-5 goals)
- Confidence should reflect data quality and analysis certainty
- Reasoning must be a short, concise note (2-3 sentences) explaining the key factors that influenced your prediction
- Focus on the most important data points: head-to-head results, recent form, home/away records, or statistical trends`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';

    // Parse JSON response
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in AI response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as AIAnalysisResult;

      // Validate response
      if (
        typeof parsed.predictedScore?.home !== 'number' ||
        typeof parsed.predictedScore?.away !== 'number' ||
        typeof parsed.winnerProbabilities?.home !== 'number' ||
        typeof parsed.winnerProbabilities?.draw !== 'number' ||
        typeof parsed.winnerProbabilities?.away !== 'number'
      ) {
        console.error('Invalid AI response structure');
        return null;
      }

      // Normalize probabilities to sum to 100
      const total = parsed.winnerProbabilities.home + parsed.winnerProbabilities.draw + parsed.winnerProbabilities.away;
      if (total > 0) {
        parsed.winnerProbabilities.home = (parsed.winnerProbabilities.home / total) * 100;
        parsed.winnerProbabilities.draw = (parsed.winnerProbabilities.draw / total) * 100;
        parsed.winnerProbabilities.away = (parsed.winnerProbabilities.away / total) * 100;
      }

      // Ensure score is within valid range
      parsed.predictedScore.home = Math.max(0, Math.min(5, Math.round(parsed.predictedScore.home)));
      parsed.predictedScore.away = Math.max(0, Math.min(5, Math.round(parsed.predictedScore.away)));

      console.log(`✅ Gemini AI analysis for match ${match.match_id}:`, {
        score: `${parsed.predictedScore.home}-${parsed.predictedScore.away}`,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning ? parsed.reasoning.substring(0, 100) + '...' : 'No reasoning provided',
      });

      return parsed;
    } catch (parseError) {
      console.error('Failed to parse Gemini AI response:', parseError);
      console.error('Response was:', responseText.substring(0, 500));
      return null;
    }
  } catch (error) {
    console.error('Error getting Gemini AI analysis:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}
