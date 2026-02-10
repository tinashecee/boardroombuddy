const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all organizations
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM organizations ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching organizations' });
  }
});

// Add a new organization
router.post('/', async (req, res) => {
  const { name, isTenant, monthlyFreeHours, billingRatePerHour } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

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
        !!isTenant,
        monthlyFreeHours != null ? monthlyFreeHours : 0,
        billingRatePerHour != null ? billingRatePerHour : null
      ]
    );
    res.status(201).json({
      id,
      name,
      is_tenant: !!isTenant,
      monthly_free_hours: monthlyFreeHours != null ? monthlyFreeHours : 0,
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
