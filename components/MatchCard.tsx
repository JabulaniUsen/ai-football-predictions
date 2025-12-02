'use client';

import { MatchPrediction } from '@/types';
import { format } from 'date-fns';
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
  const { match, winner, predictedScore, bothTeamsToScore, overUnder, confidence, aiReasoning, h2hSummary, actualScore, resultStatus } = prediction;
  
  const matchDate = new Date(`${match.match_date} ${match.match_time}`);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-emerald-400';
    if (conf >= 60) return 'text-blue-400';
    return 'text-amber-400';
  };

  const getConfidenceBg = (conf: number) => {
    if (conf >= 80) return 'bg-emerald-500/10 border-emerald-500/20 backdrop-blur-sm';
    if (conf >= 60) return 'bg-blue-500/10 border-blue-500/20 backdrop-blur-sm';
    return 'bg-amber-500/10 border-amber-500/20 backdrop-blur-sm';
  };

  const getConfidenceGlow = (conf: number) => {
    if (conf >= 80) return 'shadow-[0_0_20px_rgba(16,185,129,0.15)]';
    if (conf >= 60) return 'shadow-[0_0_20px_rgba(96,165,250,0.15)]';
    return 'shadow-[0_0_20px_rgba(251,191,36,0.15)]';
  };

  const getWinnerColor = (percentage: number) => {
    if (percentage >= 50) return 'text-white font-semibold';
    if (percentage >= 30) return 'text-slate-300';
    return 'text-slate-500';
  };

  const getWinnerBg = (percentage: number) => {
    if (percentage >= 50) return 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 backdrop-blur-sm shadow-lg';
    return 'bg-slate-900/60 border-slate-800/50 backdrop-blur-sm';
  };

  const isListView = viewMode === 'list';

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/50 shadow-2xl backdrop-blur-sm ${
      isListView 
        ? 'rounded-xl p-5' 
        : 'rounded-xl p-5 sm:p-6'
    } hover:border-slate-700/50 transition-all duration-300 relative`}>
      {/* Result Status Badge */}
      {resultStatus && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            resultStatus === 'win' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : resultStatus === 'loss'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {resultStatus === 'win' ? '✓ Win' : resultStatus === 'loss' ? '✗ Loss' : '≈ Draw'}
          </div>
        </div>
      )}
      {isListView ? (
        // List View - Premium Horizontal Layout
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pr-20">
          {/* League & Date */}
          <div className="min-w-0 flex-shrink-0 sm:w-44">
            <div className="text-xs text-slate-400 uppercase mb-1 truncate font-semibold tracking-wider">
            {match.league_name}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {format(matchDate, 'MMM d, h:mm a')}
            </div>
          </div>

          {/* Teams */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {match.team_home_badge && (
                <img src={match.team_home_badge} alt={match.match_hometeam_name} className="w-6 h-6 flex-shrink-0 rounded-sm" />
              )}
              <span className="text-sm font-semibold text-slate-100 truncate">{match.match_hometeam_name}</span>
            </div>
            <span className="text-slate-600 text-sm flex-shrink-0 font-bold">vs</span>
            <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end">
              <span className="text-sm font-semibold text-slate-100 truncate text-right">{match.match_awayteam_name}</span>
              {match.team_away_badge && (
                <img src={match.team_away_badge} alt={match.match_awayteam_name} className="w-6 h-6 flex-shrink-0 rounded-sm" />
              )}
            </div>
          </div>

          {/* Score */}
          <div className="text-center flex-shrink-0 sm:w-24">
            <div className="text-xl font-bold text-white bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg py-2 px-3 border border-blue-500/30">
              {predictedScore.home} - {predictedScore.away}
            </div>
            {actualScore && (
              <div className="text-sm font-semibold text-emerald-400 mt-1">
                Actual: {actualScore.home} - {actualScore.away}
              </div>
            )}
          </div>

          {/* 1X2 */}
          <div className="flex items-center gap-3 flex-shrink-0 sm:w-auto">
            <div className={`text-center min-w-[70px] py-2 px-2.5 rounded-lg border ${getWinnerBg(winner.home)}`}>
              <div className="text-xs text-slate-400 mb-1 font-medium">Home</div>
              <div className={`text-sm font-semibold ${getWinnerColor(winner.home)}`}>
                {winner.home.toFixed(0)}%
              </div>
              {match.match_odd_1 && (
                <div className="mt-1.5 pt-1 border-t border-slate-800/50">
                  <div className="text-[10px] text-slate-500 mb-0.5">Odds</div>
                  <div className="text-xs text-blue-400 font-semibold">
                    {match.match_odd_1}
                  </div>
                </div>
              )}
            </div>
            <div className={`text-center min-w-[70px] py-2 px-2.5 rounded-lg border ${getWinnerBg(winner.draw)}`}>
              <div className="text-xs text-slate-400 mb-1 font-medium">Draw</div>
              <div className={`text-sm font-semibold ${getWinnerColor(winner.draw)}`}>
                {winner.draw.toFixed(0)}%
              </div>
              {match.match_odd_x && (
                <div className="mt-1.5 pt-1 border-t border-slate-800/50">
                  <div className="text-[10px] text-slate-500 mb-0.5">Odds</div>
                  <div className="text-xs text-blue-400 font-semibold">
                    {match.match_odd_x}
                  </div>
                </div>
              )}
            </div>
            <div className={`text-center min-w-[70px] py-2 px-2.5 rounded-lg border ${getWinnerBg(winner.away)}`}>
              <div className="text-xs text-slate-400 mb-1 font-medium">Away</div>
              <div className={`text-sm font-semibold ${getWinnerColor(winner.away)}`}>
                {winner.away.toFixed(0)}%
              </div>
              {match.match_odd_2 && (
                <div className="mt-1.5 pt-1 border-t border-slate-800/50">
                  <div className="text-[10px] text-slate-500 mb-0.5">Odds</div>
                  <div className="text-xs text-blue-400 font-semibold">
                    {match.match_odd_2}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Confidence & Details */}
          <div className="flex items-center gap-3 flex-shrink-0 sm:w-28">
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${getConfidenceBg(confidence)} ${getConfidenceColor(confidence)} ${getConfidenceGlow(confidence)}`}>
              {confidence}%
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-800/50 border border-slate-800/50">
                  <Info className="w-4 h-4 text-slate-400" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Match Details</DialogTitle>
                  <DialogDescription className="text-slate-400">Complete match information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Match Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">League:</span>
                        <span className="font-medium text-slate-200">{match.league_name}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">Date:</span>
                        <span className="font-medium text-slate-200">{format(matchDate, 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Time:</span>
                        <span className="font-medium text-slate-200">{format(matchDate, 'h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Prediction</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">Score:</span>
                        <span className="font-medium text-slate-200">{predictedScore.home} - {predictedScore.away}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">Confidence:</span>
                        <span className={`font-semibold ${getConfidenceColor(confidence)}`}>{confidence}%</span>
                      </div>
                      {aiReasoning && (
                        <div className="pt-2">
                          <div className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">AI Analysis</div>
                          <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                            {aiReasoning}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {(match.match_odd_1 || match.match_odd_x || match.match_odd_2) && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Odds</h3>
                      <div className="space-y-2 text-sm">
                        {match.match_odd_1 && (
                          <div className="flex justify-between py-1.5 border-b border-slate-800">
                            <span className="text-slate-500">Home:</span>
                            <span className="font-semibold text-blue-400">{match.match_odd_1}</span>
                          </div>
                        )}
                        {match.match_odd_x && (
                          <div className="flex justify-between py-1.5 border-b border-slate-800">
                            <span className="text-slate-500">Draw:</span>
                            <span className="font-semibold text-blue-400">{match.match_odd_x}</span>
                          </div>
                        )}
                        {match.match_odd_2 && (
                          <div className="flex justify-between py-1.5">
                            <span className="text-slate-500">Away:</span>
                            <span className="font-semibold text-blue-400">{match.match_odd_2}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        // Grid View - Premium Vertical Layout
        <>
          {/* Header */}
          <div className="mb-5 pb-4 border-b border-slate-800/50 pr-20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                {match.league_name}
              </div>
              <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${getConfidenceBg(confidence)} ${getConfidenceColor(confidence)} ${getConfidenceGlow(confidence)}`}>
                {confidence}%
              </div>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {format(matchDate, 'MMM d, yyyy • h:mm a')}
        </div>
      </div>

      {/* Teams */}
          <div className="mb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
            {match.team_home_badge && (
                  <img src={match.team_home_badge} alt={match.match_hometeam_name} className="w-7 h-7 flex-shrink-0 rounded-sm" />
            )}
                <span className="text-base font-semibold text-slate-100 truncate">{match.match_hometeam_name}</span>
          </div>
              <div className="text-slate-600 text-sm flex-shrink-0 font-bold">vs</div>
              <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                <span className="text-base font-semibold text-slate-100 text-right truncate">{match.match_awayteam_name}</span>
            {match.team_away_badge && (
                  <img src={match.team_away_badge} alt={match.match_awayteam_name} className="w-7 h-7 flex-shrink-0 rounded-sm" />
            )}
          </div>
        </div>
      </div>

      {/* Predicted Score */}
          <div className="mb-5 pb-5 border-b border-slate-800/50">
            <div className="text-center bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-xl py-4 px-5 border border-blue-500/30 backdrop-blur-sm shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <div className="text-xs text-slate-400 mb-2 font-semibold tracking-wide uppercase">Predicted Score</div>
              <div className="text-3xl font-bold text-white tracking-tight">
            {predictedScore.home} - {predictedScore.away}
          </div>
              {actualScore && (
                <div className="mt-3 pt-3 border-t border-blue-500/20">
                  <div className="text-xs text-slate-400 mb-1 font-semibold tracking-wide uppercase">Actual Score</div>
                  <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                    {actualScore.home} - {actualScore.away}
                  </div>
                </div>
              )}
        </div>
      </div>

          {/* 1X2 Predictions */}
          <div className="mb-5">
            <div className="text-xs text-slate-400 mb-3 font-semibold tracking-wide uppercase">Match Result</div>
            <div className="grid grid-cols-3 gap-3">
              <div className={`text-center py-3 rounded-xl border ${getWinnerBg(winner.home)}`}>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">Home</div>
            <div className={`text-lg font-bold ${getWinnerColor(winner.home)}`}>
                  {winner.home.toFixed(0)}%
                </div>
                {match.match_odd_1 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">Odds</div>
                    <div className="text-xs text-blue-400 font-semibold">
                      {match.match_odd_1}
            </div>
          </div>
                )}
              </div>
              <div className={`text-center py-3 rounded-xl border ${getWinnerBg(winner.draw)}`}>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">Draw</div>
            <div className={`text-lg font-bold ${getWinnerColor(winner.draw)}`}>
                  {winner.draw.toFixed(0)}%
                </div>
                {match.match_odd_x && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">Odds</div>
                    <div className="text-xs text-blue-400 font-semibold">
                      {match.match_odd_x}
                    </div>
                  </div>
                )}
              </div>
              <div className={`text-center py-3 rounded-xl border ${getWinnerBg(winner.away)}`}>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">Away</div>
                <div className={`text-lg font-bold ${getWinnerColor(winner.away)}`}>
                  {winner.away.toFixed(0)}%
                </div>
                {match.match_odd_2 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">Odds</div>
                    <div className="text-xs text-blue-400 font-semibold">
                      {match.match_odd_2}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="py-3 border border-slate-800/50 rounded-xl bg-slate-900/60 backdrop-blur-sm text-center">
              <div className="text-xs text-slate-400 mb-1.5 font-semibold tracking-wide uppercase">Both Teams to Score</div>
              <div className="text-base font-bold text-slate-100">
                {bothTeamsToScore.yes.toFixed(0)}%
              </div>
            </div>
            <div className="py-3 border border-slate-800/50 rounded-xl bg-slate-900/60 backdrop-blur-sm text-center">
              <div className="text-xs text-slate-400 mb-1.5 font-semibold tracking-wide uppercase">Over 2.5 Goals</div>
              <div className="text-base font-bold text-slate-100">
                {overUnder.over25.toFixed(0)}%
          </div>
        </div>
      </div>

          {/* H2H Summary */}
          {h2hSummary && (
            <div className="pt-4 border-t border-slate-800/50">
              <div className="text-xs text-slate-400 mb-3 font-semibold tracking-wide uppercase">Head-to-Head</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="py-3 rounded-xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-sm">
                  <div className="text-xs text-slate-500 mb-1 font-medium">Home</div>
                  <div className="text-base font-bold text-slate-100">{h2hSummary.homeWins}</div>
                </div>
                <div className="py-3 rounded-xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-sm">
                  <div className="text-xs text-slate-500 mb-1 font-medium">Draw</div>
                  <div className="text-base font-bold text-slate-100">{h2hSummary.draws}</div>
          </div>
                <div className="py-3 rounded-xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-sm">
                  <div className="text-xs text-slate-500 mb-1 font-medium">Away</div>
                  <div className="text-base font-bold text-slate-100">{h2hSummary.awayWins}</div>
          </div>
        </div>
      </div>
          )}

          {/* Details Button */}
          <div className="mt-6 pt-5 border-t border-slate-800/50">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-sm h-10 border-slate-800/50 bg-slate-900/40 hover:bg-slate-800/60 text-slate-200 hover:text-white backdrop-blur-sm">
                  <Info className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Match Details</DialogTitle>
                  <DialogDescription className="text-slate-400">Complete match information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Match Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">League:</span>
                        <span className="font-medium text-slate-200">{match.league_name}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">Country:</span>
                        <span className="font-medium text-slate-200">{match.country_name}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">Date:</span>
                        <span className="font-medium text-slate-200">{format(matchDate, 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Time:</span>
                        <span className="font-medium text-slate-200">{format(matchDate, 'h:mm a')}</span>
          </div>
          </div>
        </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Prediction</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">Score:</span>
                        <span className="font-medium text-slate-200">{predictedScore.home} - {predictedScore.away}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-500">Confidence:</span>
                        <span className={`font-semibold ${getConfidenceColor(confidence)}`}>{confidence}%</span>
                      </div>
                      {aiReasoning && (
                        <div className="pt-2">
                          <div className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">AI Analysis</div>
                          <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                            {aiReasoning}
                          </div>
                        </div>
                      )}
        </div>
      </div>
                  {(match.match_odd_1 || match.match_odd_x || match.match_odd_2) && (
            <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Odds</h3>
                      <div className="space-y-2 text-sm">
                        {match.match_odd_1 && (
                          <div className="flex justify-between py-1.5 border-b border-slate-800">
                            <span className="text-slate-500">Home:</span>
                            <span className="font-semibold text-blue-400">{match.match_odd_1}</span>
                          </div>
                        )}
                        {match.match_odd_x && (
                          <div className="flex justify-between py-1.5 border-b border-slate-800">
                            <span className="text-slate-500">Draw:</span>
                            <span className="font-semibold text-blue-400">{match.match_odd_x}</span>
            </div>
                        )}
                        {match.match_odd_2 && (
                          <div className="flex justify-between py-1.5">
                            <span className="text-slate-500">Away:</span>
                            <span className="font-semibold text-blue-400">{match.match_odd_2}</span>
            </div>
                        )}
            </div>
          </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </div>
  );
}
