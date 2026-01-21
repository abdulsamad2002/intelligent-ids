const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');
const { auth } = require('../middleware/auth');

// Protect all stats routes
router.use(auth);

// GET /api/stats - Dashboard statistics
router.get('/', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date,
      time_range = '24h' // 1h, 6h, 24h, 7d, 30d
    } = req.query;

    // Calculate time range
    let startDate;
    const endDate = end_date ? new Date(end_date) : new Date();

    if (start_date) {
      startDate = new Date(start_date);
    } else {
      // Calculate based on time_range
      const now = new Date();
      switch(time_range) {
        case '1h': startDate = new Date(now - 3600000); break;
        case '6h': startDate = new Date(now - 21600000); break;
        case '24h': startDate = new Date(now - 86400000); break;
        case '7d': startDate = new Date(now - 604800000); break;
        case '30d': startDate = new Date(now - 2592000000); break;
        default: startDate = new Date(now - 86400000); // Default 24h
      }
    }

    const dateFilter = {
      timestamp: { $gte: startDate, $lte: endDate }
    };

    // 1. Total attacks (malicious flows)
    const totalAttacks = await Flow.countDocuments({
      ...dateFilter,
      is_malicious: true
    });

    // 2. Total flows (all)
    const totalFlows = await Flow.countDocuments(dateFilter);

    // 3. Attack rate (attacks per hour)
    const hoursDiff = (endDate - startDate) / 3600000;
    const attackRate = (totalAttacks / hoursDiff).toFixed(1);

    // 4. Average threat level
    const avgThreatResult = await Flow.aggregate([
      { $match: { ...dateFilter, is_malicious: true } },
      { $group: { _id: null, avgSeverity: { $avg: '$severity_score' } } }
    ]);
    const avgThreat = avgThreatResult.length > 0 
      ? avgThreatResult[0].avgSeverity.toFixed(1) 
      : 0;

    // Determine threat level
    let threatLevel = 'LOW';
    if (avgThreat >= 8) threatLevel = 'CRITICAL';
    else if (avgThreat >= 6) threatLevel = 'HIGH';
    else if (avgThreat >= 4) threatLevel = 'MEDIUM';

    // 5. Attack type breakdown
    const attackTypeBreakdown = await Flow.aggregate([
      { $match: { ...dateFilter, is_malicious: true } },
      { $group: { _id: '$attack_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 6. Top attacking countries
    const topCountries = await Flow.aggregate([
      { $match: { ...dateFilter, is_malicious: true } },
      { $group: { 
          _id: '$src_country', 
          country_name: { $first: '$src_country_name' },
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 7. Top attacking IPs
    const topIPs = await Flow.aggregate([
      { $match: { ...dateFilter, is_malicious: true } },
      { $group: { 
          _id: '$src_ip',
          country: { $first: '$src_country' },
          city: { $first: '$src_city' },
          count: { $sum: 1 },
          avgSeverity: { $avg: '$severity_score' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 8. Most targeted ports
    const topPorts = await Flow.aggregate([
      { $match: { ...dateFilter, is_malicious: true } },
      { $group: { 
          _id: '$dst_port',
          count: { $sum: 1 }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 9. Timeline data (attacks over time)
    const timelineData = await Flow.aggregate([
      { $match: { ...dateFilter, is_malicious: true } },
      { $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d %H:00", 
              date: "$timestamp" 
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 10. Recent attacks (last 10)
    const recentAttacks = await Flow.find({
      ...dateFilter,
      is_malicious: true
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('flow_id timestamp src_ip dst_port attack_type confidence severity_score src_country');

    // Response
    res.json({
      success: true,
      data: {
        summary: {
          total_attacks: totalAttacks,
          total_flows: totalFlows,
          benign_flows: totalFlows - totalAttacks,
          attack_rate: parseFloat(attackRate),
          avg_threat_level: parseFloat(avgThreat),
          threat_level: threatLevel,
          time_range: time_range,
          start_date: startDate,
          end_date: endDate
        },
        attack_type_breakdown: attackTypeBreakdown,
        top_countries: topCountries,
        top_ips: topIPs,
        top_ports: topPorts,
        timeline: timelineData,
        recent_attacks: recentAttacks
      }
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/stats/summary - Quick summary only
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 86400000);

    const [totalAttacks, totalFlows, avgThreat] = await Promise.all([
      Flow.countDocuments({ 
        timestamp: { $gte: last24h },
        is_malicious: true 
      }),
      Flow.countDocuments({ timestamp: { $gte: last24h } }),
      Flow.aggregate([
        { $match: { 
            timestamp: { $gte: last24h },
            is_malicious: true 
          } 
        },
        { $group: { _id: null, avgSeverity: { $avg: '$severity_score' } } }
      ])
    ]);

    const avgSeverity = avgThreat.length > 0 ? avgThreat[0].avgSeverity : 0;

    res.json({
      success: true,
      data: {
        total_attacks: totalAttacks,
        total_flows: totalFlows,
        attack_rate: (totalAttacks / 24).toFixed(1),
        avg_severity: avgSeverity.toFixed(1)
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