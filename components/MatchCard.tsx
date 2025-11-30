'use client';

import { MatchPrediction } from '@/types';
import { format } from 'date-fns';

interface MatchCardProps {
  prediction: MatchPrediction;
}

export default function MatchCard({ prediction }: MatchCardProps) {
  const { match, winner, predictedScore, bothTeamsToScore, overUnder, confidence, h2hSummary } = prediction;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-green-600 dark:text-green-400';
    if (conf >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getConfidenceBg = (conf: number) => {
    if (conf >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (conf >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-orange-100 dark:bg-orange-900/30';
  };

  const getWinnerColor = (percentage: number) => {
    if (percentage >= 50) return 'text-green-600 dark:text-green-400 font-bold';
    if (percentage >= 30) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const matchDate = new Date(`${match.match_date} ${match.match_time}`);
  const isToday = format(matchDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
            {match.league_name}
          </span>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceBg(confidence)} ${getConfidenceColor(confidence)}`}>
            {confidence}% Confidence
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {format(matchDate, 'EEEE, MMM d, yyyy')} at {format(matchDate, 'h:mm a')}
          {isToday && <span className="ml-2 text-green-600 dark:text-green-400 font-semibold">• Today</span>}
        </div>
      </div>

      {/* Teams */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {match.team_home_badge && (
              <img src={match.team_home_badge} alt={match.match_hometeam_name} className="w-10 h-10" />
            )}
            <span className="font-semibold text-lg dark:text-white">{match.match_hometeam_name}</span>
          </div>
          <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">vs</div>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <span className="font-semibold text-lg dark:text-white text-right">{match.match_awayteam_name}</span>
            {match.team_away_badge && (
              <img src={match.team_away_badge} alt={match.match_awayteam_name} className="w-10 h-10" />
            )}
          </div>
        </div>
      </div>

      {/* Predicted Score */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Predicted Score</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {predictedScore.home} - {predictedScore.away}
          </div>
        </div>
      </div>

      {/* Match Winner Probabilities */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Match Winner (1X2)</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Home</div>
            <div className={`text-lg font-bold ${getWinnerColor(winner.home)}`}>
              {winner.home.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Draw</div>
            <div className={`text-lg font-bold ${getWinnerColor(winner.draw)}`}>
              {winner.draw.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Away</div>
            <div className={`text-lg font-bold ${getWinnerColor(winner.away)}`}>
              {winner.away.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Additional Predictions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Both Teams to Score</div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yes</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {bothTeamsToScore.yes.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">No</span>
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
              {bothTeamsToScore.no.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Over/Under 2.5</div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Over</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {overUnder.over25.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Under</span>
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
              {overUnder.under25.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* H2H Summary */}
      {h2hSummary && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Head-to-Head</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Home Wins</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{h2hSummary.homeWins}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Draws</div>
              <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{h2hSummary.draws}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Away Wins</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">{h2hSummary.awayWins}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Avg: {h2hSummary.avgHomeGoals.toFixed(1)} - {h2hSummary.avgAwayGoals.toFixed(1)} goals
          </div>
        </div>
      )}
    </div>
  );
}

