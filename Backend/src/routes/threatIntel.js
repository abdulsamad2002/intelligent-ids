const express = require('express');
const router = express.Router();
const threatIntelService = require('../services/threatIntel');
const { auth } = require('../middleware/auth');

// Protect all threat intel routes
router.use(auth);

// GET /api/threat-intel/check/:ip - Check single IP
router.get('/check/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    const result = await threatIntelService.checkIP(ip);
    
    if (result) {
      res.json({
        success: true,
        ip: ip,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to check IP'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/threat-intel/stats - Get service stats
router.get('/stats', (req, res) => {
  const stats = threatIntelService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

// POST /api/threat-intel/clear-cache - Clear cache
router.post('/clear-cache', (req, res) => {
  threatIntelService.clearCache();
  res.json({
    success: true,
    message: 'Cache cleared'
  });
});

module.exports = router;