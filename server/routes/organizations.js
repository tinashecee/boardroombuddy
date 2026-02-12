const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Get all organizations with computed "used this month": sum of duration_hours
// for bookings where status = 'confirmed' and created_at is in the current month
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM organizations ORDER BY name ASC');
    const [usedRows] = await db.query(
      `SELECT organization_name, SUM(duration_hours) AS used_hours
       FROM bookings
       WHERE status = 'confirmed'
         AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01') + INTERVAL 1 MONTH
         AND duration_hours IS NOT NULL
       GROUP BY organization_name`
    );
    const usedByOrg = new Map();
    for (const row of usedRows) {
      const key = (row.organization_name || '').trim().toLowerCase();
      usedByOrg.set(key, Number(row.used_hours) || 0);
    }
    const result = rows.map((org) => {
      const key = (org.name || '').trim().toLowerCase();
      const computedUsed = usedByOrg.get(key) ?? 0;
      return { ...org, computed_used_hours_this_month: computedUsed };
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching organizations' });
  }
});

// Add a new organization
router.post('/', async (req, res) => {
  const { name, isTenant, monthlyFreeHours, billingRatePerHour } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const isTenantBool = !!isTenant;
  // When tenant, default to 10 hours if not provided; otherwise 0 or provided value
  const initialMonthlyHours = isTenantBool
    ? (monthlyFreeHours != null ? Number(monthlyFreeHours) : 10)
    : (monthlyFreeHours != null ? Number(monthlyFreeHours) : 0);

  try {
    const id = require('crypto').randomUUID();
    await db.query(
      `INSERT INTO organizations (
        id,
        name,
        is_tenant,
        monthly_free_hours,
        used_free_hours_this_month,
        billing_rate_per_hour
      ) VALUES (?, ?, ?, ?, 0, ?)`,
      [
        id,
        name,
        isTenantBool,
        initialMonthlyHours,
        billingRatePerHour != null ? billingRatePerHour : null
      ]
    );
    res.status(201).json({
      id,
      name,
      is_tenant: isTenantBool,
      monthly_free_hours: initialMonthlyHours,
      used_free_hours_this_month: 0,
      billing_rate_per_hour: billingRatePerHour != null ? billingRatePerHour : null
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Organization already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error creating organization' });
  }
});

// Reset tenant balances to 10 hours for the new month (admin-only). Excludes Lab Partners.
router.post('/reset-tenant-balances', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    const user = users[0];
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can reset tenant balances' });
    }
    const [result] = await db.query(
      `UPDATE organizations
       SET monthly_free_hours = 10, used_free_hours_this_month = 0
       WHERE is_tenant = TRUE AND LOWER(TRIM(name)) != 'lab partners'`
    );
    const affected = result.affectedRows ?? 0;
    res.json({ message: 'Tenant balances reset to 10 hours', updatedCount: affected });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error resetting tenant balances' });
  }
});

// Update organization (tenant settings, free hours, billing rate)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, isTenant, monthlyFreeHours, usedFreeHoursThisMonth, billingRatePerHour } = req.body;

  try {
    const fields = [];
    const params = [];

    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (isTenant !== undefined) {
      fields.push('is_tenant = ?');
      params.push(!!isTenant);
    }
    if (monthlyFreeHours !== undefined) {
      fields.push('monthly_free_hours = ?');
      params.push(monthlyFreeHours);
    }
    if (usedFreeHoursThisMonth !== undefined) {
      fields.push('used_free_hours_this_month = ?');
      params.push(usedFreeHoursThisMonth);
    }
    if (billingRatePerHour !== undefined) {
      fields.push('billing_rate_per_hour = ?');
      params.push(billingRatePerHour);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);

    await db.query(
      `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    const [rows] = await db.query('SELECT * FROM organizations WHERE id = ?', [id]);
    const org = rows[0];
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(org);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating organization' });
  }
});

// Delete an organization
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM organizations WHERE id = ?', [id]);
    res.json({ message: 'Organization deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting organization' });
  }
});

module.exports = router;
