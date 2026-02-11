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
  const pageHeight = doc.getPageHeight();
  let y = 18;

  // Branding header: logo placeholder + BoardRoom Pro
  doc.setFillColor(41, 98, 255); // primary blue
  doc.roundedRect(14, y - 4, 14, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BR', 21, y + 4, { align: 'center' }); // 14 + 14/2 = 21
  doc.setTextColor(41, 98, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BoardRoom Pro', 32, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Shared Boardroom Management', 32, y + 8);
  doc.setTextColor(0, 0, 0);
  y += 18;

  // Report title and meta
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Booking Report', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const generatedAt = new Date(reportData.metadata.generatedAt).toLocaleString();
  doc.text(`Generated: ${generatedAt}`, 14, y);
  y += 5;
  const orgFilter = reportData.metadata.organizationFilter || filters.organizationName || 'All organizations';
  doc.text(`Organization: ${orgFilter}`, 14, y);
  y += 5;
  const { start, end } = reportData.metadata.dateRange;
  const dateRangeStr = start && end ? `${start} to ${end}` : start ? `From ${start}` : 'All dates';
  doc.text(`Date range: ${dateRangeStr}`, 14, y);
  y += 12;

  // Summary as a table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Summary', 14, y);
  y += 6;
  const s = reportData.summary;
  const summaryRows = [
    ['Total bookings', String(s.totalBookings)],
    ['Total hours (booked)', String(s.totalHours)],
    ['Confirmed & held (hours)', String(s.confirmedHeldHours ?? 0)],
    ['Free hours used', String(s.freeHoursUsed)],
    ['Paid hours', String(s.paidHours)],
    ['By status', `Confirmed: ${s.byStatus.confirmed}  |  Pending: ${s.byStatus.pending}  |  Cancelled: ${s.byStatus.cancelled}`]
  ];
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: summaryRows,
    theme: 'plain',
    headStyles: { fontSize: 9, fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 120 } },
    margin: { left: 14 },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.2
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

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
