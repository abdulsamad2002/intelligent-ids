const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { auth } = require('../middleware/auth');

// Protect all alert routes
router.use(auth);

// GET /api/alerts - Get all alerts with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      severity_min, 
      limit = 50, 
      skip = 0 
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity_min) query.severity_score = { $gte: parseFloat(severity_min) };

    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: alerts,
      pagination: { total, limit, skip }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/alerts/:id/resolve - Mark an alert as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { comment, user } = req.body;
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'resolved',
        resolution: {
          comment: comment || 'Resolved via dashboard',
          resolved_at: new Date(),
          resolved_by: user || 'admin'
        }
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alerts/stats - Alert statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    const stats = await Alert.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
