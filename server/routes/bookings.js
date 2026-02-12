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

const LAB_PARTNERS_NAME = 'lab partners';

// Helper to determine booking type: Lab Partners always free; other tenants by balance; non-tenant HIRE
async function determineBookingType(organizationName, durationHours) {
  if (!organizationName || !durationHours) return 'HIRE';

  const normalized = organizationName.trim().toLowerCase();
  const [orgs] = await db.query(
    'SELECT is_tenant, monthly_free_hours, used_free_hours_this_month FROM organizations WHERE LOWER(TRIM(name)) = ?',
    [normalized]
  );
  const org = orgs[0];

  // Lab Partners: always FREE_HOURS, no fee, no hours deducted
  if (normalized === LAB_PARTNERS_NAME && org && org.is_tenant) {
    return 'FREE_HOURS';
  }

  // Non-tenant: always HIRE
  if (!org || !org.is_tenant) {
    return 'HIRE';
  }

  // Other tenants: FREE_HOURS if balance >= duration, else HIRE
  const monthlyFree = Number(org.monthly_free_hours || 0);
  const usedThisMonth = Number(org.used_free_hours_this_month || 0);
  const remaining = monthlyFree - usedThisMonth;
  return remaining >= durationHours ? 'FREE_HOURS' : 'HIRE';
}

// User-facing billing message for the current org + duration and resulting booking type
async function getBillingMessage(organizationName, durationHours, bookingType) {
  if (!organizationName) return 'This meeting will be charged.';
  const normalized = organizationName.trim().toLowerCase();
  const [orgs] = await db.query(
    'SELECT is_tenant, monthly_free_hours, used_free_hours_this_month FROM organizations WHERE LOWER(TRIM(name)) = ?',
    [normalized]
  );
  const org = orgs[0];

  if (normalized === LAB_PARTNERS_NAME && org && org.is_tenant) {
    return 'No fee; no hours deducted (Lab Partners).';
  }
  if (!org || !org.is_tenant) {
    return 'This meeting will be charged.';
  }
  if (bookingType === 'FREE_HOURS') {
    return 'This meeting will use your free hours balance.';
  }
  return 'Your free hours limit has been exceeded; this meeting will be charged.';
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
        createdAt: b.created_at,
        adminApprovalComments: b.admin_approval_comments != null ? b.admin_approval_comments : ''
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

    // Determine booking type and user-facing billing message
    const orgNameForBilling = bookingUser.company_name || organizationName;
    const bookingType = await determineBookingType(orgNameForBilling, durationHours);
    const billingMessage = await getBillingMessage(orgNameForBilling, durationHours, bookingType);

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
    
    // Return booking in the same format as GET endpoint, plus billingMessage for user notification
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
      createdAt: new Date().toISOString(),
      billingMessage
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
  const { status, approvalDetails } = req.body;

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
      // Admins can set any status; when confirming, optional approvalDetails can strip equipment/catering and set comments
      const equipmentToDb = {
        displayScreen: 'needs_display_screen',
        videoConferencing: 'needs_video_conferencing',
        projector: 'needs_projector',
        whiteboard: 'needs_whiteboard',
        conferencePhone: 'needs_conference_phone',
        extensionPower: 'needs_extension_power',
      };
      const equipmentLabels = {
        displayScreen: 'Display screen',
        videoConferencing: 'Video conferencing',
        projector: 'Projector',
        whiteboard: 'Whiteboard',
        conferencePhone: 'Conference phone',
        extensionPower: 'Extension power',
      };

      if (status === 'confirmed' && approvalDetails && typeof approvalDetails === 'object') {
        const fields = ['status = ?'];
        const params = [status];

        const pe = approvalDetails.provideEquipment;
        if (pe && typeof pe === 'object') {
          for (const [key, dbCol] of Object.entries(equipmentToDb)) {
            if (pe[key] === true || pe[key] === false) {
              fields.push(`${dbCol} = ?`);
              params.push(!!pe[key]);
            }
          }
        }
        if ('provideCateringTeaCoffee' in approvalDetails || 'provideCateringSnacks' in approvalDetails) {
          const tea = !!approvalDetails.provideCateringTeaCoffee;
          const snacks = !!approvalDetails.provideCateringSnacks;
          const cateringValue = snacks ? 'LIGHT_SNACKS' : tea ? 'TEA_COFFEE_WATER' : 'NONE';
          fields.push('catering_option = ?');
          params.push(cateringValue);
        } else if (approvalDetails.provideCatering === false) {
          fields.push('catering_option = ?');
          params.push('NONE');
        }
        const includeComments = approvalDetails.adminComments !== undefined;
        if (includeComments) {
          fields.push('admin_approval_comments = ?');
          params.push(approvalDetails.adminComments == null ? null : String(approvalDetails.adminComments));
        }

        params.push(id);
        try {
          await db.query(
            `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`,
            params
          );
        } catch (updateErr) {
          if (includeComments && (updateErr.code === 'ER_BAD_FIELD_ERROR' || (updateErr.message && updateErr.message.includes('admin_approval_comments')))) {
            fields.pop();
            params.pop();
            params.pop();
            params.push(id);
            await db.query(
              `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`,
              params
            );
          } else {
            throw updateErr;
          }
        }
      } else {
        await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
      }

      // If booking is being approved (confirmed), send confirmation email to user
      if (status === 'confirmed' && emailService && emailService.notifyUserBookingApproved) {
        const bookingForEmail = {
          id: booking.id,
          userId: booking.user_id,
          organizationName: booking.organization_name,
          contactName: booking.contact_name,
          contactEmail: booking.contact_email,
          date: booking.booking_date,
          startTime: (booking.start_time || '').substring(0, 5),
          endTime: (booking.end_time || '').substring(0, 5),
          purpose: booking.purpose || '',
          attendees: booking.attendees,
        };

        let emailOptions = null;
        if (approvalDetails && typeof approvalDetails === 'object') {
          const itemsProvided = [];
          const itemsNotProvided = [];
          const pe = approvalDetails.provideEquipment;
          if (pe && typeof pe === 'object') {
            for (const [key, label] of Object.entries(equipmentLabels)) {
              if (pe[key] === true) itemsProvided.push(label);
              else if (booking[equipmentToDb[key]]) itemsNotProvided.push(label);
            }
          }
          const tea = approvalDetails.provideCateringTeaCoffee === true;
          const snacks = approvalDetails.provideCateringSnacks === true;
          if (tea) itemsProvided.push('Tea/Coffee & Water');
          else if (booking.catering_option === 'TEA_COFFEE_WATER' || booking.catering_option === 'LIGHT_SNACKS') {
            itemsNotProvided.push('Tea/Coffee & Water');
          }
          if (snacks) itemsProvided.push('Light snacks');
          else if (booking.catering_option === 'LIGHT_SNACKS') itemsNotProvided.push('Light snacks');
          emailOptions = {
            itemsProvided,
            itemsNotProvided,
            adminComments: approvalDetails.adminComments,
          };
        }

        emailService.notifyUserBookingApproved(bookingForEmail, emailOptions).catch(err => {
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
// Deduct only for tenants that are NOT Lab Partners (Lab Partners: no fee, no hours deducted).
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

    // Add used_hours to organizations (tenant, not Lab Partners) from past confirmed FREE_HOURS bookings
    await db.query(
      `UPDATE organizations o
       JOIN (
         SELECT b.organization_name, SUM(b.duration_hours) AS used_hours
         FROM bookings b
         JOIN organizations o2 ON LOWER(TRIM(o2.name)) = LOWER(TRIM(b.organization_name))
           AND o2.is_tenant = TRUE AND LOWER(TRIM(o2.name)) != ?
         WHERE b.status = 'confirmed'
           AND b.booking_date < CURDATE()
           AND b.free_hours_applied = FALSE
           AND b.duration_hours IS NOT NULL
           AND b.booking_type = 'FREE_HOURS'
         GROUP BY b.organization_name
       ) sub ON LOWER(TRIM(sub.organization_name)) = LOWER(TRIM(o.name))
       SET o.used_free_hours_this_month = o.used_free_hours_this_month + sub.used_hours`,
      [LAB_PARTNERS_NAME]
    );

    // Mark those bookings as applied (tenant orgs only, exclude Lab Partners)
    await db.query(
      `UPDATE bookings b
       JOIN organizations o ON LOWER(TRIM(o.name)) = LOWER(TRIM(b.organization_name))
         AND o.is_tenant = TRUE AND LOWER(TRIM(o.name)) != ?
       SET b.free_hours_applied = TRUE
       WHERE b.status = 'confirmed'
         AND b.booking_date < CURDATE()
         AND b.free_hours_applied = FALSE
         AND b.duration_hours IS NOT NULL
         AND b.booking_type = 'FREE_HOURS'`,
      [LAB_PARTNERS_NAME]
    );

    res.json({ message: 'Free hours applied for past confirmed bookings (tenants except Lab Partners)' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error applying free hours' });
  }
});

module.exports = router;
