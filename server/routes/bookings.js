const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// Get all bookings (optional: filter by date)
router.get('/', async (req, res) => {
  const { date } = req.query;
  try {
    let query = 'SELECT * FROM bookings';
    const params = [];
    
    if (date) {
      query += ' WHERE booking_date = ?';
      params.push(date);
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
    console.error(error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Create a booking
router.post('/', async (req, res) => {
  const { 
    userId, organizationName, contactName, contactEmail, 
    date, startTime, endTime, purpose, attendees 
  } = req.body;

  try {
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO bookings (id, user_id, organization_name, contact_name, contact_email, booking_date, start_time, end_time, purpose, attendees) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, organizationName, contactName, contactEmail, date, startTime, endTime, purpose, attendees]
    );
    
    res.status(201).json({ id, ...req.body, status: 'pending' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating booking' });
  }
});

// Update booking status (confirm/cancel/reject)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['confirmed', 'pending', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Booking status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
});

module.exports = router;
