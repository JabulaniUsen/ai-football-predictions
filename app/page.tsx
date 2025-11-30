'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { getFixtures, getUniqueLeagues, getUniqueCountries } from '@/lib/api';
import { generatePrediction } from '@/lib/predictions';
import { Match, MatchPrediction } from '@/types';
import DatePicker from '@/components/DatePicker';
import MatchCard from '@/components/MatchCard';
import FilterSelect from '@/components/FilterSelect';
import Pagination from '@/components/Pagination';
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

  // Generate all predictions up to the limit
  const generateAllPredictions = useCallback(async () => {
    if (filteredFixtures.length === 0) return;

    setLoadingPredictions(true);
    setProgress({ current: 0, total: 0 });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            ⚽ Football Game Predictor
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            AI-powered predictions based on head-to-head data, team statistics, and recent form
          </p>
        </div>

        {/* Filters and Date Range Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <DatePicker
              label="From Date"
              value={dateFrom}
              onChange={setDateFrom}
              min={today}
              max={maxDate}
            />
            <DatePicker
              label="To Date"
              value={dateTo}
              onChange={setDateTo}
              min={dateFrom}
              max={maxDate}
            />
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

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <button
              onClick={fetchFixtures}
              disabled={loadingFixtures || !dateFrom || !dateTo}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {loadingFixtures ? 'Loading Fixtures...' : 'Load Matches'}
            </button>

            {/* Quick Date Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Next 3 Days
              </button>
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Next Week
              </button>
              <button
                onClick={() => {
                  setDateFrom(today);
                  setDateTo(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
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
        {!loadingFixtures && filteredFixtures.length > 0 && (
          <div>
            {currentPagePredictions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {currentPagePredictions.map((prediction) => (
                    <MatchCard key={prediction.match.match_id} prediction={prediction} />
                  ))}
                </div>
                {loadingPredictions && !allPredictionsGenerated && (
                  <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                    Generating predictions... ({predictions.size} / {filteredFixtures.length})
                  </div>
                )}
                {allPredictionsGenerated && (
                  <div className="text-center py-4 text-green-600 dark:text-green-400 font-semibold">
                    ✓ All {predictions.size} predictions generated successfully!
                  </div>
                )}
              </>
            ) : loadingPredictions ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚽</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Generating predictions...
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Please wait while we analyze the matches ({predictions.size} / {filteredFixtures.length})
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚽</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No predictions yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Predictions will be generated automatically when matches are loaded
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
            <div className="text-6xl mb-4">⚽</div>
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
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No matches match your filters
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your date range or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
