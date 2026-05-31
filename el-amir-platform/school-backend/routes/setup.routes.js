const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { hashPassword } = require('../utils/hash');

// One-time setup: creates the first super admin if none exists
// REMOVE or DISABLE this route after first use in production!
router.post('/create-admin', async (req, res) => {
  try {
    // Check if any admin already exists
    const { data: existing } = await supabase
      .from('admins')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ 
        error: 'Admin already exists. Setup already completed.' 
      });
    }

    const { username = 'admin', password = 'Admin@2024', fullName = 'Super Admin', email = 'admin@school.com' } = req.body;

    const password_hash = await hashPassword(password);

    const { data, error } = await supabase
      .from('admins')
      .insert({
        username,
        password_hash,
        full_name: fullName,
        email,
        role: 'super_admin',
        is_active: true
      })
      .select('id, username, email, role')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Admin account created successfully!',
      credentials: {
        username,
        password,
        role: 'admin'
      },
      user: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check setup status
router.get('/status', async (_req, res) => {
  try {
    const { data } = await supabase.from('admins').select('id').limit(1);
    res.json({ 
      setupComplete: !!(data && data.length > 0),
      adminCount: data ? data.length : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
