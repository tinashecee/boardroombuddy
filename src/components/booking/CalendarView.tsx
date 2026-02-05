import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  bookingDates: string[];
}

export function CalendarView({ selectedDate, onDateChange, bookingDates }: CalendarViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startingDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const goToPreviousMonth = () => {
    onDateChange(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    onDateChange(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    if (newDate >= today) {
      onDateChange(newDate);
    }
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === today.toDateString();
  };

  const isPast = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date < today;
  };

  const hasBooking = (day: number) => {
    // Add 2 days to compensate for timezone offset
    // If events scheduled on Friday show on Thursday, we need to add one more day
    const date = new Date(currentYear, currentMonth, day);
    date.setDate(date.getDate() + 2);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return bookingDates.includes(dateStr);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-soft animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg text-card-foreground">
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="aspect-square">
            {day && (
              <button
                onClick={() => handleDayClick(day)}
                disabled={isPast(day)}
                className={cn(
                  'w-full h-full rounded-lg text-sm font-medium transition-all duration-200 relative',
                  isPast(day) && 'text-muted-foreground/40 cursor-not-allowed',
                  !isPast(day) && !isSelected(day) && 'hover:bg-secondary text-card-foreground',
                  isToday(day) && !isSelected(day) && 'ring-2 ring-primary/30',
                  isSelected(day) && 'bg-primary text-primary-foreground shadow-md'
                )}
              >
                {day}
                {hasBooking(day) && !isSelected(day) && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span>Has bookings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary/30" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
