import { Match, H2HData, TeamStats, APIResponse } from '@/types';

const API_BASE_URL = 'https://apiv3.apifootball.com';
const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || '';

if (!API_KEY) {
  console.warn('API key not found. Please set NEXT_PUBLIC_API_FOOTBALL_KEY in .env.local');
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}?${endpoint}&APIkey=${API_KEY}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check for API errors
    if (data.error && data.error !== 0) {
      throw new Error(data.message || 'API returned an error');
    }

    return data as T;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Fetch fixtures/events for a date range
 */
export async function getFixtures(
  dateFrom: string,
  dateTo: string,
  leagueId?: string,
  countryId?: string
): Promise<Match[]> {
  try {
    let endpoint = `action=get_events&from=${dateFrom}&to=${dateTo}`;
    if (leagueId) {
      endpoint += `&league_id=${leagueId}`;
    }
    if (countryId) {
      endpoint += `&country_id=${countryId}`;
    }
    const data = await fetchAPI<any[]>(endpoint);
    
    // Log first match to see structure (only in development)
    if (process.env.NODE_ENV === 'development' && Array.isArray(data) && data.length > 0) {
      console.log('Sample API response:', JSON.stringify(data[0], null, 2));
    }
    
    // Map the API response to Match type, handling different possible odds field names
    const matches: Match[] = (Array.isArray(data) ? data : []).map((item: any) => ({
      match_id: item.match_id || '',
      country_id: item.country_id || '',
      country_name: item.country_name || '',
      league_id: item.league_id || '',
      league_name: item.league_name || '',
      match_date: item.match_date || '',
      match_time: item.match_time || '',
      match_hometeam_id: item.match_hometeam_id || '',
      match_hometeam_name: item.match_hometeam_name || '',
      match_hometeam_score: item.match_hometeam_score,
      match_awayteam_id: item.match_awayteam_id || '',
      match_awayteam_name: item.match_awayteam_name || '',
      match_awayteam_score: item.match_awayteam_score,
      match_status: item.match_status || '',
      match_round: item.match_round,
      match_stadium: item.match_stadium,
      match_referee: item.match_referee,
      team_home_badge: item.team_home_badge,
      team_away_badge: item.team_away_badge,
      // Try different possible odds field names
      match_odd_1: item.match_odd_1 || item.odd_1 || item.odds?.home || item.odds_1x2?.odd_1 || item.bookmakers?.[0]?.bets?.[0]?.values?.find((v: any) => v.value === '1')?.odd,
      match_odd_x: item.match_odd_x || item.odd_x || item.odds?.draw || item.odds_1x2?.odd_x || item.bookmakers?.[0]?.bets?.[0]?.values?.find((v: any) => v.value === 'X')?.odd,
      match_odd_2: item.match_odd_2 || item.odd_2 || item.odds?.away || item.odds_1x2?.odd_2 || item.bookmakers?.[0]?.bets?.[0]?.values?.find((v: any) => v.value === '2')?.odd,
    }));
    
    return matches;
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
}

/**
 * Get unique leagues from fixtures
 */
export function getUniqueLeagues(fixtures: Match[]): Array<{ id: string; name: string; country: string }> {
  const leagueMap = new Map<string, { id: string; name: string; country: string }>();
  
  fixtures.forEach((fixture) => {
    const key = `${fixture.league_id}-${fixture.country_id}`;
    if (!leagueMap.has(key)) {
      leagueMap.set(key, {
        id: fixture.league_id,
        name: fixture.league_name,
        country: fixture.country_name,
      });
    }
  });
  
  return Array.from(leagueMap.values()).sort((a, b) => {
    if (a.country !== b.country) {
      return a.country.localeCompare(b.country);
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get unique countries from fixtures
 */
export function getUniqueCountries(fixtures: Match[]): Array<{ id: string; name: string }> {
  const countryMap = new Map<string, { id: string; name: string }>();
  
  fixtures.forEach((fixture) => {
    if (!countryMap.has(fixture.country_id)) {
      countryMap.set(fixture.country_id, {
        id: fixture.country_id,
        name: fixture.country_name,
      });
    }
  });
  
  return Array.from(countryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch head-to-head data between two teams
 */
export async function getH2H(
  team1Id: string,
  team2Id: string
): Promise<H2HData | null> {
  try {
    const data = await fetchAPI<H2HData>(
      `action=get_H2H&firstTeamId=${team1Id}&secondTeamId=${team2Id}`
    );
    return data;
  } catch (error) {
    console.error('Error fetching H2H data:', error);
    return null;
  }
}

/**
 * Fetch team statistics for a league
 */
export async function getTeamStats(
  teamId: string,
  leagueId: string
): Promise<TeamStats | null> {
  try {
    const data = await fetchAPI<TeamStats[]>(
      `action=get_standings&league_id=${leagueId}&team_id=${teamId}`
    );
    
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching team stats:', error);
    return null;
  }
}

/**
 * Fetch league standings
 */
export async function getStandings(leagueId: string): Promise<TeamStats[]> {
  try {
    const data = await fetchAPI<TeamStats[]>(
      `action=get_standings&league_id=${leagueId}`
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching standings:', error);
    return [];
  }
}

/**
 * Fetch predictions from API (if available in plan)
 */
export async function getPredictions(matchId: string): Promise<any> {
  try {
    const data = await fetchAPI(
      `action=get_predictions&match_id=${matchId}`
    );
    return data;
  } catch (error) {
    // Predictions endpoint may not be available in free tier
    console.warn('Predictions endpoint not available:', error);
    return null;
  }
}

/**
 * Fetch odds for a specific match
 * Tries multiple endpoints and formats
 */
export async function getMatchOdds(matchId: string): Promise<{ odd_1?: string; odd_x?: string; odd_2?: string } | null> {
  // Try get_odds endpoint first
  try {
    const data = await fetchAPI<any>(
      `action=get_odds&match_id=${matchId}`
    );
    
    // Handle different possible response structures
    if (Array.isArray(data) && data.length > 0) {
      const odds = data[0];
      const result = {
        odd_1: odds.match_odd_1 || odds.odd_1 || odds.odds?.home || odds['1'] || odds.home,
        odd_x: odds.match_odd_x || odds.odd_x || odds.odds?.draw || odds['X'] || odds.draw,
        odd_2: odds.match_odd_2 || odds.odd_2 || odds.odds?.away || odds['2'] || odds.away,
      };
      if (result.odd_1 || result.odd_x || result.odd_2) {
        return result;
      }
    }
    
    // If it's an object directly
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const result = {
        odd_1: data.match_odd_1 || data.odd_1 || data.odds?.home || data['1'] || data.home,
        odd_x: data.match_odd_x || data.odd_x || data.odds?.draw || data['X'] || data.draw,
        odd_2: data.match_odd_2 || data.odd_2 || data.odds?.away || data['2'] || data.away,
      };
      if (result.odd_1 || result.odd_x || result.odd_2) {
        return result;
      }
    }
  } catch (error) {
    // Try alternative endpoint
    console.warn('get_odds endpoint failed, trying alternatives:', error);
  }
  
  // Try get_events with match_id to get odds
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const data = await fetchAPI<any[]>(
      `action=get_events&from=${today}&to=${tomorrow}&match_id=${matchId}`
    );
    
    if (Array.isArray(data) && data.length > 0) {
      const match = data.find(m => m.match_id === matchId) || data[0];
      const result = {
        odd_1: match.match_odd_1 || match.odd_1 || match.odds?.home || match['1'] || match.home,
        odd_x: match.match_odd_x || match.odd_x || match.odds?.draw || match['X'] || match.draw,
        odd_2: match.match_odd_2 || match.odd_2 || match.odds?.away || match['2'] || match.away,
      };
      if (result.odd_1 || result.odd_x || result.odd_2) {
        return result;
      }
    }
  } catch (error) {
    console.warn('Alternative odds fetch failed:', error);
  }
  
  return null;
}

