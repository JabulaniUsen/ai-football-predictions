'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { FaFutbol, FaRobot, FaSearch, FaTh, FaList } from 'react-icons/fa';
import { getHistoricalPredictions } from '@/lib/db';
import { MatchPrediction } from '@/types';
import MatchCard from '@/components/MatchCard';
import FilterSelect from '@/components/FilterSelect';
import Navbar from '@/components/Navbar';
import DatePicker from '@/components/DatePicker';

export default function HistoryPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const minHistoricalDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(today);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [historicalPredictions, setHistoricalPredictions] = useState<(MatchPrediction & { predictionId?: string })[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
            <FaRobot className="text-purple-600 dark:text-purple-400" />
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 px-2 flex items-center justify-center gap-2">
            <FaRobot className="text-purple-500 dark:text-purple-400 text-xs" />
            View past predictions and analyze historical performance
            <FaRobot className="text-purple-500 dark:text-purple-400 text-xs" />
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-8 border border-gray-200 dark:border-gray-700">
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

        {/* Results Summary */}
        {historicalPredictions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {historicalPredictions.length} Historical Prediction{historicalPredictions.length !== 1 ? 's' : ''}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From {format(new Date(dateFrom), 'MMM d, yyyy')} to {format(new Date(dateTo), 'MMM d, yyyy')}
                  {selectedCountry && ` • Country: ${countries.find(c => c.id === selectedCountry)?.name || 'All'}`}
                  {selectedLeague && ` • League: ${leagues.find(l => l.id === selectedLeague)?.name || 'All'}`}
                </p>
              </div>
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
        )}

        {/* Results */}
        {loadingHistorical ? (
          <div className="text-center py-12">
            <FaRobot className="text-6xl mb-4 mx-auto text-purple-600 dark:text-purple-400 animate-pulse" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Loading historical predictions...
            </h3>
          </div>
        ) : historicalPredictions.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'
            : 'flex flex-col gap-4 sm:gap-6'
          }>
            {historicalPredictions.map((prediction) => {
              const predictionWithId = prediction as MatchPrediction & { predictionId?: string };
              return (
                <MatchCard
                  key={predictionWithId.predictionId || `${prediction.match.match_id}-${prediction.match.match_date}`}
                  prediction={prediction}
                  viewMode={viewMode}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaSearch className="text-6xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No historical predictions found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No predictions found for the selected date range and filters. Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

