'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { FaFutbol, FaSearch, FaCheckCircle, FaRobot } from 'react-icons/fa';
import { getFixtures, getUniqueLeagues, getUniqueCountries } from '@/lib/api';
import { generatePrediction } from '@/lib/predictions';
import { saveMatchAndPrediction, getHistoricalPredictions } from '@/lib/db';
import { Match, MatchPrediction } from '@/types';
import DatePicker from '@/components/DatePicker';
import MatchCard from '@/components/MatchCard';
import FilterSelect from '@/components/FilterSelect';
import Pagination from '@/components/Pagination';
import Navbar from '@/components/Navbar';
import { Input } from '@/components/ui/input';

const ITEMS_PER_PAGE = 10;
const MAX_PREDICTIONS = 50;
const DEFAULT_PREDICTIONS = 10;

export default function Home() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [maxPredictions, setMaxPredictions] = useState(DEFAULT_PREDICTIONS);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [filteredFixtures, setFilteredFixtures] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Map<string, MatchPrediction>>(new Map());
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [loadingMessage, setLoadingMessage] = useState('AI analysing games');
  const [viewMode, setViewMode] = useState<'live' | 'historical'>('live');
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [historicalPredictions, setHistoricalPredictions] = useState<MatchPrediction[]>([]);

  // Loading messages that cycle during prediction generation
  const loadingMessages = useMemo(() => [
    'AI analysing games',
    'Thinking',
    'Critical analysis',
    'Checking past results',
  ], []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  // Get unique leagues and countries from fixtures
  const leagues = useMemo(() => getUniqueLeagues(fixtures), [fixtures]);
  const countries = useMemo(() => getUniqueCountries(fixtures), [fixtures]);

  // Filter fixtures based on selected filters
  useEffect(() => {
    let filtered = fixtures;

    // Filter by country
    if (selectedCountry) {
      filtered = filtered.filter((f) => f.country_id === selectedCountry);
    }

    // Filter by league
    if (selectedLeague) {
      filtered = filtered.filter((f) => f.league_id === selectedLeague);
    }

    // Filter only upcoming/future matches
    const now = new Date();
    filtered = filtered.filter((fixture) => {
      const matchDate = new Date(`${fixture.match_date} ${fixture.match_time}`);
      return matchDate >= now && fixture.match_status !== 'Finished';
    });

    // Limit to maxPredictions (API limit is 50)
    const limited = filtered.slice(0, Math.min(maxPredictions, MAX_PREDICTIONS));

    setFilteredFixtures(limited);
    setCurrentPage(1); // Reset to first page when filters change
    setPredictions(new Map()); // Clear predictions when filters change
  }, [fixtures, selectedCountry, selectedLeague, maxPredictions]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredFixtures.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageFixtures = filteredFixtures.slice(startIndex, endIndex);

  // Fetch fixtures
  const fetchFixtures = async () => {
    if (!dateFrom || !dateTo) return;

    setLoadingFixtures(true);
    setError(null);
    setFixtures([]);
    setFilteredFixtures([]);
    setPredictions(new Map());
    setCurrentPage(1);

    try {
      const fetchedFixtures = await getFixtures(dateFrom, dateTo);

      if (fetchedFixtures.length === 0) {
        setError('No matches found for the selected date range and filters.');
        setLoadingFixtures(false);
        return;
      }

      setFixtures(fetchedFixtures);
    } catch (err) {
      console.error('Error fetching fixtures:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch fixtures. Please check your API key and try again.');
    } finally {
      setLoadingFixtures(false);
    }
  };

  // Cycle through loading messages
  useEffect(() => {
    if (!loadingPredictions) return;

    let messageIndex = 0;
    setLoadingMessage(loadingMessages[0]);

    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 1500); // Change message every 1.5 seconds

    return () => clearInterval(interval);
  }, [loadingPredictions, loadingMessages]);

  // Generate all predictions up to the limit
  const generateAllPredictions = useCallback(async () => {
    if (filteredFixtures.length === 0) return;

    setLoadingPredictions(true);
    setProgress({ current: 0, total: 0 });
    setLoadingMessage(loadingMessages[0]);

    // Get fixtures to process (up to maxPredictions limit)
    const fixturesToProcess = filteredFixtures.slice(0, Math.min(maxPredictions, MAX_PREDICTIONS));

    if (fixturesToProcess.length === 0) {
      setLoadingPredictions(false);
      return;
    }

    setProgress({ current: 0, total: fixturesToProcess.length });

    try {
      setPredictions((prevPredictions) => {
        const newPredictions = new Map(prevPredictions);
        
        // Process predictions asynchronously
        (async () => {
          for (let i = 0; i < fixturesToProcess.length; i++) {
            const fixture = fixturesToProcess[i];
            
            // Skip if already has prediction
            if (newPredictions.has(fixture.match_id)) {
              setProgress((prev) => ({ current: prev.current + 1, total: prev.total }));
              continue;
            }

            try {
              const prediction = await generatePrediction(fixture);
              
              // Save to database
              try {
                await saveMatchAndPrediction(prediction);
              } catch (dbError) {
                console.warn('Failed to save prediction to database:', dbError);
                // Continue even if database save fails
              }
              
              setPredictions((current) => {
                const updated = new Map(current);
                updated.set(fixture.match_id, prediction);
                return updated;
              });
              setProgress((prev) => ({ current: prev.current + 1, total: prev.total }));
            } catch (err) {
              console.error(`Error generating prediction for match ${fixture.match_id}:`, err);
              setProgress((prev) => ({ current: prev.current + 1, total: prev.total }));
            }
          }
          setLoadingPredictions(false);
          setProgress({ current: 0, total: 0 });
        })();

        return prevPredictions;
      });
    } catch (err) {
      console.error('Error generating predictions:', err);
      setError('Failed to generate some predictions. Please try again.');
      setLoadingPredictions(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [filteredFixtures, maxPredictions]);

  // Generate predictions when filtered fixtures change
  useEffect(() => {
    if (filteredFixtures.length > 0 && !loadingFixtures) {
      generateAllPredictions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredFixtures.length, maxPredictions]);

  // Get predictions for current page (only show predictions that exist)
  const currentPagePredictions = useMemo(() => {
    return currentPageFixtures
      .map((fixture) => predictions.get(fixture.match_id))
      .filter((p): p is MatchPrediction => p !== undefined)
      .sort((a, b) => b.confidence - a.confidence);
  }, [currentPageFixtures, predictions]);

  // Check if all predictions are generated
  const allPredictionsGenerated = filteredFixtures.length > 0 && 
    filteredFixtures.every((fixture) => predictions.has(fixture.match_id));

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

  // Load historical predictions when view mode changes
  useEffect(() => {
    if (viewMode === 'historical') {
      loadHistoricalPredictions();
    } else {
      setHistoricalPredictions([]);
      // Reset to today when switching to live mode if date is in the past
      if (dateFrom < today) {
        setDateFrom(today);
        setDateTo(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
      }
    }
  }, [viewMode, loadHistoricalPredictions, dateFrom, today]);

  // Reload historical predictions when dates change in historical mode
  useEffect(() => {
    if (viewMode === 'historical') {
      loadHistoricalPredictions();
    }
  }, [dateFrom, dateTo, viewMode, selectedLeague, selectedCountry, loadHistoricalPredictions]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Navbar */}
      <Navbar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        today={today}
        maxDate={maxDate}
      />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 flex items-center justify-center gap-3">
            <FaFutbol className="text-blue-600 dark:text-blue-400" />
            Football Game Predictor
            <FaRobot className="text-purple-600 dark:text-purple-400" />
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 px-2 flex items-center justify-center gap-2">
            <FaRobot className="text-purple-500 dark:text-purple-400 text-xs" />
            AI-powered predictions based on head-to-head data, team statistics, and recent form
            <FaRobot className="text-purple-500 dark:text-purple-400 text-xs" />
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-8 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Max Predictions
              </label>
              <Input
                type="number"
                min="1"
                max={MAX_PREDICTIONS}
                value={maxPredictions}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 1 && value <= MAX_PREDICTIONS) {
                    setMaxPredictions(value);
                  }
                }}
                placeholder={`1-${MAX_PREDICTIONS}`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Max: {MAX_PREDICTIONS} (API limit)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
            <button
              onClick={fetchFixtures}
              disabled={loadingFixtures || !dateFrom || !dateTo}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {loadingFixtures ? 'Loading Fixtures...' : 'Load Matches'}
            </button>

            {/* Quick Date Buttons */}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
                }}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
                }}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Next 3 Days
              </button>
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
                }}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Next Week
              </button>
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
                }}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Next 2 Weeks
              </button>
            </div>
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
        {fixtures.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {filteredFixtures.length} Match{filteredFixtures.length !== 1 ? 'es' : ''} Selected
                  {predictions.size > 0 && (
                    <span className="ml-2 text-sm font-normal text-green-600 dark:text-green-400">
                      ({predictions.size} predictions generated)
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCountry && `Country: ${countries.find(c => c.id === selectedCountry)?.name || 'All'} • `}
                  {selectedLeague && `League: ${leagues.find(l => l.id === selectedLeague)?.name || 'All'}`}
                  {!selectedCountry && !selectedLeague && 'All countries and leagues'}
                  {filteredFixtures.length >= MAX_PREDICTIONS && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                      • Limited to {MAX_PREDICTIONS} (API limit)
                    </span>
                  )}
                </p>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {viewMode === 'historical' ? (
          <div>
            {loadingHistorical ? (
              <div className="text-center py-12">
                <FaRobot className="text-6xl mb-4 mx-auto text-purple-600 dark:text-purple-400 animate-pulse" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Loading historical predictions...
                </h3>
              </div>
            ) : historicalPredictions.length > 0 ? (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {historicalPredictions.length} Historical Prediction{historicalPredictions.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Predictions from {dateFrom} to {dateTo}
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {historicalPredictions.map((prediction) => (
                    <MatchCard key={`${prediction.match.match_id}-${prediction.match.match_date}`} prediction={prediction} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FaSearch className="text-6xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No historical predictions found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No predictions found for the selected date range and filters
                </p>
              </div>
            )}
          </div>
        ) : !loadingFixtures && filteredFixtures.length > 0 && (
          <div>
            {currentPagePredictions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {currentPagePredictions.map((prediction) => (
                    <MatchCard key={prediction.match.match_id} prediction={prediction} />
                  ))}
                </div>
                {loadingPredictions && !allPredictionsGenerated && (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FaRobot className="text-purple-600 dark:text-purple-400 animate-pulse" />
                      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {loadingMessage}...
                      </p>
                      <FaRobot className="text-purple-600 dark:text-purple-400 animate-pulse" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ({predictions.size} / {filteredFixtures.length})
                    </p>
                  </div>
                )}
                {allPredictionsGenerated && (
                  <div className="text-center py-4 text-green-600 dark:text-green-400 font-semibold flex items-center justify-center gap-2">
                    <FaCheckCircle />
                    <FaRobot className="text-purple-500 dark:text-purple-400" />
                    <span>All {predictions.size} AI predictions generated successfully!</span>
                    <FaRobot className="text-purple-500 dark:text-purple-400" />
                  </div>
                )}
              </>
            ) : loadingPredictions ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <FaFutbol className="text-5xl text-blue-600 dark:text-blue-400" />
                  <FaRobot className="text-5xl text-purple-600 dark:text-purple-400 animate-pulse" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-center gap-2">
                  <FaRobot className="text-purple-500 dark:text-purple-400" />
                  {loadingMessage}...
                  <FaRobot className="text-purple-500 dark:text-purple-400" />
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  ({predictions.size} / {filteredFixtures.length})
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <FaFutbol className="text-5xl text-blue-600 dark:text-blue-400" />
                  <FaRobot className="text-5xl text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No predictions yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  AI predictions will be generated automatically when matches are loaded
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredFixtures.length}
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {!loadingFixtures && fixtures.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FaFutbol className="text-5xl text-blue-600 dark:text-blue-400" />
              <FaRobot className="text-5xl text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No matches loaded
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Select a date range and click "Load Matches" to see available fixtures
            </p>
          </div>
        )}

        {/* No matches after filtering */}
        {!loadingFixtures && fixtures.length > 0 && filteredFixtures.length === 0 && (
          <div className="text-center py-12">
            <FaSearch className="text-6xl mb-4 mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No matches match your filters
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your date range or filter criteria
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
