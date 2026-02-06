const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { notifyAdminsNewBooking, notifyUserBookingApproved } = require('../services/emailService');

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
    
    // Helper function to format date as YYYY-MM-DD
    const formatDate = (dateValue) => {
      console.log(`[BACKEND] formatDate input:`, dateValue, `Type:`, typeof dateValue);
      if (!dateValue) return null;
      
      // If it's a Date object, format it
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        console.log(`[BACKEND] Converted Date object to:`, formatted);
        return formatted;
      }
      
      // If it's a string with time (ISO format), extract just the date part
      if (typeof dateValue === 'string') {
        if (dateValue.includes('T')) {
          const dateOnly = dateValue.split('T')[0];
          console.log(`[BACKEND] Extracted date from ISO string:`, dateOnly);
          return dateOnly;
        }
        // If it's already YYYY-MM-DD format, return as is
        console.log(`[BACKEND] Using date string as-is:`, dateValue);
        return dateValue;
      }
      
      return dateValue;
    };
    
    // Map database fields to frontend camelCase
    const bookings = rows.map(b => {
      console.log(`[BACKEND] Raw booking_date field:`, b.booking_date, `Type:`, typeof b.booking_date);
      const formattedDate = formatDate(b.booking_date);
      console.log(`[BACKEND] Formatted date:`, formattedDate);
      
      return {
        id: b.id,
        userId: b.user_id,
        organizationName: b.organization_name,
        contactName: b.contact_name,
        contactEmail: b.contact_email,
        date: formattedDate,
        startTime: b.start_time.substring(0, 5), // HH:mm
        endTime: b.end_time.substring(0, 5),
        purpose: b.purpose,
        attendees: b.attendees,
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
    userId, organizationName, contactName, contactEmail, 
    date, startTime, endTime, purpose, attendees 
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
    const [userDetails] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [bookingUserId]);
    const bookingUser = userDetails[0];

    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO bookings (id, user_id, organization_name, contact_name, contact_email, booking_date, start_time, end_time, purpose, attendees) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, bookingUserId, organizationName, contactName, contactEmail, date, startTime, endTime, purpose, attendees]
    );
    
    // Return booking in the same format as GET endpoint
    const booking = {
      id,
      userId: bookingUserId,
      organizationName,
      contactName,
      contactEmail,
      date,
      startTime: startTime.substring(0, 5), // Ensure HH:mm format
      endTime: endTime.substring(0, 5),
      purpose: purpose || '',
      attendees,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Send email notification to admins (async, don't wait)
    notifyAdminsNewBooking(booking, bookingUser).catch(err => {
      console.error('Failed to send admin notification email:', err);
    });
    
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
    
    // Helper function to format date as YYYY-MM-DD (reuse from above)
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue.split('T')[0];
      }
      return dateValue;
    };
    
    // Map database fields to frontend camelCase
    const bookings = rows.map(b => ({
      id: b.id,
      userId: b.user_id,
      organizationName: b.organization_name,
      contactName: b.contact_name,
      contactEmail: b.contact_email,
      date: formatDate(b.booking_date),
      startTime: b.start_time.substring(0, 5), // HH:mm
      endTime: b.end_time.substring(0, 5),
      purpose: b.purpose,
      attendees: b.attendees,
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
      if (status === 'confirmed') {
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
        notifyUserBookingApproved(bookingForEmail).catch(err => {
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

module.exports = router;
