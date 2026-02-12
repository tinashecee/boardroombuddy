import type { Booking } from '@/types/booking';

export function formatEquipmentList(booking: Booking): string {
  const items: string[] = [];
  if (booking.needsDisplayScreen) items.push('Display screen');
  if (booking.needsVideoConferencing) items.push('Video conferencing');
  if (booking.needsProjector) items.push('Projector');
  if (booking.needsWhiteboard) items.push('Whiteboard');
  if (booking.needsConferencePhone) items.push('Conference phone');
  if (booking.needsExtensionPower) items.push('Extension power');
  return items.length ? items.join(', ') : 'None';
}

export function formatCateringOption(option: string | undefined): string {
  if (!option) return 'None';
  switch (option) {
    case 'TEA_COFFEE_WATER': return 'Tea/Coffee & Water';
    case 'LIGHT_SNACKS': return 'Light snacks';
    default: return 'None';
  }
}

export function formatBookingType(type: string | undefined): string {
  if (!type) return '—';
  return type === 'FREE_HOURS' ? 'Free hours' : 'Hire';
}

export function formatAttendanceType(type: string | undefined): string {
  if (!type) return '—';
  return type === 'EXTERNAL' ? 'External' : 'Internal';
}

export function calculateTotalHours(bookings: Booking[]): number {
  return bookings.reduce((sum, b) => sum + (b.durationHours != null ? Number(b.durationHours) : 0), 0);
}

export interface OrgWithBilling {
  name: string;
}

export function calculateRevenue(_bookings: Booking[], _orgs: OrgWithBilling[]): number {
  return 0;
}
