const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
    const bookings = rows.map(b => ({
      id: b.id,
      userId: b.user_id,
      organizationName: b.organization_name,
      contactName: b.contact_name,
      contactEmail: b.contact_email,
      date: b.booking_date,
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
    
    res.status(201).json(booking);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error creating booking' });
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
    // Verify token and check if user is admin
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Only admins can update booking status
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Booking status updated to ${status}` });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
});

module.exports = router;
