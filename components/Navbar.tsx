'use client';
import { format, addDays, subDays } from 'date-fns';
import { FaFutbol, FaRobot, FaHistory, FaCalendarAlt, FaSearch } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import DatePicker from './DatePicker';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import Link from 'next/link';

interface NavbarProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  viewMode: 'live' | 'historical';
  onViewModeChange: (mode: 'live' | 'historical') => void;
  today: string;
  maxDate: string;
  showDatePicker?: boolean; // Option to hide date picker in navbar
}

export default function Navbar({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  viewMode,
  onViewModeChange,
  today,
  maxDate,
  showDatePicker = true, // Default to true for backward compatibility
}: NavbarProps) {
  const pathname = usePathname();
  
  const handleQuickDate = (days: number) => {
    // Only allow backdating in historical mode
    if (days < 0 && viewMode === 'live') {
      return; // Don't allow past dates in live mode
    }
    const targetDate = format(addDays(new Date(), days), 'yyyy-MM-dd');
    // Ensure we don't go before today in live mode
    if (viewMode === 'live' && targetDate < today) {
      onDateFromChange(today);
      onDateToChange(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      return;
    }
    onDateFromChange(targetDate);
    onDateToChange(format(addDays(new Date(), days + 1), 'yyyy-MM-dd'));
  };

  const isToday = dateFrom === today;
  const isTomorrow = dateFrom === format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const isYesterday = dateFrom === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Determine min date based on view mode
  const minDate = viewMode === 'historical'
    ? format(subDays(new Date(), 365), 'yyyy-MM-dd')
    : today;

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FaFutbol className="text-blue-600 dark:text-blue-400 text-xl sm:text-2xl" />
              <FaRobot className="text-purple-600 dark:text-purple-400 text-xl sm:text-2xl" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Football Predictor
            </h1>
          </div>

          {/* Date Selection Bar - Similar to reference image */}
          {showDatePicker && (
            <div className="flex-1 w-full lg:w-auto flex justify-center">
              <div className="flex items-center gap-0 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 max-w-2xl w-full">
                {/* Select Date Button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-l-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-1 min-w-0">
                      <FaCalendarAlt className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {format(new Date(dateFrom), 'MMM d, yyyy')}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <DatePicker
                        label="From Date"
                        value={dateFrom}
                        onChange={onDateFromChange}
                        min={minDate}
                        max={maxDate}
                      />
                      <DatePicker
                        label="To Date"
                        value={dateTo}
                        onChange={onDateToChange}
                        min={dateFrom}
                        max={maxDate}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {viewMode === 'historical'
                        ? 'Select past dates to view historical predictions'
                        : 'Select future dates to view upcoming matches'}
                    </p>
                  </PopoverContent>
                </Popover>

                {/* Quick Date Buttons */}
                <button
                  onClick={() => handleQuickDate(0)}
                  className={`px-4 py-2 rounded-none text-sm font-medium transition-colors whitespace-nowrap ${isToday
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickDate(1)}
                  className={`px-4 py-2 rounded-none text-sm font-medium transition-colors whitespace-nowrap ${isTomorrow
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  Tomorrow
                </button>
                {viewMode === 'historical' && (
                  <button
                    onClick={() => handleQuickDate(-1)}
                    className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors whitespace-nowrap ${isYesterday
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    Yesterday
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant={viewMode === 'live' && pathname !== '/search' ? 'default' : 'outline'}
                size="sm"
                className="flex items-center gap-2"
              >
                <FaFutbol className="text-xs" />
                <span className="hidden sm:inline">Live</span>
              </Button>
            </Link>
            <Link href="/history">
              <Button
                variant={viewMode === 'historical' ? 'default' : 'outline'}
                size="sm"
                className="flex items-center gap-2"
              >
                <FaHistory className="text-xs" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </Link>
            <Link href="/search">
              <Button
                variant={pathname === '/search' ? 'default' : 'outline'}
                size="sm"
                className="flex items-center gap-2"
              >
                <FaSearch className="text-xs" />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

