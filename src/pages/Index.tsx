import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Header } from '@/components/booking/Header';
import { Footer } from '@/components/booking/Footer';
import { CalendarView } from '@/components/booking/CalendarView';
import { TimeSlotGrid } from '@/components/booking/TimeSlotGrid';
import { BookingForm } from '@/components/booking/BookingForm';
import { UpcomingBookings } from '@/components/booking/UpcomingBookings';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPanel } from '@/components/admin/AdminPanel';
import { CalendarDays, ShieldCheck } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "bookings";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState<string | undefined>();

  const {
    getAvailableTimeSlots,
    addBooking,
    cancelBooking,
    getUpcomingBookings,
    bookings,
    allBookings,
  } = useBookings();

  const handleSlotClick = (startTime: string) => {
    setSelectedStartTime(startTime);
    setShowBookingForm(true);
  };

  const handleNewBooking = () => {
    setSelectedStartTime(undefined);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = (formData: Parameters<typeof addBooking>[0]) => {
    return addBooking(formData);
  };

  // Format date in YYYY-MM-DD format using local timezone (avoid UTC conversion)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const timeSlots = getAvailableTimeSlots(formatDateLocal(selectedDate));
  const upcomingBookings = getUpcomingBookings();

  // Get dates that have bookings for calendar indicators (use allBookings to show all bookings on calendar)
  // Add 1 day to each booking date from DB to fix display offset (Friday bookings showing on Thursday)
  const bookingDates = [...new Set((allBookings || bookings)
    .filter(b => b.status !== 'cancelled')
    .map((b) => {
      // Parse the date string and add 1 day
      const dateStr = b.date.includes('T') ? b.date.split('T')[0] : b.date;
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        date.setDate(date.getDate() + 1); // Add 1 day to shift display forward
        // Format back to YYYY-MM-DD
        const newYear = date.getFullYear();
        const newMonth = String(date.getMonth() + 1).padStart(2, '0');
        const newDay = String(date.getDate()).padStart(2, '0');
        return `${newYear}-${newMonth}-${newDay}`;
      }
      return dateStr; // Return original if parsing fails
    }))];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {user?.role === 'ADMIN' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
            <div className="flex items-center justify-between border-b pb-4">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="bookings" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Booking Dashboard
                </TabsTrigger>
                <TabsTrigger value="admin" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Panel
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="bookings" className="mt-0 border-none p-0 outline-none">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Calendar & Time Slots */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Boardroom Availability</h2>
                      <p className="text-muted-foreground mt-1">
                        Select a date and time slot to reserve the shared boardroom
                      </p>
                    </div>
                    <Button onClick={handleNewBooking} className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Booking
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <CalendarView
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      bookingDates={bookingDates}
                    />
                    <TimeSlotGrid
                      timeSlots={timeSlots}
                      selectedDate={selectedDate}
                      onSlotClick={handleSlotClick}
                    />
                  </div>
                </div>

                {/* Right Column - Upcoming Bookings */}
                <div className="lg:w-96">
                  <UpcomingBookings
                    bookings={upcomingBookings}
                    onCancel={cancelBooking}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="admin" className="mt-0 border-none p-0 outline-none">
              <AdminPanel />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Calendar & Time Slots */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Book the Boardroom</h2>
                  <p className="text-muted-foreground mt-1">
                    Select a date and time slot to reserve the shared boardroom
                  </p>
                </div>
                <Button onClick={handleNewBooking} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Booking
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <CalendarView
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  bookingDates={bookingDates}
                />
                <TimeSlotGrid
                  timeSlots={timeSlots}
                  selectedDate={selectedDate}
                  onSlotClick={handleSlotClick}
                />
              </div>
            </div>

            {/* Right Column - Upcoming Bookings */}
            <div className="lg:w-96">
              <UpcomingBookings
                bookings={upcomingBookings}
                onCancel={cancelBooking}
              />
            </div>
          </div>
        )}
      </main>

      {showBookingForm && (
        <BookingForm
          selectedDate={selectedDate}
          initialStartTime={selectedStartTime}
          onSubmit={handleBookingSubmit}
          onClose={() => setShowBookingForm(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default Index;
