'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { FaFutbol, FaSearch, FaTh, FaList, FaTrash, FaCheckSquare, FaSquare, FaSync } from 'react-icons/fa';
import { getHistoricalPredictions, deletePrediction, deletePredictions, deleteAllPredictions, updatePredictionWithResult } from '@/lib/db';
import { getMatchResult } from '@/lib/api';
import { MatchPrediction } from '@/types';
import MatchCard from '@/components/MatchCard';
import FilterSelect from '@/components/FilterSelect';
import Navbar from '@/components/Navbar';
import DatePicker from '@/components/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HistoryPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const minHistoricalDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(today);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [historicalPredictions, setHistoricalPredictions] = useState<(MatchPrediction & { predictionId?: string })[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedPredictions, setSelectedPredictions] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  // Get unique leagues and countries from historical predictions
  const leagues = useMemo(() => {
    const leagueMap = new Map<string, { id: string; name: string }>();
    historicalPredictions.forEach((pred) => {
      if (!leagueMap.has(pred.match.league_id)) {
        leagueMap.set(pred.match.league_id, {
          id: pred.match.league_id,
          name: pred.match.league_name,
        });
      }
    });
    return Array.from(leagueMap.values());
  }, [historicalPredictions]);

  const countries = useMemo(() => {
    const countryMap = new Map<string, { id: string; name: string }>();
    historicalPredictions.forEach((pred) => {
      if (!countryMap.has(pred.match.country_id)) {
        countryMap.set(pred.match.country_id, {
          id: pred.match.country_id,
          name: pred.match.country_name,
        });
      }
    });
    return Array.from(countryMap.values());
  }, [historicalPredictions]);

  // Load historical predictions
  const loadHistoricalPredictions = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    setLoadingHistorical(true);
    setError(null);

    try {
      const historical = await getHistoricalPredictions(
        dateFrom,
        dateTo,
        selectedLeague || undefined,
        selectedCountry || undefined
      );
      setHistoricalPredictions(historical);
    } catch (err) {
      console.error('Error loading historical predictions:', err);
      setError('Failed to load historical predictions');
    } finally {
      setLoadingHistorical(false);
    }
  }, [dateFrom, dateTo, selectedLeague, selectedCountry]);

  // Load historical predictions when filters change
  useEffect(() => {
    loadHistoricalPredictions();
  }, [loadHistoricalPredictions]);

  // Filter predictions based on search query
  const filteredPredictions = useMemo(() => {
    if (!searchQuery.trim()) {
      return historicalPredictions;
    }

    const query = searchQuery.toLowerCase().trim();
    return historicalPredictions.filter((prediction) => {
      const homeTeam = prediction.match.match_hometeam_name?.toLowerCase() || '';
      const awayTeam = prediction.match.match_awayteam_name?.toLowerCase() || '';
      const league = prediction.match.league_name?.toLowerCase() || '';
      const country = prediction.match.country_name?.toLowerCase() || '';
      
      return (
        homeTeam.includes(query) ||
        awayTeam.includes(query) ||
        league.includes(query) ||
        country.includes(query)
      );
    });
  }, [historicalPredictions, searchQuery]);

  // Clear selection when predictions change
  useEffect(() => {
    setSelectedPredictions(new Set());
  }, [filteredPredictions.length]);

  // Toggle selection for a prediction
  const toggleSelection = useCallback((predictionId: string) => {
    setSelectedPredictions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(predictionId)) {
        newSet.delete(predictionId);
      } else {
        newSet.add(predictionId);
      }
      return newSet;
    });
  }, []);

  // Select all predictions
  const selectAll = useCallback(() => {
    const allIds = filteredPredictions
      .map((p) => p.predictionId)
      .filter((id): id is string => !!id);
    setSelectedPredictions(new Set(allIds));
  }, [filteredPredictions]);

  // Deselect all predictions
  const deselectAll = useCallback(() => {
    setSelectedPredictions(new Set());
  }, []);

  // Delete selected predictions
  const handleDeleteSelected = useCallback(async () => {
    if (selectedPredictions.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedPredictions.size} prediction(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedPredictions);
      const success = await deletePredictions(ids);
      
      if (success) {
        setSelectedPredictions(new Set());
        await loadHistoricalPredictions();
      } else {
        setError('Failed to delete some predictions');
      }
    } catch (err) {
      console.error('Error deleting predictions:', err);
      setError('Failed to delete predictions');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedPredictions, loadHistoricalPredictions]);

  // Update all predictions with actual scores
  const handleUpdateAll = useCallback(async () => {
    if (historicalPredictions.length === 0) return;

    setIsUpdatingAll(true);
    setError(null);

    try {
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const total = historicalPredictions.length;

      // Update each prediction - use historicalPredictions to update ALL, not just filtered
      for (let i = 0; i < historicalPredictions.length; i++) {
        const prediction = historicalPredictions[i];
        
        if (!prediction.predictionId) {
          errorCount++;
          continue;
        }

        // Skip if already has actual score
        if (prediction.actualScore) {
          skippedCount++;
          continue;
        }

        try {
          // Add small delay to avoid API rate limiting (100ms between requests)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Fetch actual match result from API
          const matchResult = await getMatchResult(prediction.match.match_id);
          
          if (!matchResult) {
            console.log(`No match result for ${prediction.match.match_id}`);
            errorCount++;
            continue;
          }

          // Check if match has actual scores
          const homeScore = matchResult.match_hometeam_score;
          const awayScore = matchResult.match_awayteam_score;

          if (homeScore === undefined || awayScore === undefined || homeScore === null || awayScore === null) {
            console.log(`No scores for match ${prediction.match.match_id}: home=${homeScore}, away=${awayScore}`);
            errorCount++;
            continue;
          }

          const actualScore = {
            home: parseInt(String(homeScore), 10),
            away: parseInt(String(awayScore), 10),
          };

          // Update prediction with actual score
          const success = await updatePredictionWithResult(
            prediction.predictionId,
            actualScore,
            prediction.winner,
            prediction.predictedScore
          );

          if (success) {
            successCount++;
            console.log(`✅ Updated ${prediction.match.match_hometeam_name} vs ${prediction.match.match_awayteam_name}: ${actualScore.home}-${actualScore.away}`);
          } else {
            console.log(`❌ Failed to update prediction ${prediction.predictionId}`);
            errorCount++;
          }
        } catch (err) {
          console.error(`Error updating prediction ${prediction.predictionId}:`, err);
          errorCount++;
        }

        // Update progress message every 10 predictions
        if ((i + 1) % 10 === 0 || i === historicalPredictions.length - 1) {
          setError(`Processing... ${i + 1}/${total} (${successCount} updated, ${skippedCount} skipped, ${errorCount} errors)`);
        }
      }

      // Reload predictions to show updated data
      await loadHistoricalPredictions();

      // Show final summary message
      let message = `Update complete: ${successCount} updated`;
      if (skippedCount > 0) {
        message += `, ${skippedCount} already had scores`;
      }
      if (errorCount > 0) {
        message += `, ${errorCount} failed (matches may not have results yet or API errors)`;
      }
      setError(message);
      // Clear error after 8 seconds
      setTimeout(() => setError(null), 8000);
    } catch (err) {
      console.error('Error updating predictions:', err);
      setError('Failed to update predictions. Please try again.');
    } finally {
      setIsUpdatingAll(false);
    }
  }, [historicalPredictions, loadHistoricalPredictions]);

  // Delete all predictions
  const handleDeleteAll = useCallback(async () => {
    const count = filteredPredictions.length;
    if (count === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ALL ${count} prediction(s) in the current view? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const success = await deleteAllPredictions(
        dateFrom,
        dateTo,
        selectedLeague || undefined,
        selectedCountry || undefined
      );
      
      if (success) {
        setSelectedPredictions(new Set());
        await loadHistoricalPredictions();
      } else {
        setError('Failed to delete predictions');
      }
    } catch (err) {
      console.error('Error deleting all predictions:', err);
      setError('Failed to delete predictions');
    } finally {
      setIsDeleting(false);
    }
  }, [filteredPredictions.length, dateFrom, dateTo, selectedLeague, selectedCountry, loadHistoricalPredictions]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Navbar */}
      <Navbar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        viewMode="historical"
        onViewModeChange={(mode) => {
          if (mode === 'live') {
            window.location.href = '/';
          }
        }}
        today={today}
        maxDate={maxDate}
      />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 flex items-center justify-center gap-3">
            <FaFutbol className="text-blue-600 dark:text-blue-400" />
            Historical Predictions
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 px-2 flex items-center justify-center gap-2">
            View past predictions and analyze historical performance
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-8 border border-gray-200 dark:border-gray-700">
          {/* Search Field */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Search
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="Search by team name, league, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* Date Range Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <DatePicker
              label="From Date"
              value={dateFrom}
              onChange={setDateFrom}
              min={minHistoricalDate}
              max={maxDate}
            />
            <DatePicker
              label="To Date"
              value={dateTo}
              onChange={setDateTo}
              min={dateFrom}
              max={maxDate}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
            {countries.length > 0 && (
              <FilterSelect
                label="Country"
                value={selectedCountry}
                onChange={setSelectedCountry}
                options={countries}
                placeholder="All Countries"
              />
            )}
            {leagues.length > 0 && (
              <FilterSelect
                label="League"
                value={selectedLeague}
                onChange={setSelectedLeague}
                options={leagues}
                placeholder="All Leagues"
              />
            )}
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

        {/* Update All Button */}
        {filteredPredictions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {filteredPredictions.length} Historical Prediction{filteredPredictions.length !== 1 ? 's' : ''}
                  {searchQuery.trim() && filteredPredictions.length !== historicalPredictions.length && (
                    <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                      {' '}(of {historicalPredictions.length} total)
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From {format(new Date(dateFrom), 'MMM d, yyyy')} to {format(new Date(dateTo), 'MMM d, yyyy')}
                  {selectedCountry && ` • Country: ${countries.find(c => c.id === selectedCountry)?.name || 'All'}`}
                  {selectedLeague && ` • League: ${leagues.find(l => l.id === selectedLeague)?.name || 'All'}`}
                  {searchQuery.trim() && ` • Search: "${searchQuery}"`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Update All Button */}
                <Button
                  onClick={handleUpdateAll}
                  disabled={isUpdatingAll || isDeleting}
                  variant="outline"
                  className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/50 text-blue-400 hover:text-blue-300"
                >
                  <FaSync className={isUpdatingAll ? 'animate-spin' : ''} />
                  {isUpdatingAll ? 'Updating...' : 'Update All'}
                </Button>
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="Grid view"
                  >
                    <FaTh className="text-sm" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="List view"
                  >
                    <FaList className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection and Delete Controls */}
        {filteredPredictions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectedPredictions.size === filteredPredictions.length ? deselectAll : selectAll}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {selectedPredictions.size === filteredPredictions.length && filteredPredictions.length > 0 ? (
                    <FaCheckSquare className="text-blue-600 dark:text-blue-400" />
                  ) : (
                    <FaSquare className="text-gray-400" />
                  )}
                  <span>
                    {selectedPredictions.size === filteredPredictions.length && filteredPredictions.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </button>
                {selectedPredictions.size > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedPredictions.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedPredictions.size > 0 && (
                  <Button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting || isUpdatingAll}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <FaTrash />
                    Delete Selected ({selectedPredictions.size})
                  </Button>
                )}
                <Button
                  onClick={handleDeleteAll}
                  disabled={isDeleting || isUpdatingAll}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <FaTrash />
                  Delete All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loadingHistorical ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Loading historical predictions...
            </h3>
          </div>
        ) : filteredPredictions.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'
            : 'flex flex-col gap-4 sm:gap-6'
          }>
            {filteredPredictions.map((prediction) => {
              const predictionWithId = prediction as MatchPrediction & { predictionId?: string };
              const isSelected = predictionWithId.predictionId 
                ? selectedPredictions.has(predictionWithId.predictionId)
                : false;
              return (
                <div key={predictionWithId.predictionId || `${prediction.match.match_id}-${prediction.match.match_date}`} className="relative">
                  {predictionWithId.predictionId && (
                    <div className="absolute top-2 left-2 z-30">
                      <button
                        onClick={() => toggleSelection(predictionWithId.predictionId!)}
                        className={`p-1.5 rounded transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border border-blue-500'
                            : 'bg-slate-900/90 backdrop-blur-sm text-slate-400 hover:text-slate-300 border border-slate-700/50'
                        } shadow-lg hover:scale-105`}
                        title={isSelected ? 'Deselect' : 'Select'}
                      >
                        {isSelected ? (
                          <FaCheckSquare className="w-3.5 h-3.5" />
                        ) : (
                          <FaSquare className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  <MatchCard
                    prediction={prediction}
                    viewMode={viewMode}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaSearch className="text-6xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchQuery.trim() ? 'No matching predictions found' : 'No historical predictions found'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery.trim() 
                ? `No predictions match "${searchQuery}". Try adjusting your search query.`
                : 'No predictions found for the selected date range and filters. Try adjusting your search criteria.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

