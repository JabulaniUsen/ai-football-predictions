'use client';

import { useState, useEffect, useMemo } from 'react';
import { FaFutbol, FaSearch, FaSpinner } from 'react-icons/fa';
import { getLeagues, getTeamsFromLeague, getTeamsFromFixtures } from '@/lib/api';
import { MatchPrediction, Match } from '@/types';
import Navbar from '@/components/Navbar';
import SearchableSelect from '@/components/SearchableSelect';
import MatchCard from '@/components/MatchCard';
import { format, addDays } from 'date-fns';

export default function SearchPage() {
  const [selectedLeague, setSelectedLeague] = useState('');
  const [leagues, setLeagues] = useState<Array<{ league_id: string; league_name: string; country_id: string; country_name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ team_id: string; team_name: string; team_badge?: string }>>([]);
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [prediction, setPrediction] = useState<MatchPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishedMatch, setFinishedMatch] = useState<{
    match: Match;
    actualScore: { home: number; away: number };
  } | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  // Fetch leagues on mount
  useEffect(() => {
    const fetchLeagues = async () => {
      setLoadingLeagues(true);
      try {
        const fetchedLeagues = await getLeagues();
        setLeagues(fetchedLeagues);
      } catch (err) {
        console.error('Error fetching leagues:', err);
        setError('Failed to load leagues. Please try again.');
      } finally {
        setLoadingLeagues(false);
      }
    };

    fetchLeagues();
  }, []);

  // Fetch teams when league changes
  useEffect(() => {
    const fetchTeams = async () => {
      if (!selectedLeague) {
        // If no league selected, fetch teams from recent fixtures
        setLoadingTeams(true);
        try {
          const fetchedTeams = await getTeamsFromFixtures(today, maxDate);
          setTeams(fetchedTeams);
        } catch (err) {
          console.error('Error fetching teams:', err);
          setError('Failed to load teams. Please try again.');
        } finally {
          setLoadingTeams(false);
        }
      } else {
        // Fetch teams from selected league
        setLoadingTeams(true);
        try {
          const fetchedTeams = await getTeamsFromLeague(selectedLeague);
          setTeams(fetchedTeams);
        } catch (err) {
          console.error('Error fetching teams:', err);
          setError('Failed to load teams for selected league. Please try again.');
        } finally {
          setLoadingTeams(false);
        }
      }
      // Reset team selections when teams change
      setHomeTeamId('');
      setAwayTeamId('');
      setPrediction(null);
    };

    fetchTeams();
  }, [selectedLeague, today, maxDate]);

  // Get selected team names
  const homeTeam = teams.find(t => t.team_id === homeTeamId);
  const awayTeam = teams.find(t => t.team_id === awayTeamId);

  // Get selected league info
  const selectedLeagueInfo = leagues.find(l => l.league_id === selectedLeague);

  // Generate prediction
  const handleGeneratePrediction = async () => {
    if (!homeTeamId || !awayTeamId) {
      setError('Please select both teams');
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError('Please select two different teams');
      return;
    }

    setLoadingPrediction(true);
    setError(null);
    setPrediction(null);
    setFinishedMatch(null);

    try {
      const response = await fetch('/api/search-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homeTeamId,
          homeTeamName: homeTeam?.team_name || '',
          homeTeamBadge: homeTeam?.team_badge,
          awayTeamId,
          awayTeamName: awayTeam?.team_name || '',
          awayTeamBadge: awayTeam?.team_badge,
          leagueId: selectedLeagueInfo?.league_id || '',
          leagueName: selectedLeagueInfo?.league_name || 'Custom Match',
          countryId: selectedLeagueInfo?.country_id || '',
          countryName: selectedLeagueInfo?.country_name || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prediction');
      }

      const data = await response.json();
      
      // Check if match is finished
      if (data.finished && data.match && data.actualScore) {
        setFinishedMatch({
          match: data.match,
          actualScore: data.actualScore,
        });
        setPrediction(null);
      } else {
        setPrediction(data.prediction);
        setFinishedMatch(null);
      }
    } catch (err) {
      console.error('Error generating prediction:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prediction. Please try again.');
    } finally {
      setLoadingPrediction(false);
    }
  };

  // Prepare league options for dropdown
  const leagueOptions = useMemo(() => {
    return leagues.map(league => ({
      id: league.league_id,
      name: league.league_name,
      country: league.country_name,
    }));
  }, [leagues]);

  // Prepare team options for dropdowns
  const teamOptions = useMemo(() => {
    return teams.map(team => ({
      id: team.team_id,
      name: team.team_name,
    }));
  }, [teams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Navbar */}
      <Navbar
        dateFrom={today}
        dateTo={maxDate}
        onDateFromChange={() => {}}
        onDateToChange={() => {}}
        viewMode="live"
        onViewModeChange={() => {}}
        today={today}
        maxDate={maxDate}
        showDatePicker={false}
      />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2 flex items-center justify-center gap-3">
            <FaSearch className="text-blue-400" />
            Search Game Predictions
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 px-2">
            Select two teams to generate an AI-powered prediction
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-xl shadow-2xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-8 border border-slate-800/50 backdrop-blur-sm">
          {/* League Filter (Optional) */}
          <div className="mb-4">
            <SearchableSelect
              label="Filter by League (Optional)"
              value={selectedLeague}
              onChange={(value) => {
                setSelectedLeague(value);
                setPrediction(null);
                setFinishedMatch(null);
              }}
              options={leagueOptions}
              placeholder="All Leagues (Recent Teams)"
              showAll={true}
              disabled={loadingLeagues}
            />
            {loadingLeagues && (
              <p className="text-xs text-slate-400 mt-1">Loading leagues...</p>
            )}
          </div>

          {/* Team Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <SearchableSelect
                label="Home Team"
                value={homeTeamId}
                onChange={(value) => {
                  setHomeTeamId(value);
                  setPrediction(null);
                  setFinishedMatch(null);
                }}
                options={teamOptions}
                placeholder="Select home team"
                showAll={false}
                disabled={loadingTeams}
              />
              {loadingTeams && (
                <p className="text-xs text-slate-400 mt-1">Loading teams...</p>
              )}
            </div>
            <div>
              <SearchableSelect
                label="Away Team"
                value={awayTeamId}
                onChange={(value) => {
                  setAwayTeamId(value);
                  setPrediction(null);
                  setFinishedMatch(null);
                }}
                options={teamOptions}
                placeholder="Select away team"
                showAll={false}
                disabled={loadingTeams}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGeneratePrediction}
              disabled={!homeTeamId || !awayTeamId || loadingPrediction || homeTeamId === awayTeamId}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              {loadingPrediction ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Generating Prediction...
                </>
              ) : (
                <>
                  <FaFutbol />
                  Generate Prediction
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400">⚠️</span>
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Finished Match Result */}
        {finishedMatch && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-800/50 backdrop-blur-sm">
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                  <FaFutbol className="text-blue-400" />
                  Match Already Finished
                </h2>
                <p className="text-slate-400 text-sm sm:text-base">
                  {finishedMatch.match.league_name && `${finishedMatch.match.league_name} • `}
                  {finishedMatch.match.match_date && new Date(finishedMatch.match.match_date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              {/* Teams and Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {finishedMatch.match.team_home_badge && (
                      <img 
                        src={finishedMatch.match.team_home_badge} 
                        alt={finishedMatch.match.match_hometeam_name} 
                        className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-sm" 
                      />
                    )}
                    <span className="text-base sm:text-lg font-semibold text-slate-100 truncate">
                      {finishedMatch.match.match_hometeam_name}
                    </span>
                  </div>
                  <div className="text-slate-600 text-sm flex-shrink-0 font-bold">vs</div>
                  <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                    <span className="text-base sm:text-lg font-semibold text-slate-100 text-right truncate">
                      {finishedMatch.match.match_awayteam_name}
                    </span>
                    {finishedMatch.match.team_away_badge && (
                      <img 
                        src={finishedMatch.match.team_away_badge} 
                        alt={finishedMatch.match.match_awayteam_name} 
                        className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-sm" 
                      />
                    )}
                  </div>
                </div>

                {/* Actual Score */}
                <div className="text-center bg-gradient-to-br from-emerald-500/20 via-green-500/20 to-teal-500/20 rounded-xl py-6 px-5 border border-emerald-500/30 backdrop-blur-sm shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <div className="text-xs text-slate-400 mb-2 font-semibold tracking-wide uppercase">Final Score</div>
                  <div className="text-4xl sm:text-5xl font-bold text-emerald-400 tracking-tight">
                    {finishedMatch.actualScore.home} - {finishedMatch.actualScore.away}
                  </div>
                </div>
              </div>

              {/* Match Details */}
              {finishedMatch.match.match_stadium && (
                <div className="text-center text-sm text-slate-400">
                  <span>📍 {finishedMatch.match.match_stadium}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prediction Result */}
        {prediction && (
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <FaFutbol className="text-blue-400" />
              Prediction Result
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <MatchCard prediction={prediction} viewMode="grid" />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!prediction && !finishedMatch && !loadingPrediction && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FaSearch className="text-5xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No prediction yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Select two teams and click "Generate Prediction" to see AI-powered predictions
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Built by{' '}
            <a
              href="https://jabulaniusen.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Jabulani Usen
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

