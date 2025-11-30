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
          "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
          "dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "text-foreground"
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

