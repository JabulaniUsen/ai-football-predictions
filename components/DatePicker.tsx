'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

export default function DatePicker({ label, value, onChange, min, max }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Convert string value to Date object
  const date = value ? new Date(value) : undefined;
  
  // Convert min/max strings to Date objects
  const minDate = min ? new Date(min) : undefined;
  const maxDate = max ? new Date(max) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Format as YYYY-MM-DD
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      onChange(formattedDate);
      setOpen(false);
    }
  };

  // Helper function to compare dates without time
  const isDateDisabled = (date: Date): boolean => {
    if (minDate) {
      const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (dateOnly < minDateOnly) return true;
    }
    if (maxDate) {
      const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (dateOnly > maxDateOnly) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal h-9',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={isDateDisabled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
