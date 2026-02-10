const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Import email service (optional - won't crash if nodemailer not installed)
let emailService;
try {
  emailService = require('../services/emailService');
} catch (error) {
  console.warn('Email service not available:', error.message);
  emailService = null;
}

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
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    return dateValue;
  }

  return dateValue;
}

// Helper to convert HH:mm or HH:mm:ss to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

// Helper to determine booking type based on tenant free hours
// Only "Lab Partners" organization is exempt from paying (gets free hours)
// All other organizations must pay (hire)
async function determineBookingType(organizationName, durationHours) {
  if (!organizationName || !durationHours) return 'HIRE';

  // Normalize organization name for comparison (case-insensitive, trim whitespace)
  const normalizedOrgName = organizationName.trim();
  
  // Only "Lab Partners" is exempt from paying
  // Check if this is the Lab Partners organization
  if (normalizedOrgName.toLowerCase() !== 'lab partners') {
    return 'HIRE';
  }

  // For Lab Partners, check their free hours allocation
  const [orgs] = await db.query(
    'SELECT is_tenant, monthly_free_hours, used_free_hours_this_month FROM organizations WHERE LOWER(TRIM(name)) = ?',
    [normalizedOrgName.toLowerCase()]
  );

  const org = orgs[0];
  
  // If Lab Partners org doesn't exist in DB or is not marked as tenant, default to HIRE
  // (Admin should configure Lab Partners as tenant with monthly_free_hours)
  if (!org || !org.is_tenant) {
    return 'HIRE';
  }

  const monthlyFree = Number(org.monthly_free_hours || 0);
  const usedThisMonth = Number(org.used_free_hours_this_month || 0);
  const remaining = monthlyFree - usedThisMonth;

  // If Lab Partners has remaining free hours, use them; otherwise charge (HIRE)
  return remaining >= durationHours ? 'FREE_HOURS' : 'HIRE';
}

// Get all bookings (optional: filter by date)
router.get('/', async (req, res) => {
  const { date } = req.query;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify token and get user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    let query = 'SELECT * FROM bookings';
    const params = [];
    
    // Filter by user_id for regular users, admins see all
    if (user.role === 'USER') {
      query += ' WHERE user_id = ?';
      params.push(user.id);
      
      if (date) {
        query += ' AND booking_date = ?';
        params.push(date);
      }
    } else {
      // Admin users can see all bookings
    if (date) {
      query += ' WHERE booking_date = ?';
      params.push(date);
      }
    }
    
    query += ' ORDER BY booking_date DESC, start_time ASC';
    
    const [rows] = await db.query(query, params);
        
    // Map database fields to frontend camelCase
    const bookings = rows.map(b => {
      const formattedDate = formatDate(b.booking_date);
      return {
        id: b.id,
        userId: b.user_id,
        organizationName: b.organization_name,
        contactName: b.contact_name,
        contactEmail: b.contact_email,
        contactPhone: b.contact_phone || '',
        date: formattedDate,
        startTime: b.start_time.substring(0, 5), // HH:mm
        endTime: b.end_time.substring(0, 5),
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
        durationHours: b.duration_hours || null,
        status: b.status,
        createdAt: b.created_at
      };
    });
    
    res.json(bookings);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Create a booking
router.post('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const { 
    userId,
    organizationName,
    contactName,
    contactEmail,
    contactPhone,
    date,
    startTime,
    endTime,
    purpose,
    attendees,
    attendanceType,
    equipment,
    cateringOption
  } = req.body;

  try {
    // Verify token and get user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Extract userId from token (more secure) - but allow override for admin creating on behalf of others
    const bookingUserId = (user.role === 'ADMIN' && userId) ? userId : user.id;

    // Get full user details for email notification
    const [userDetails] = await db.query('SELECT id, name, email, company_name FROM users WHERE id = ?', [bookingUserId]);
    const bookingUser = userDetails[0];

    // Compute duration in hours
    const minutesStart = timeToMinutes(startTime);
    const minutesEnd = timeToMinutes(endTime);
    const durationMinutes = Math.max(0, minutesEnd - minutesStart);
    const durationHours = durationMinutes / 60;

    // Determine booking type based on tenant free hours
    const orgNameForBilling = bookingUser.company_name || organizationName;
    const bookingType = await determineBookingType(orgNameForBilling, durationHours);

    // Normalize equipment flags
    const equipmentSet = new Set(Array.isArray(equipment) ? equipment : []);
    const needsDisplayScreen = equipmentSet.has('display_screen');
    const needsVideoConferencing = equipmentSet.has('video_conferencing');
    const needsProjector = equipmentSet.has('projector');
    const needsWhiteboard = equipmentSet.has('whiteboard');
    const needsConferencePhone = equipmentSet.has('conference_phone');
    const needsExtensionPower = equipmentSet.has('extension_power');

    const attendanceTypeDb = attendanceType === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
    let cateringOptionDb = 'NONE';
    if (cateringOption === 'TEA_COFFEE_WATER') cateringOptionDb = 'TEA_COFFEE_WATER';
    if (cateringOption === 'LIGHT_SNACKS') cateringOptionDb = 'LIGHT_SNACKS';

    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO bookings (
        id,
        user_id,
        organization_name,
        contact_name,
        contact_email,
        contact_phone,
        booking_date,
        start_time,
        end_time,
        purpose,
        attendees,
        attendance_type,
        needs_display_screen,
        needs_video_conferencing,
        needs_projector,
        needs_whiteboard,
        needs_conference_phone,
        needs_extension_power,
        catering_option,
        booking_type,
        duration_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        bookingUserId,
        organizationName,
        contactName,
        contactEmail,
        contactPhone || null,
        date,
        startTime,
        endTime,
        purpose,
        attendees,
        attendanceTypeDb,
        needsDisplayScreen,
        needsVideoConferencing,
        needsProjector,
        needsWhiteboard,
        needsConferencePhone,
        needsExtensionPower,
        cateringOptionDb,
        bookingType,
        durationHours
      ]
    );
    
    // Return booking in the same format as GET endpoint
    const booking = {
      id,
      userId: bookingUserId,
      organizationName,
      contactName,
      contactEmail,
      contactPhone: contactPhone || '',
      date,
      startTime: startTime.substring(0, 5), // Ensure HH:mm format
      endTime: endTime.substring(0, 5),
      purpose: purpose || '',
      attendees,
      attendanceType: attendanceTypeDb,
      needsDisplayScreen,
      needsVideoConferencing,
      needsProjector,
      needsWhiteboard,
      needsConferencePhone,
      needsExtensionPower,
      cateringOption: cateringOptionDb,
      bookingType,
      durationHours,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Send email notification to admins (async, don't wait)
    if (emailService && emailService.notifyAdminsNewBooking) {
      emailService.notifyAdminsNewBooking(booking, bookingUser).catch(err => {
        console.error('Failed to send admin notification email:', err);
      });
    }
    
    res.status(201).json(booking);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error creating booking' });
  }
});

// Get all bookings for availability checking (calendar display)
router.get('/availability', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [decoded.id]);
    
    if (!users[0]) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Return ALL bookings for availability checking (no user_id filter)
    const [rows] = await db.query('SELECT * FROM bookings ORDER BY booking_date DESC, start_time ASC');
    
    // Map database fields to frontend camelCase
    const bookings = rows.map(b => ({
      id: b.id,
      userId: b.user_id,
      organizationName: b.organization_name,
      contactName: b.contact_name,
      contactEmail: b.contact_email,
      contactPhone: b.contact_phone || '',
      date: formatDate(b.booking_date),
      startTime: b.start_time.substring(0, 5), // HH:mm
      endTime: b.end_time.substring(0, 5),
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
      durationHours: b.duration_hours || null,
      status: b.status,
      createdAt: b.created_at
    }));
    
    res.json(bookings);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Update booking status (confirm/cancel/reject)
router.patch('/:id/status', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const { id } = req.params;
  const { status } = req.body;
  
  if (!['confirmed', 'pending', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    // Verify token and get user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Get the booking to check ownership and get full booking details
    const [bookings] = await db.query(
      'SELECT * FROM bookings WHERE id = ?', 
      [id]
    );
    const booking = bookings[0];

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Allow cancellation if user owns the booking, or allow any status change if admin
    const isOwner = booking.user_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    
    if (status === 'cancelled' && (isAdmin || isOwner)) {
      // Users can cancel their own bookings, admins can cancel any
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Booking status updated to ${status}` });
    } else if (isAdmin) {
      // Admins can set any status
      await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
      
      // If booking is being approved (confirmed), send confirmation email to user
      if (status === 'confirmed' && emailService && emailService.notifyUserBookingApproved) {
        const bookingForEmail = {
          id: booking.id,
          userId: booking.user_id,
          organizationName: booking.organization_name,
          contactName: booking.contact_name,
          contactEmail: booking.contact_email,
          date: booking.booking_date,
          startTime: booking.start_time.substring(0, 5),
          endTime: booking.end_time.substring(0, 5),
          purpose: booking.purpose || '',
          attendees: booking.attendees,
        };
        
        // Send email notification to user (async, don't wait)
        emailService.notifyUserBookingApproved(bookingForEmail).catch(err => {
          console.error('Failed to send booking confirmation email:', err);
        });
      }
      
      res.json({ message: `Booking status updated to ${status}` });
    } else {
      // Non-admins can only cancel their own bookings
      return res.status(403).json({ message: 'You can only cancel your own bookings' });
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
});

// Apply free-hours usage for past confirmed bookings.
// This is intended to be called by a scheduled job or manually by an admin.
router.post('/apply-free-hours', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    const user = users[0];

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can apply free hours' });
    }

    // Aggregate duration_hours for Lab Partners organization from past confirmed bookings
    // Only "Lab Partners" is exempt from paying (gets free hours)
    await db.query(
      `UPDATE organizations o
       JOIN (
         SELECT organization_name, SUM(duration_hours) AS used_hours
         FROM bookings
         WHERE status = 'confirmed'
           AND booking_date < CURDATE()
           AND free_hours_applied = FALSE
           AND duration_hours IS NOT NULL
           AND LOWER(TRIM(organization_name)) = 'lab partners'
         GROUP BY organization_name
       ) b ON LOWER(TRIM(b.organization_name)) = LOWER(TRIM(o.name))
       SET o.used_free_hours_this_month = o.used_free_hours_this_month + b.used_hours
       WHERE LOWER(TRIM(o.name)) = 'lab partners' AND o.is_tenant = TRUE`
    );

    // Mark those bookings as applied so they are not counted twice
    // Only for Lab Partners organization
    await db.query(
      `UPDATE bookings
       SET free_hours_applied = TRUE
       WHERE status = 'confirmed'
         AND booking_date < CURDATE()
         AND free_hours_applied = FALSE
         AND duration_hours IS NOT NULL
         AND LOWER(TRIM(organization_name)) = 'lab partners'`
    );

    res.json({ message: 'Free hours applied for past confirmed bookings' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error applying free hours' });
  }
});

module.exports = router;
