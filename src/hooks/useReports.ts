import { useState, useCallback } from 'react';

const API_URL = '/api/reports';

export interface ReportFilters {
  organizationName: string;
  filterType: 'month' | 'range';
  month: string; // YYYY-MM
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface ReportSummary {
  totalBookings: number;
  totalHours: number;
  freeHoursUsed: number;
  paidHours: number;
  byStatus: { confirmed: number; pending: number; cancelled: number };
}

export interface ReportMetadata {
  dateRange: { start: string | null; end: string | null };
  organizationFilter: string | null;
  generatedAt: string;
}

export interface ReportBooking {
  id: string;
  userId?: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  attendees: number;
  attendanceType: string;
  needsDisplayScreen: boolean;
  needsVideoConferencing: boolean;
  needsProjector: boolean;
  needsWhiteboard: boolean;
  needsConferencePhone: boolean;
  needsExtensionPower: boolean;
  cateringOption: string;
  bookingType: string;
  durationHours: number | null;
  status: string;
  createdAt?: string;
}

export interface ReportData {
  metadata: ReportMetadata;
  summary: ReportSummary;
  bookings: ReportBooking[];
}

const defaultFilters: ReportFilters = {
  organizationName: '',
  filterType: 'month',
  month: new Date().toISOString().slice(0, 7),
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10)
};

export function useReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (filters: ReportFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.organizationName) params.set('organizationName', filters.organizationName);
      if (filters.filterType === 'month' && filters.month) {
        params.set('month', filters.month);
      } else if (filters.filterType === 'range' && filters.startDate && filters.endDate) {
        params.set('startDate', filters.startDate);
        params.set('endDate', filters.endDate);
      }
      const token = localStorage.getItem('bb_token');
      const url = `${API_URL}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch report');
      }
      const data: ReportData = await response.json();
      setReportData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch report';
      setError(message);
      setReportData(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    reportData,
    isLoading,
    error,
    fetchReport,
    defaultFilters
  };
}
