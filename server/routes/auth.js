const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Signup
router.post('/signup', async (req, res) => {
  const { name, email, companyName, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    // First user is automatically ADMIN and approved for demo purposes
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const role = userCount[0].count === 0 ? 'ADMIN' : 'USER';
    const isApproved = userCount[0].count === 0;

    await db.query(
      'INSERT INTO users (id, name, email, company_name, role, is_approved, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, companyName, role, isApproved, passwordHash]
    );

    const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({ 
      token, 
      user: { id: userId, name, email, companyName, role, isApproved } 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already registered' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyName: user.company_name,
        role: user.role,
        isApproved: !!user.is_approved
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Get current user (Verify token)
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, name, email, company_name as companyName, role, is_approved as isApproved FROM users WHERE id = ?', [decoded.id]);
    const user = users[0];

    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
