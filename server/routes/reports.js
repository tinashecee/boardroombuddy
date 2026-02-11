const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Helper to format date as YYYY-MM-DD
function formatDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof dateValue === 'string') {
    if (dateValue.includes('T')) return dateValue.split('T')[0];
    return dateValue;
  }
  return dateValue;
}

// Map DB row to report booking object
function mapBookingRow(b) {
  return {
    id: b.id,
    userId: b.user_id,
    organizationName: b.organization_name,
    contactName: b.contact_name,
    contactEmail: b.contact_email,
    contactPhone: b.contact_phone || '',
    date: formatDate(b.booking_date),
    startTime: b.start_time ? b.start_time.substring(0, 5) : '',
    endTime: b.end_time ? b.end_time.substring(0, 5) : '',
    purpose: b.purpose,
    attendees: b.attendees,
    attendanceType: b.attendance_type || 'INTERNAL',
    needsDisplayScreen: !!b.needs_display_screen,
    needsVideoConferencing: !!b.needs_video_conferencing,
    needsProjector: !!b.needs_projector,
    needsWhiteboard: !!b.needs_whiteboard,
    needsConferencePhone: !!b.needs_conference_phone,
    needsExtensionPower: !!b.needs_extension_power,
    cateringOption: b.catering_option || 'NONE',
    bookingType: b.booking_type || 'FREE_HOURS',
    durationHours: b.duration_hours != null ? Number(b.duration_hours) : null,
    status: b.status,
    createdAt: b.created_at
  };
}

/**
 * GET /api/reports
 * Query: organizationName (optional), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), month (YYYY-MM)
 * Auth: JWT required.
 * - Regular users: only bookings for their organization (user.company_name).
 * - Admins: all organizations or filter by organizationName.
 */
router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const { organizationName, startDate, endDate, month } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query(
      'SELECT id, role, company_name FROM users WHERE id = ?',
      [decoded.id]
    );
    const user = users[0];
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    let start = null;
    let end = null;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      start = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      end = `${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (startDate && endDate) {
      start = startDate.split('T')[0];
      end = endDate.split('T')[0];
    }

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    // Regular users: restrict to their organization (company_name)
    if (user.role === 'USER') {
      const userOrg = (user.company_name || '').trim();
      if (!userOrg) {
        return res.json({
          metadata: {
            dateRange: { start: start || null, end: end || null },
            organizationFilter: null,
            generatedAt: new Date().toISOString()
          },
          summary: {
            totalBookings: 0,
            totalHours: 0,
            freeHoursUsed: 0,
            paidHours: 0,
            byStatus: { confirmed: 0, pending: 0, cancelled: 0 }
          },
          bookings: []
        });
      }
      query += ' AND LOWER(TRIM(organization_name)) = LOWER(?)';
      params.push(userOrg);
      // Ignore organizationName filter for regular users (they only see their org)
    } else {
      // Admin: optional filter by organization
      if (organizationName && organizationName.trim()) {
        query += ' AND LOWER(TRIM(organization_name)) = LOWER(?)';
        params.push(organizationName.trim());
      }
    }

    if (start) {
      query += ' AND booking_date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND booking_date <= ?';
      params.push(end);
    }

    query += ' ORDER BY booking_date DESC, start_time ASC';

    const [rows] = await db.query(query, params);
    const bookings = rows.map(mapBookingRow);

    const totalHours = bookings.reduce((sum, b) => sum + (b.durationHours != null ? b.durationHours : 0), 0);
    const freeHoursUsed = bookings
      .filter(b => b.bookingType === 'FREE_HOURS')
      .reduce((sum, b) => sum + (b.durationHours != null ? b.durationHours : 0), 0);
    const paidHours = bookings
      .filter(b => b.bookingType === 'HIRE')
      .reduce((sum, b) => sum + (b.durationHours != null ? b.durationHours : 0), 0);

    const byStatus = {
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    res.json({
      metadata: {
        dateRange: { start: start || null, end: end || null },
        organizationFilter: organizationName && organizationName.trim() ? organizationName.trim() : (user.role === 'USER' ? user.company_name : null),
        generatedAt: new Date().toISOString()
      },
      summary: {
        totalBookings: bookings.length,
        totalHours: Math.round(totalHours * 100) / 100,
        freeHoursUsed: Math.round(freeHoursUsed * 100) / 100,
        paidHours: Math.round(paidHours * 100) / 100,
        byStatus
      },
      bookings
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('Reports API error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

module.exports = router;
