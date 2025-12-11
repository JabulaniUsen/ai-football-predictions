'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FaChevronDown, FaSearch } from 'react-icons/fa';

interface FilterOption {
  id: string;
  name: string;
  country?: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  showAll?: boolean;
  disabled?: boolean;
}

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  showAll = true,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get selected option display text
  const selectedOption = options.find(opt => opt.id === value);
  const displayText = selectedOption
    ? (selectedOption.country ? `${selectedOption.name} (${selectedOption.country})` : selectedOption.name)
    : '';

  // Filter options based on search query
  const filteredOptions = options.filter(option => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = option.name.toLowerCase();
    const country = option.country?.toLowerCase() || '';
    return name.includes(query) || country.includes(query);
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
          // Scroll into view
          if (listRef.current) {
            const item = listRef.current.children[next] as HTMLElement;
            if (item) {
              item.scrollIntoView({ block: 'nearest' });
            }
          }
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          // Scroll into view
          if (listRef.current) {
            const item = listRef.current.children[next] as HTMLElement;
            if (item) {
              item.scrollIntoView({ block: 'nearest' });
            }
          }
          return next;
        });
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        const option = filteredOptions[highlightedIndex];
        if (option) {
          handleSelect(option.id);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        {/* Input/Button */}
        <div
          onClick={handleToggle}
          className={cn(
            "h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
            "bg-white dark:bg-gray-800",
            "border-gray-300 dark:border-gray-600",
            "text-gray-900 dark:text-gray-100",
            "focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-blue-500/50 dark:focus-within:ring-blue-400/50 focus-within:ring-[3px]",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "flex items-center gap-2 cursor-pointer",
            isOpen && "border-blue-500 dark:border-blue-400 ring-blue-500/50 dark:ring-blue-400/50 ring-[3px]"
          )}
        >
          {isOpen ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FaSearch className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <>
              <span className={cn(
                "flex-1 min-w-0 truncate text-left",
                !displayText && "text-gray-400 dark:text-gray-500"
              )}>
                {displayText || placeholder}
              </span>
            </>
          )}
          <FaChevronDown
            className={cn(
              "text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform",
              isOpen && "transform rotate-180"
            )}
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            <ul ref={listRef} className="py-1">
              {showAll && (
                <li
                  onClick={() => handleSelect('')}
                  className={cn(
                    "px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                    value === '' && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  )}
                >
                  {placeholder}
                </li>
              )}
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                  No options found
                </li>
              ) : (
                filteredOptions.map((option, index) => {
                  const optionText = option.country
                    ? `${option.name} (${option.country})`
                    : option.name;
                  const isSelected = value === option.id;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      className={cn(
                        "px-3 py-2 cursor-pointer",
                        isSelected && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium",
                        !isSelected && isHighlighted && "bg-gray-100 dark:bg-gray-700",
                        !isSelected && !isHighlighted && "hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      {optionText}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
