import { Calendar, Clock, Users, Building, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Booking } from '@/types/booking';
import { cn } from '@/lib/utils';

interface UpcomingBookingsProps {
  bookings: Booking[];
  onCancel: (bookingId: string) => void;
}

export function UpcomingBookings({ bookings, onCancel }: UpcomingBookingsProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    // Handle date string in YYYY-MM-DD format
    // Remove any time portion if present (e.g., "2026-02-05T00:00:00" -> "2026-02-05")
    const dateOnly = dateStr.split('T')[0].trim();
    
    // Parse the date components
    const parts = dateOnly.split('-');
    if (parts.length !== 3) {
      console.error('Invalid date format:', dateStr);
      return dateStr;
    }
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Invalid date components:', dateStr);
      return dateStr;
    }
    
    // Get today's date in YYYY-MM-DD format for comparison (avoid timezone issues)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1; // getMonth() is 0-indexed
    const todayDay = today.getDate();
    const todayStr = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
    
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYear = tomorrow.getFullYear();
    const tomorrowMonth = tomorrow.getMonth() + 1;
    const tomorrowDay = tomorrow.getDate();
    const tomorrowStr = `${tomorrowYear}-${String(tomorrowMonth).padStart(2, '0')}-${String(tomorrowDay).padStart(2, '0')}`;
    
    // Compare date strings directly (most reliable)
    if (dateOnly === todayStr) {
      return 'Today';
    }
    if (dateOnly === tomorrowStr) {
      return 'Tomorrow';
    }
    
    // Format the date directly from components - no Date object conversion to avoid timezone issues
    // Create a date object ONLY to get the weekday name (this is safe as it's just for display)
    const bookingDate = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid timezone edge cases
    
    // Validate the date
    if (isNaN(bookingDate.getTime())) {
      console.error('Invalid date:', dateStr);
      return dateStr;
    }
    
    // Get weekday name
    const weekday = bookingDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month - 1];
    
    // Format using the ORIGINAL parsed day value (not from Date object): "Wed, Feb 5, 2026"
    return `${weekday}, ${monthName} ${day}, ${year}`;
  };

  const groupedBookings = bookings.reduce((acc, booking) => {
    const date = booking.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  if (bookings.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-soft animate-fade-in">
        <h2 className="font-semibold text-lg text-card-foreground mb-4">Upcoming Bookings</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No upcoming bookings</p>
          <p className="text-sm mt-1">Book a slot to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-soft animate-fade-in">
      <h2 className="font-semibold text-lg text-card-foreground mb-4">Upcoming Bookings</h2>
      <div className="space-y-6">
        {Object.entries(groupedBookings).map(([date, dateBookings]) => (
          <div key={date}>
            <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{formatDate(date)}</span>
            </div>
            <div className="space-y-2">
              {dateBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="booking-card group animate-slide-up"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            booking.status === 'confirmed' && 'status-confirmed',
                            booking.status === 'pending' && 'status-pending'
                          )}
                        >
                          {booking.status}
                        </span>
                        <span className="text-sm font-medium text-card-foreground">
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-card-foreground font-medium mb-1">
                        <Building className="h-4 w-4 text-primary" />
                        <span className="truncate">{booking.organizationName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                        {booking.purpose}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{booking.attendees} attendees</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{booking.contactName}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => onCancel(booking.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
