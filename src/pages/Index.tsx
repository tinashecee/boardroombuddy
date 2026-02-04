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

  const timeSlots = getAvailableTimeSlots(selectedDate.toISOString().split('T')[0]);
  const upcomingBookings = getUpcomingBookings();

  // Get dates that have bookings for calendar indicators
  const bookingDates = [...new Set(bookings.filter(b => b.status !== 'cancelled').map((b) => b.date))];

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
