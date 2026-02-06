const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

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
    console.error('Signup error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already registered' });
    }
    // Ensure we always send a JSON response
    return res.status(500).json({ 
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Get all users (admin only)
router.get('/users', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [decoded.id]);
    if (!users[0] || users[0].role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get all users (excluding password_hash)
    const [allUsers] = await db.query(
      'SELECT id, name, email, company_name as companyName, role, is_approved, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Update user (admin only)
router.patch('/users/:id', async (req, res) => {
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
    const { name, email, companyName, role, isApproved } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (companyName !== undefined) {
      updates.push('company_name = ?');
      values.push(companyName);
    }
    if (role !== undefined) {
      // Validate role
      if (!['ADMIN', 'USER'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be ADMIN or USER' });
      }
      updates.push('role = ?');
      values.push(role);
    }
    if (isApproved !== undefined) {
      updates.push('is_approved = ?');
      values.push(isApproved);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    await db.query(query, values);

    // Return updated user
    const [updatedUsers] = await db.query(
      'SELECT id, name, email, company_name as companyName, role, is_approved, created_at FROM users WHERE id = ?',
      [id]
    );

    res.json({ message: 'User updated successfully', user: updatedUsers[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already in use' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Forgot password - Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Check if user exists
    const [users] = await db.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    const user = users[0];

    // Always return success message (security best practice - don't reveal if email exists)
    if (!user) {
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Store reset token in database
    await db.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, user.id, resetToken, expiresAt]
    );

    // Generate reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;
    
    // Send email with reset link
    try {
      await sendPasswordResetEmail(user.email, resetLink);
      console.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Still return success to user (security best practice)
    }

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset password - Use token to reset password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    // Find valid reset token
    const [tokens] = await db.query(
      `SELECT pt.*, u.id as user_id 
       FROM password_reset_tokens pt 
       JOIN users u ON pt.user_id = u.id 
       WHERE pt.token = ? AND pt.used = FALSE AND pt.expires_at > NOW()`,
      [token]
    );

    const resetToken = tokens[0];

    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [
      passwordHash,
      resetToken.user_id
    ]);

    // Mark token as used
    await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [
      resetToken.id
    ]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;
