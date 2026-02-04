import { Clock, Users, Building } from 'lucide-react';
import { TimeSlot } from '@/types/booking';
import { cn } from '@/lib/utils';

interface TimeSlotGridProps {
  timeSlots: TimeSlot[];
  selectedDate: Date;
  onSlotClick: (startTime: string) => void;
}

export function TimeSlotGrid({ timeSlots, selectedDate, onSlotClick }: TimeSlotGridProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isDateInPast = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const isPastTime = (time: string) => {
    if (isDateInPast()) return true;
    const today = new Date();
    if (selectedDate.toDateString() !== today.toDateString()) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime <= today;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-soft animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-lg text-card-foreground">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Select a time slot to book</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
          <Clock className="h-4 w-4" />
          <span>8 AM - 6 PM</span>
        </div>
      </div>

      {isDateInPast() ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Cannot book slots in the past</p>
          <p className="text-sm mt-1">Please select a future date</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {timeSlots.map((slot) => {
            const past = isPastTime(slot.time);
            
            return (
              <button
                key={slot.time}
                onClick={() => slot.isAvailable && !past && onSlotClick(slot.time)}
                disabled={!slot.isAvailable || past}
                className={cn(
                  'time-slot text-left',
                  slot.isAvailable && !past && 'time-slot-available',
                  (!slot.isAvailable || past) && 'time-slot-booked'
                )}
              >
                <div className="font-medium text-sm">{formatTime(slot.time)}</div>
                {slot.booking ? (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building className="h-3 w-3" />
                      <span className="truncate">{slot.booking.organizationName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{slot.booking.attendees} attendees</span>
                    </div>
                  </div>
                ) : past ? (
                  <div className="text-xs text-muted-foreground mt-1">Past</div>
                ) : (
                  <div className="text-xs text-accent mt-1 font-medium">Available</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
