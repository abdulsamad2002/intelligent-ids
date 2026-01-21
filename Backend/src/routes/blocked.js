const express = require('express');
const router = express.Router();
const BlockedIP = require('../models/BlockedIP');
const autoBlockService = require('../services/autoBlock');
const { validateBlockRequest } = require('../middleware/validator');
const { auth } = require('../middleware/auth');

// Protect all blocked routes
router.use(auth);

// GET /api/blocked - Get all blocked IPs
router.get('/', async (req, res) => {
  try {
    const { 
      active = 'true',
      limit = 100,
      skip = 0,
      sort_by = 'blocked_at',
      sort_order = 'desc'
    } = req.query;

    const query = {};
    
    if (active !== undefined) {
      query.is_active = active === 'true';
    }

    const sortObj = {};
    sortObj[sort_by] = sort_order === 'asc' ? 1 : -1;

    const blockedIPs = await BlockedIP.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await BlockedIP.countDocuments(query);

    res.json({
      success: true,
      data: blockedIPs,
      pagination: {
        total,
        count: blockedIPs.length,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST /api/blocked - Manually block an IP
router.post('/', validateBlockRequest, async (req, res) => {
  try {
    const { ip_address, reason, duration_hours } = req.body;

    // Check if already blocked
    const existing = await BlockedIP.findOne({ 
      ip_address, 
      is_active: true 
    });

    if (existing) {
      return res.status(409).json({ 
        success: false,
        error: 'IP already blocked' 
      });
    }

    const blockedIP = new BlockedIP({
      ip_address,
      reason: reason || 'Manually blocked',
      blocked_by: 'manual',
      blocked_until: duration_hours 
        ? new Date(Date.now() + duration_hours * 3600000) 
        : null,
      is_permanent: !duration_hours
    });

    await blockedIP.save();

    console.log(`🚫 Manually blocked IP: ${ip_address}`);

    res.status(201).json({
      success: true,
      data: blockedIP,
      message: 'IP blocked successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// DELETE /api/blocked/:ip - Unblock an IP
router.delete('/:ip', async (req, res) => {
  try {
    const result = await autoBlockService.unblockIP(req.params.ip);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/blocked/stats - Blocked IP statistics
router.get('/stats', async (req, res) => {
  try {
    const [total, active, expired, topCountries] = await Promise.all([
      BlockedIP.countDocuments(),
      BlockedIP.countDocuments({ is_active: true }),
      BlockedIP.countDocuments({ is_active: false }),
      BlockedIP.aggregate([
        { $match: { is_active: true } },
        { $group: { 
            _id: '$country', 
            country_name: { $first: '$country_name' },
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total_blocked: total,
        currently_active: active,
        expired: expired,
        top_countries: topCountries
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;