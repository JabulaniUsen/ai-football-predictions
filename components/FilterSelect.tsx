'use client';

import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  name: string;
  country?: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  showAll?: boolean;
}

export default function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'All',
  showAll = true,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
          "bg-white dark:bg-gray-800",
          "text-gray-900 dark:text-gray-100",
          "focus-visible:border-blue-500 dark:focus-visible:border-blue-400 focus-visible:ring-blue-500/50 dark:focus-visible:ring-blue-400/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "[&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
        )}
      >
        {showAll && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.country ? `${option.name} (${option.country})` : option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

