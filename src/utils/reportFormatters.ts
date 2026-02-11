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
  billing_rate_per_hour?: number | null;
}

export function calculateRevenue(bookings: Booking[], orgs: OrgWithBilling[]): number {
  const orgMap = new Map(orgs.map(o => [o.name.toLowerCase().trim(), o]));
  let revenue = 0;
  for (const b of bookings) {
    if (b.bookingType !== 'HIRE' || b.durationHours == null) continue;
    const org = orgMap.get((b.organizationName || '').toLowerCase().trim());
    const rate = org?.billing_rate_per_hour != null ? Number(org.billing_rate_per_hour) : 0;
    revenue += Number(b.durationHours) * rate;
  }
  return Math.round(revenue * 100) / 100;
}
