import { Match, H2HData, TeamStats, MatchPrediction } from '@/types';

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || process.env.NEXT_PUBLIC_CEREBRAS_API_KEY || '';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama-3-70b-instruct';

interface AIAnalysisResult {
  winnerProbabilities: {
    home: number;
    draw: number;
    away: number;
  };
  predictedScore: {
    home: number;
    away: number;
  };
  confidence: number;
  reasoning: string;
  bothTeamsToScore: {
    yes: number;
    no: number;
  };
  overUnder: {
    over25: number;
    under25: number;
  };
}

/**
 * Prepare match context for AI analysis
 */
function prepareMatchContext(
  match: Match,
  h2hData: H2HData | null,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: any,
  awayForm: any
): string {
  let context = `Football Match Analysis Request:\n\n`;
  context += `Match: ${match.match_hometeam_name} (Home) vs ${match.match_awayteam_name} (Away)\n`;
  context += `League: ${match.league_name}\n`;
  context += `Date: ${match.match_date} ${match.match_time}\n\n`;

  // H2H Data
  if (h2hData && h2hData.firstTeam_VS_secondTeam) {
    const h2hMatches = h2hData.firstTeam_VS_secondTeam.filter(m => m.match_status === 'Finished');
    if (h2hMatches.length > 0) {
      context += `Head-to-Head History (${h2hMatches.length} matches):\n`;
      h2hMatches.slice(0, 5).forEach((m, i) => {
        context += `  ${i + 1}. ${m.match_date}: ${m.match_hometeam_name} ${m.match_hometeam_score} - ${m.match_awayteam_score} ${m.match_awayteam_name}\n`;
      });
      context += '\n';
    }
  }

  // Home Team Stats
  if (homeStats) {
    context += `Home Team (${match.match_hometeam_name}) Statistics:\n`;
    context += `  Overall Position: ${homeStats.overall_league_position || 'N/A'}\n`;
    context += `  Overall Record: W${homeStats.overall_league_W || '0'}-D${homeStats.overall_league_D || '0'}-L${homeStats.overall_league_L || '0'}\n`;
    context += `  Goals For: ${homeStats.overall_league_GF || '0'}, Goals Against: ${homeStats.overall_league_GA || '0'}\n`;
    context += `  Home Record: W${homeStats.home_league_W || '0'}-D${homeStats.home_league_D || '0'}-L${homeStats.home_league_L || '0'}\n`;
    context += `  Home Goals For: ${homeStats.home_league_GF || '0'}, Home Goals Against: ${homeStats.home_league_GA || '0'}\n\n`;
  }

  // Away Team Stats
  if (awayStats) {
    context += `Away Team (${match.match_awayteam_name}) Statistics:\n`;
    context += `  Overall Position: ${awayStats.overall_league_position || 'N/A'}\n`;
    context += `  Overall Record: W${awayStats.overall_league_W || '0'}-D${awayStats.overall_league_D || '0'}-L${awayStats.overall_league_L || '0'}\n`;
    context += `  Goals For: ${awayStats.overall_league_GF || '0'}, Goals Against: ${awayStats.overall_league_GA || '0'}\n`;
    context += `  Away Record: W${awayStats.away_league_W || '0'}-D${awayStats.away_league_D || '0'}-L${awayStats.away_league_L || '0'}\n`;
    context += `  Away Goals For: ${awayStats.away_league_GF || '0'}, Away Goals Against: ${awayStats.away_league_GA || '0'}\n\n`;
  }

  // Recent Form
  if (homeForm) {
    context += `Home Team Recent Form (Last 5 matches):\n`;
    context += `  Wins: ${homeForm.wins}, Draws: ${homeForm.draws}, Losses: ${homeForm.losses}\n`;
    context += `  Avg Goals For: ${homeForm.avgGoalsFor.toFixed(2)}, Avg Goals Against: ${homeForm.avgGoalsAgainst.toFixed(2)}\n\n`;
  }

  if (awayForm) {
    context += `Away Team Recent Form (Last 5 matches):\n`;
    context += `  Wins: ${awayForm.wins}, Draws: ${awayForm.draws}, Losses: ${awayForm.losses}\n`;
    context += `  Avg Goals For: ${awayForm.avgGoalsFor.toFixed(2)}, Avg Goals Against: ${awayForm.avgGoalsAgainst.toFixed(2)}\n\n`;
  }

  return context;
}

/**
 * Call Cerebras API for AI analysis
 * Tries multiple model names if the first one fails
 */
async function callCerebrasAI(context: string, retryCount = 0): Promise<string> {
  if (!CEREBRAS_API_KEY) {
    throw new Error('Cerebras API key not configured');
  }

  // List of model names to try
  const modelNames = [
    CEREBRAS_MODEL,
    'llama-3-70b-instruct',
    'llama-3.1-70b-instruct',
    'llama-3-8b-instruct',
    'llama-2-70b-chat',
    'llama-2-13b-chat',
  ];

  const modelToTry = modelNames[retryCount] || modelNames[0];

  const prompt = `${context}

Based on the above match data, provide a detailed analysis and prediction. Please respond in the following JSON format:
{
  "winnerProbabilities": {
    "home": <percentage 0-100>,
    "draw": <percentage 0-100>,
    "away": <percentage 0-100>
  },
  "predictedScore": {
    "home": <integer>,
    "away": <integer>
  },
  "confidence": <percentage 0-100>,
  "reasoning": "<brief explanation of the prediction>",
  "bothTeamsToScore": {
    "yes": <percentage 0-100>,
    "no": <percentage 0-100>
  },
  "overUnder": {
    "over25": <percentage 0-100>,
    "under25": <percentage 0-100>
  }
}

Analyze the data carefully considering:
- Head-to-head history and patterns
- Team form and recent performance
- Home/away advantage
- Goal scoring and defensive statistics
- League position and overall quality
- Any notable trends or factors

Provide accurate probabilities that sum to 100% for winner predictions.`;

  try {
    const response = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelToTry,
        messages: [
          {
            role: 'system',
            content: 'You are an expert football analyst with deep knowledge of match statistics, team performance, and prediction modeling. Always respond with valid JSON only, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Try to parse error as JSON to check for model_not_found
      try {
        const errorData = JSON.parse(errorText);
        
        // If model not found and we have more models to try, retry with next model
        if (errorData.code === 'model_not_found' && retryCount < modelNames.length - 1) {
          console.warn(`Model ${modelToTry} not found, trying next model...`);
          return callCerebrasAI(context, retryCount + 1);
        }
      } catch {
        // Error text is not JSON, continue with error
      }
      
      throw new Error(`Cerebras API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // If using JSON response format, content should already be JSON
    if (content.trim().startsWith('{')) {
      return content;
    }
    
    // Otherwise, try to extract JSON from the response
    return content;
  } catch (error) {
    console.error('Cerebras API error:', error);
    throw error;
  }
}

/**
 * Parse AI response and extract predictions
 */
function parseAIResponse(aiResponse: string): AIAnalysisResult | null {
  try {
    // Try to parse directly first (if using JSON response format)
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      // If direct parse fails, try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in AI response');
        return null;
      }
      parsed = JSON.parse(jsonMatch[0]);
    }
    
    // Validate and normalize the response
    const result: AIAnalysisResult = {
      winnerProbabilities: {
        home: Math.max(0, Math.min(100, parsed.winnerProbabilities?.home || 0)),
        draw: Math.max(0, Math.min(100, parsed.winnerProbabilities?.draw || 0)),
        away: Math.max(0, Math.min(100, parsed.winnerProbabilities?.away || 0)),
      },
      predictedScore: {
        home: Math.max(0, Math.min(10, Math.round(parsed.predictedScore?.home || 0))),
        away: Math.max(0, Math.min(10, Math.round(parsed.predictedScore?.away || 0))),
      },
      confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
      reasoning: parsed.reasoning || 'AI analysis based on match statistics',
      bothTeamsToScore: {
        yes: Math.max(0, Math.min(100, parsed.bothTeamsToScore?.yes || 0)),
        no: Math.max(0, Math.min(100, parsed.bothTeamsToScore?.no || 0)),
      },
      overUnder: {
        over25: Math.max(0, Math.min(100, parsed.overUnder?.over25 || 0)),
        under25: Math.max(0, Math.min(100, parsed.overUnder?.under25 || 0)),
      },
    };

    // Normalize probabilities to sum to 100
    const total = result.winnerProbabilities.home + result.winnerProbabilities.draw + result.winnerProbabilities.away;
    if (total > 0) {
      result.winnerProbabilities.home = (result.winnerProbabilities.home / total) * 100;
      result.winnerProbabilities.draw = (result.winnerProbabilities.draw / total) * 100;
      result.winnerProbabilities.away = (result.winnerProbabilities.away / total) * 100;
    }

    return result;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return null;
  }
}

/**
 * Get AI-enhanced prediction analysis (server-side only)
 */
export async function getAIAnalysis(
  match: Match,
  h2hData: H2HData | null,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: any,
  awayForm: any
): Promise<AIAnalysisResult | null> {
  try {
    // Check for API key first
    if (!CEREBRAS_API_KEY) {
      console.error('Cerebras API key not configured. Set CEREBRAS_API_KEY or NEXT_PUBLIC_CEREBRAS_API_KEY environment variable.');
      return null;
    }

    const context = prepareMatchContext(match, h2hData, homeStats, awayStats, homeForm, awayForm);
    const aiResponse = await callCerebrasAI(context);
    const parsed = parseAIResponse(aiResponse);
    
    if (!parsed) {
      console.error('Failed to parse AI response. Response may be invalid or malformed.');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.message.includes('API key')) {
        console.error('Please set CEREBRAS_API_KEY or NEXT_PUBLIC_CEREBRAS_API_KEY in your environment variables.');
      }
    }
    return null;
  }
}

/**
 * Get AI-enhanced prediction analysis via API route (client-side)
 */
export async function getAIAnalysisViaAPI(
  match: Match,
  h2hData: H2HData | null,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  homeForm: any,
  awayForm: any
): Promise<AIAnalysisResult | null> {
  try {
    const response = await fetch('/api/ai-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        match,
        h2hData,
        homeStats,
        awayStats,
        homeForm,
        awayForm,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API request failed: ${response.statusText}`;
      const errorDetails = errorData.details || '';
      
      console.error('AI analysis API error:', errorMessage, errorDetails ? `- ${errorDetails}` : '');
      
      // Don't throw, just return null so statistical model can be used
      return null;
    }

    const result = await response.json();
    
    // Check if result has an error field (API returned error but with 200 status)
    if (result.error) {
      console.error('AI analysis API returned error:', result.error, result.details || '');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Error getting AI analysis via API:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
}

