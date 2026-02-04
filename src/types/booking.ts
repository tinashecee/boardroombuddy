export interface Booking {
  id: string;
  userId?: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  purpose: string;
  attendees: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
}

export interface TimeSlot {
  time: string; // HH:MM format
  isAvailable: boolean;
  booking?: Booking;
}

export interface BookingFormData {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
}

export const BUSINESS_HOURS = {
  start: 8, // 8 AM
  end: 18, // 6 PM
} as const;

export const TIME_SLOTS = Array.from(
  { length: (BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 2 },
  (_, i) => {
    const hour = Math.floor(i / 2) + BUSINESS_HOURS.start;
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }
);
