import { useState, useCallback, useEffect } from 'react';
import { Booking, BookingFormData, TIME_SLOTS } from '@/types/booking';
import { useAuth } from './useAuth';

const API_URL = 'http://161.97.183.92:5000/api/bookings';

export function useBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]); // User's bookings only
  const [allBookings, setAllBookings] = useState<Booking[]>([]); // All bookings for availability
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's bookings (for upcoming bookings list)
  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('bb_token');
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all bookings for availability checking (calendar display)
  const fetchAllBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('bb_token');
      const response = await fetch(`${API_URL}/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllBookings(data);
      }
    } catch (error) {
      console.error('Error fetching all bookings:', error);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchAllBookings();
  }, [fetchBookings, fetchAllBookings]);

  const getBookingsForDate = useCallback(
    (date: string) => {
      // Use allBookings for availability checking (includes all users' bookings)
      return allBookings.filter((booking) => {
        // Handle ISO date comparison
        const bDate = booking.date.includes('T') ? booking.date.split('T')[0] : booking.date;
        return bDate === date && booking.status !== 'cancelled';
      });
    },
    [allBookings]
  );

  const checkTimeSlotAvailability = useCallback(
    (date: string, startTime: string, endTime: string, excludeBookingId?: string) => {
      const dateBookings = getBookingsForDate(date).filter(
        (b) => b.id !== excludeBookingId
      );

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      for (const booking of dateBookings) {
        const bookingStart = timeToMinutes(booking.startTime);
        const bookingEnd = timeToMinutes(booking.endTime);

        if (startMinutes < bookingEnd && endMinutes > bookingStart) {
          return { available: false, conflictingBooking: booking };
        }
      }

      return { available: true, conflictingBooking: null };
    },
    [getBookingsForDate]
  );

  const getAvailableTimeSlots = useCallback(
    (date: string) => {
      const dateBookings = getBookingsForDate(date);

      return TIME_SLOTS.map((time) => {
        const timeMinutes = timeToMinutes(time);
        const booking = dateBookings.find((b) => {
          const start = timeToMinutes(b.startTime);
          const end = timeToMinutes(b.endTime);
          return timeMinutes >= start && timeMinutes < end;
        });

        return {
          time,
          isAvailable: !booking,
          booking,
        };
      });
    },
    [getBookingsForDate]
  );

  const addBooking = useCallback(
    async (formData: BookingFormData): Promise<{ success: boolean; error?: string; booking?: Booking }> => {
      const availability = checkTimeSlotAvailability(
        formData.date,
        formData.startTime,
        formData.endTime
      );

      if (!availability.available) {
        return {
          success: false,
          error: `Time slot conflicts with existing booking by ${availability.conflictingBooking?.organizationName}`,
        };
      }

      try {
        const token = localStorage.getItem('bb_token');
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...formData, userId: user?.id }),
        });

        if (response.ok) {
          const newBooking = await response.json();
          setBookings((prev) => [...prev, newBooking]);
          setAllBookings((prev) => [...prev, newBooking]);
          return { success: true, booking: newBooking };
        } else {
          return { success: false, error: 'Failed to create booking' };
        }
      } catch (error) {
        return { success: false, error: 'Connection failed' };
      }
    },
    [checkTimeSlotAvailability, user?.id]
  );

  const updateBookingStatus = useCallback(async (bookingId: string, status: string) => {
    try {
      const token = localStorage.getItem('bb_token');
      const response = await fetch(`${API_URL}/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId ? { ...booking, status: status as any } : booking
          )
        );
        setAllBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId ? { ...booking, status: status as any } : booking
          )
        );
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  }, []);

  const cancelBooking = useCallback((bookingId: string) => {
    updateBookingStatus(bookingId, 'cancelled');
  }, [updateBookingStatus]);

  const approveBooking = useCallback((bookingId: string) => {
    updateBookingStatus(bookingId, 'confirmed');
  }, [updateBookingStatus]);

  const rejectBooking = useCallback((bookingId: string) => {
    updateBookingStatus(bookingId, 'cancelled');
  }, [updateBookingStatus]);

  const getUpcomingBookings = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings
      .filter((b) => {
        const bDate = b.date.includes('T') ? b.date.split('T')[0] : b.date;
        // Filter by user ID to ensure only user's bookings are shown
        const isUserBooking = !user || b.userId === user.id;
        return bDate >= today && b.status !== 'cancelled' && isUserBooking;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [bookings, user?.id]);

  return {
    bookings, // User's bookings only (for upcoming list)
    allBookings, // All bookings (for calendar/availability)
    isLoading,
    getBookingsForDate,
    getAvailableTimeSlots,
    checkTimeSlotAvailability,
    addBooking,
    cancelBooking,
    approveBooking,
    rejectBooking,
    getUpcomingBookings,
    getBookingsThisWeek,
    getBookingsThisMonth,
  };
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
