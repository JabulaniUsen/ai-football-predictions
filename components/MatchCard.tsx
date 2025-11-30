'use client';

import { useState } from 'react';
import { MatchPrediction } from '@/types';
import { format } from 'date-fns';
import { FaRobot } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface MatchCardProps {
  prediction: MatchPrediction;
  viewMode?: 'grid' | 'list';
}

export default function MatchCard({ prediction, viewMode = 'grid' }: MatchCardProps) {
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

  const isListView = viewMode === 'list';

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all ${
      isListView 
        ? 'rounded-lg p-3 sm:p-4' 
        : 'rounded-xl shadow-lg p-3 sm:p-4 md:p-6 hover:shadow-xl'
    }`}>
      {isListView ? (
        // List View Layout - Horizontal Table-like Row
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4">
          {/* League & Date */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0 lg:w-48">
            <FaRobot className="text-purple-600 dark:text-purple-400 text-xs flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase truncate">
                {match.league_name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {format(matchDate, 'MMM d')} {format(matchDate, 'h:mm a')}
                {isToday && <span className="ml-1 text-green-600 dark:text-green-400">•</span>}
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              {match.team_home_badge && (
                <img src={match.team_home_badge} alt={match.match_hometeam_name} className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0" />
              )}
              <span className="font-semibold text-sm sm:text-base dark:text-white truncate">{match.match_hometeam_name}</span>
            </div>
            <span className="text-gray-400 dark:text-gray-500 font-bold text-sm sm:text-base flex-shrink-0">vs</span>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-end">
              <span className="font-semibold text-sm sm:text-base dark:text-white truncate text-right">{match.match_awayteam_name}</span>
              {match.team_away_badge && (
                <img src={match.team_away_badge} alt={match.match_awayteam_name} className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Predicted Score */}
          <div className="flex items-center gap-2 flex-shrink-0 lg:w-24">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block mb-0.5">Score</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {predictedScore.home} - {predictedScore.away}
              </div>
            </div>
          </div>

          {/* 1X2 Predictions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 lg:w-40">
            <div className="text-center min-w-[50px]">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">1</div>
              <div className={`text-sm sm:text-base font-bold ${getWinnerColor(winner.home)}`}>
                {winner.home.toFixed(0)}%
              </div>
            </div>
            <div className="text-center min-w-[50px]">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">X</div>
              <div className={`text-sm sm:text-base font-bold ${getWinnerColor(winner.draw)}`}>
                {winner.draw.toFixed(0)}%
              </div>
            </div>
            <div className="text-center min-w-[50px]">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">2</div>
              <div className={`text-sm sm:text-base font-bold ${getWinnerColor(winner.away)}`}>
                {winner.away.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* BTTS & O/U */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 lg:w-32">
            <div className="text-center min-w-[50px]">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">BTTS</div>
              <div className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
                {bothTeamsToScore.yes.toFixed(0)}%
              </div>
            </div>
            <div className="text-center min-w-[50px]">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">O/U</div>
              <div className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">
                {overUnder.over25.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Confidence & Details */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 lg:w-32">
            <div className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${getConfidenceBg(confidence)} ${getConfidenceColor(confidence)}`}>
              <FaRobot className="text-xs" />
              {confidence}%
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-8 px-2 sm:px-3">
                  <Info className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">Details</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Match Details</DialogTitle>
                  <DialogDescription>
                    Complete information about this match
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* Match Info */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Match Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">League:</span>
                        <span className="font-medium dark:text-white">{match.league_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Country:</span>
                        <span className="font-medium dark:text-white">{match.country_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Date:</span>
                        <span className="font-medium dark:text-white">{format(matchDate, 'EEEE, MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Time:</span>
                        <span className="font-medium dark:text-white">{format(matchDate, 'h:mm a')}</span>
                      </div>
                      {match.match_round && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Round:</span>
                          <span className="font-medium dark:text-white">{match.match_round}</span>
                        </div>
                      )}
                      {match.match_stadium && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Stadium:</span>
                          <span className="font-medium dark:text-white">{match.match_stadium}</span>
                        </div>
                      )}
                      {match.match_referee && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Referee:</span>
                          <span className="font-medium dark:text-white">{match.match_referee}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className="font-medium dark:text-white">{match.match_status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Teams */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Teams</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {match.team_home_badge && (
                          <img src={match.team_home_badge} alt={match.match_hometeam_name} className="w-6 h-6" />
                        )}
                        <span className="font-medium dark:text-white">{match.match_hometeam_name}</span>
                        <span className="ml-auto text-gray-600 dark:text-gray-400">(Home)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {match.team_away_badge && (
                          <img src={match.team_away_badge} alt={match.match_awayteam_name} className="w-6 h-6" />
                        )}
                        <span className="font-medium dark:text-white">{match.match_awayteam_name}</span>
                        <span className="ml-auto text-gray-600 dark:text-gray-400">(Away)</span>
                      </div>
                    </div>
                  </div>

                  {/* Prediction Summary */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Prediction Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                        <span className={`font-medium ${getConfidenceColor(confidence)}`}>{confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Predicted Score:</span>
                        <span className="font-medium dark:text-white">{predictedScore.home} - {predictedScore.away}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        // Grid View Layout (Original)
        <>
          {/* Header */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-1.5">
                <FaRobot className="text-purple-600 dark:text-purple-400 text-xs" />
                <span className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase truncate">
                {match.league_name}
              </span>
              </div>
              <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${getConfidenceBg(confidence)} ${getConfidenceColor(confidence)}`}>
                <FaRobot className="text-xs" />
                {confidence}%
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <div className="sm:inline">{format(matchDate, 'EEEE, MMM d, yyyy')}</div>
              <span className="hidden sm:inline"> at </span>
              <div className="sm:inline">{format(matchDate, 'h:mm a')}</div>
              {isToday && <span className="ml-1 sm:ml-2 text-green-600 dark:text-green-400 font-semibold">• Today</span>}
            </div>
          </div>

          {/* Teams */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {match.team_home_badge && (
                  <img src={match.team_home_badge} alt={match.match_hometeam_name} className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                )}
                <span className="font-semibold text-sm sm:text-base md:text-lg dark:text-white truncate">{match.match_hometeam_name}</span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-400 dark:text-gray-500 flex-shrink-0 px-1">vs</div>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end min-w-0">
                <span className="font-semibold text-sm sm:text-base md:text-lg dark:text-white text-right truncate">{match.match_awayteam_name}</span>
                {match.team_away_badge && (
                  <img src={match.team_away_badge} alt={match.match_awayteam_name} className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Predicted Score */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">
                <FaRobot className="text-purple-600 dark:text-purple-400 text-xs" />
                AI Predicted Score
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {predictedScore.home} - {predictedScore.away}
              </div>
            </div>
          </div>

      {/* Match Winner Probabilities */}
      <div className="mb-3 sm:mb-4">
        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Match Winner (1X2)</div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Home</div>
            <div className={`text-sm sm:text-base md:text-lg font-bold ${getWinnerColor(winner.home)}`}>
              {winner.home.toFixed(1)}%
            </div>
            {winner.home >= 30 && (
              <div className={`mt-1 px-1.5 py-0.5 rounded-full text-xs font-semibold inline-block ${getConfidenceBg(winner.home)} ${getConfidenceColor(winner.home)}`}>
                {winner.home.toFixed(0)}%
              </div>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Draw</div>
            <div className={`text-sm sm:text-base md:text-lg font-bold ${getWinnerColor(winner.draw)}`}>
              {winner.draw.toFixed(1)}%
            </div>
            <div className={`mt-1 px-1.5 py-0.5 rounded-full text-xs font-semibold inline-block ${getConfidenceBg(winner.draw)} ${getConfidenceColor(winner.draw)}`}>
              {winner.draw.toFixed(0)}% confidence
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Away</div>
            <div className={`text-sm sm:text-base md:text-lg font-bold ${getWinnerColor(winner.away)}`}>
              {winner.away.toFixed(1)}%
            </div>
            {winner.away >= 30 && (
              <div className={`mt-1 px-1.5 py-0.5 rounded-full text-xs font-semibold inline-block ${getConfidenceBg(winner.away)} ${getConfidenceColor(winner.away)}`}>
                {winner.away.toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Predictions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Both Teams to Score</div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Yes</span>
            <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
              {bothTeamsToScore.yes.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">No</span>
            <span className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">
              {bothTeamsToScore.no.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 sm:p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Over/Under 2.5</div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Over</span>
            <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
              {overUnder.over25.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Under</span>
            <span className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">
              {overUnder.under25.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* H2H Summary */}
      {h2hSummary && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 mt-3 sm:mt-4">
          <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Head-to-Head</div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Home Wins</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-green-600 dark:text-green-400">{h2hSummary.homeWins}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Draws</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-gray-600 dark:text-gray-400">{h2hSummary.draws}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Away Wins</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-red-600 dark:text-red-400">{h2hSummary.awayWins}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Avg: {h2hSummary.avgHomeGoals.toFixed(1)} - {h2hSummary.avgAwayGoals.toFixed(1)} goals
          </div>
        </div>
      )}

      {/* View Details Button */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full text-sm">
              <Info className="w-4 h-4 mr-2" />
              View Game Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Match Details</DialogTitle>
              <DialogDescription>
                Complete information about this match
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Match Info */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Match Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">League:</span>
                    <span className="font-medium dark:text-white">{match.league_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Country:</span>
                    <span className="font-medium dark:text-white">{match.country_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium dark:text-white">{format(matchDate, 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Time:</span>
                    <span className="font-medium dark:text-white">{format(matchDate, 'h:mm a')}</span>
                  </div>
                  {match.match_round && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Round:</span>
                      <span className="font-medium dark:text-white">{match.match_round}</span>
                    </div>
                  )}
                  {match.match_stadium && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Stadium:</span>
                      <span className="font-medium dark:text-white">{match.match_stadium}</span>
                    </div>
                  )}
                  {match.match_referee && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Referee:</span>
                      <span className="font-medium dark:text-white">{match.match_referee}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="font-medium dark:text-white">{match.match_status}</span>
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Teams</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {match.team_home_badge && (
                      <img src={match.team_home_badge} alt={match.match_hometeam_name} className="w-6 h-6" />
                    )}
                    <span className="font-medium dark:text-white">{match.match_hometeam_name}</span>
                    <span className="ml-auto text-gray-600 dark:text-gray-400">(Home)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.team_away_badge && (
                      <img src={match.team_away_badge} alt={match.match_awayteam_name} className="w-6 h-6" />
                    )}
                    <span className="font-medium dark:text-white">{match.match_awayteam_name}</span>
                    <span className="ml-auto text-gray-600 dark:text-gray-400">(Away)</span>
                  </div>
                </div>
              </div>

              {/* Prediction Summary */}
              <div>
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Prediction Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                    <span className={`font-medium ${getConfidenceColor(confidence)}`}>{confidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Predicted Score:</span>
                    <span className="font-medium dark:text-white">{predictedScore.home} - {predictedScore.away}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
        </>
      )}
    </div>
  );
}

