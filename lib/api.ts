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
    const data = await fetchAPI<Match[]>(endpoint);
    return Array.isArray(data) ? data : [];
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

