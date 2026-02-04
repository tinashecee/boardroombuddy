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
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  try {
    const id = require('crypto').randomUUID();
    await db.query('INSERT INTO organizations (id, name) VALUES (?, ?)', [id, name]);
    res.status(201).json({ id, name });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Organization already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error creating organization' });
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
