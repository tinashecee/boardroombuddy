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
    
    // All new users are created as USER role and must await admin approval
    const role = 'USER';
    const isApproved = false;

    await db.query(
      'INSERT INTO users (id, name, email, company_name, role, is_approved, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, companyName, role, isApproved, passwordHash]
    );

    // Don't return token - user must wait for approval before logging in
    res.status(201).json({ 
      message: 'Account created successfully. Please wait for admin approval before logging in.',
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

    // Check if user is approved before allowing login
    if (!user.is_approved) {
      return res.status(403).json({ 
        message: 'Your account is pending approval. Please wait for an administrator to approve your account.' 
      });
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

// Get pending users (admin only)
router.get('/pending-users', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [decoded.id]);
    if (!users[0] || users[0].role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get pending users
    const [pendingUsers] = await db.query(
      'SELECT id, name, email, company_name as companyName FROM users WHERE is_approved = FALSE ORDER BY created_at ASC'
    );
    
    res.json(pendingUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching pending users' });
  }
});

// Approve user
router.patch('/users/:id/approve', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [decoded.id]);
    if (!users[0] || users[0].role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    await db.query('UPDATE users SET is_approved = TRUE WHERE id = ?', [id]);
    
    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error approving user' });
  }
});

// Reject user (delete)
router.delete('/users/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [decoded.id]);
    if (!users[0] || users[0].role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = ? AND is_approved = FALSE', [id]);
    
    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error rejecting user' });
  }
});

module.exports = router;
