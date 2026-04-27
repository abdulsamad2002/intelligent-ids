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

// POST /api/threat-intel/sync-alerts - Sync all unique IPs from alerts with IPDB
router.post('/sync-alerts', async (req, res) => {
  try {
    const Alert = require('../models/Alert');
    const Flow = require('../models/Flow');
    
    // 1. Get unique external IPs from HIGH SEVERITY Alerts (>8)
    const uniqueIPs = await Alert.distinct('src_ip', {
      src_ip: { $not: /^192\.168\.|^10\.|^127\.0\.0\.1|^172\.(1[6-9]|2[0-9]|3[0-1])\./ },
      severity_score: { $gt: 8 }
    });

    console.log(`🔄 Syncing ${uniqueIPs.length} unique IPs from alerts...`);

    const results = [];
    for (const ip of uniqueIPs) {
      // 2. Fetch from AbuseIPDB (service handles caching)
      const intel = await threatIntelService.checkIP(ip);
      
      if (intel) {
        // 3. Update the LATEST flow for this IP so it shows up in Intel Table
        await Flow.findOneAndUpdate(
          { src_ip: ip },
          { $set: { threat_intel: intel } },
          { sort: { timestamp: -1 } }
        );
        results.push({ ip, score: intel.abuse_score });
      }
    }

    res.json({
      success: true,
      count: results.length,
      ips_synced: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;