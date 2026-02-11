import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportData, ReportFilters } from '@/hooks/useReports';

function equipmentList(b: ReportData['bookings'][0]): string {
  const items: string[] = [];
  if (b.needsDisplayScreen) items.push('Display screen');
  if (b.needsVideoConferencing) items.push('Video conferencing');
  if (b.needsProjector) items.push('Projector');
  if (b.needsWhiteboard) items.push('Whiteboard');
  if (b.needsConferencePhone) items.push('Conference phone');
  if (b.needsExtensionPower) items.push('Extension power');
  return items.length ? items.join(', ') : 'None';
}

function catering(option: string): string {
  switch (option) {
    case 'TEA_COFFEE_WATER': return 'Tea/Coffee & Water';
    case 'LIGHT_SNACKS': return 'Light snacks';
    default: return 'None';
  }
}

function bookingType(type: string): string {
  return type === 'FREE_HOURS' ? 'Free hours' : 'Hire';
}

function attendance(type: string): string {
  return type === 'EXTERNAL' ? 'External' : 'Internal';
}

export function generateBookingReportPDF(reportData: ReportData, filters: ReportFilters): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.getPageWidth();
  let y = 18;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Booking Report', 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const generatedAt = new Date(reportData.metadata.generatedAt).toLocaleString();
  doc.text(`Generated: ${generatedAt}`, 14, y);
  y += 5;

  const orgFilter = reportData.metadata.organizationFilter || filters.organizationName || 'All organizations';
  doc.text(`Organization: ${orgFilter}`, 14, y);
  y += 5;

  const { start, end } = reportData.metadata.dateRange;
  const dateRangeStr = start && end ? `${start} to ${end}` : start ? `From ${start}` : 'All dates';
  doc.text(`Date range: ${dateRangeStr}`, 14, y);
  y += 10;

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Summary', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const s = reportData.summary;
  doc.text(`Total bookings: ${s.totalBookings}`, 14, y);
  y += 5;
  doc.text(`Total hours (booked): ${s.totalHours}`, 14, y);
  y += 5;
  doc.text(`Confirmed & held (hours): ${s.confirmedHeldHours ?? 0}`, 14, y);
  y += 5;
  doc.text(`Free hours used: ${s.freeHoursUsed}`, 14, y);
  y += 5;
  doc.text(`Paid hours: ${s.paidHours}`, 14, y);
  y += 5;
  doc.text(`By status — Confirmed: ${s.byStatus.confirmed}, Pending: ${s.byStatus.pending}, Cancelled: ${s.byStatus.cancelled}`, 14, y);
  y += 12;

  // Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Bookings', 14, y);
  y += 6;

  const tableData = reportData.bookings.map((b) => [
    b.date,
    `${b.startTime} - ${b.endTime}`,
    b.durationHours != null ? String(Number(b.durationHours).toFixed(2)) : '—',
    b.organizationName || '—',
    b.contactName || '—',
    [b.contactEmail, b.contactPhone].filter(Boolean).join(' / ') || '—',
    String(b.attendees),
    attendance(b.attendanceType),
    equipmentList(b),
    catering(b.cateringOption),
    bookingType(b.bookingType),
    b.status,
    (b.purpose || '').slice(0, 40) + (b.purpose && b.purpose.length > 40 ? '…' : '')
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        'Date',
        'Time',
        'Duration (h)',
        'Organization',
        'Contact',
        'Email / Phone',
        'Attendees',
        'Type',
        'Equipment',
        'Catering',
        'Billing',
        'Status',
        'Purpose'
      ]
    ],
    body: tableData,
    theme: 'striped',
    headStyles: { fontSize: 7, fillColor: [66, 139, 202] },
    bodyStyles: { fontSize: 6 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 25 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 35 },
      6: { cellWidth: 18 },
      7: { cellWidth: 18 },
      8: { cellWidth: 40 },
      9: { cellWidth: 28 },
      10: { cellWidth: 22 },
      11: { cellWidth: 22 },
      12: { cellWidth: 35 }
    },
    margin: { left: 14 },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth / 2,
        doc.getPageHeight() - 10,
        { align: 'center' }
      );
    }
  });

  doc.save(`booking-report-${reportData.metadata.dateRange.start || 'all'}-${reportData.metadata.dateRange.end || 'all'}.pdf`);
}
