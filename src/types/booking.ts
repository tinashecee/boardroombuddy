export interface Booking {
  id: string;
  userId?: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  purpose: string;
  attendees: number;
  attendanceType?: 'INTERNAL' | 'EXTERNAL';
  needsDisplayScreen?: boolean;
  needsVideoConferencing?: boolean;
  needsProjector?: boolean;
  needsWhiteboard?: boolean;
  needsConferencePhone?: boolean;
  needsExtensionPower?: boolean;
  cateringOption?: 'NONE' | 'TEA_COFFEE_WATER' | 'LIGHT_SNACKS';
  bookingType?: 'FREE_HOURS' | 'HIRE';
  durationHours?: number | null;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  /** Set when an admin confirms the booking; included in confirmation email. */
  adminApprovalComments?: string;
}

/** Sent when admin confirms a booking via the approval modal. */
export interface ApprovalDetails {
  provideEquipment?: {
    displayScreen?: boolean;
    videoConferencing?: boolean;
    projector?: boolean;
    whiteboard?: boolean;
    conferencePhone?: boolean;
    extensionPower?: boolean;
  };
  provideCatering?: boolean;
  adminComments?: string;
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
  contactPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  attendanceType: 'INTERNAL' | 'EXTERNAL';
  equipment: string[]; // e.g. ['display_screen', 'projector']
  cateringOption: 'NONE' | 'TEA_COFFEE_WATER' | 'LIGHT_SNACKS';
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
