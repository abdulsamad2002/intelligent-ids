const express = require('express');
const router = express.Router();
const Flow = require('../models/Flow');
const Alert = require('../models/Alert');
const { broadcastNewAttack } = require('../websocket/socket');
const autoBlockService = require('../services/autoBlock');
const threatIntelService = require('../services/threatIntel');
const emailService = require('../services/emailService');
const { validateFlow } = require('../middleware/validator');
const { auth, idsAuth } = require('../middleware/auth');

// POST /api/flows - Receive flow from IDS (Protected by API Key)
router.post('/', idsAuth, validateFlow, async (req, res) => {
  try {
    const flowData = req.body;
    console.log(`DEBUG: Incoming flow - is_malicious: ${flowData.is_malicious} (Type: ${typeof flowData.is_malicious})`);
    
    const flow = new Flow(flowData);
    await flow.save();
    
    const emoji = flowData.is_malicious ? '🚨' : '✅';
    console.log(
      `${emoji} Flow saved: ${flow.flow_id} | ` +
      `${flow.attack_type} | ` +
      `Confidence: ${(flow.confidence * 100).toFixed(1)}% | ` +
      `Severity: ${flow.severity_score}/10`
    );
    
    // Process malicious flows
    if (flowData.is_malicious) {
      // 0. Save persistent alert
      try {
        const alert = new Alert({
          flow_id: flowData.flow_id,
          attack_type: flowData.attack_type,
          severity_score: flowData.severity_score || 0,
          confidence: flowData.confidence || 1.0,
          src_ip: flowData.src_ip,
          src_port: flowData.src_port,
          dst_ip: flowData.dst_ip,
          dst_port: flowData.dst_port,
          protocol: flowData.protocol,
          src_country: flowData.src_country,
          src_country_name: flowData.src_country_name,
          src_city: flowData.src_city,
          duration: flowData.duration,
          total_bytes: flowData.total_bytes,
          flow_packets_per_sec: flowData.flow_packets_per_sec,
          timestamp: flowData.timestamp || new Date(),
          status: 'new'
        });
        await alert.save();
        console.log(`✅ Alert created in DB: ${flowData.flow_id}`);
      } catch (alertError) {
        console.error('❌ Failed to save Alert to DB:', alertError.message);
      }

      // 1. Broadcast to WebSocket
      broadcastNewAttack(flowData);
      
      /* 2. Check auto-block (Feature Disabled as per request)
      const shouldBlock = await autoBlockService.shouldBlock(flow);
      if (shouldBlock) {
        await autoBlockService.blockIP(flow);
      }
      */
      
      // 3. Send email alert for critical attacks (async, don't wait)
      emailService.sendCriticalAlert(flow).catch(err => {
        console.error('Email alert failed:', err.message);
      });
      
      // 4. Enrich with threat intelligence (async, don't wait)
      threatIntelService.enrichFlow(flow.flow_id).catch(err => {
        console.error('Threat intel enrichment failed:', err.message);
      });
    }
    
    res.status(201).json({ 
      success: true,
      flow_id: flow.flow_id,
      message: 'Flow received and saved'
    });
    
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Flow already exists',
        flow_id: req.body.flow_id
      });
    }
    
    console.error('❌ Error saving flow:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save flow',
      message: error.message 
    });
  }
});

// POST /api/flows/batch - Bulk receive flows from IDS
router.post('/batch', idsAuth, async (req, res) => {
  try {
    const flowsData = req.body;
    if (!Array.isArray(flowsData)) {
      return res.status(400).json({ success: false, error: 'Expected an array of flows' });
    }

    if (flowsData.length === 0) {
      return res.status(200).json({ success: true, message: 'Empty batch received' });
    }

    // Bulk insert into MongoDB (ignores duplicates to prevent crash)
    const result = await Flow.insertMany(flowsData, { ordered: false }).catch(err => {
        // Handle partial success (some duplicates ignored)
        return err.insertedDocs;
    });

    console.log(`📦 Batch saved: ${flowsData.length} benign flows`);

    res.status(201).json({
      success: true,
      count: flowsData.length,
      message: 'Batch received and saved'
    });

  } catch (error) {
    console.error('❌ Error saving flow batch:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save flow batch' });
  }
});

// GET /api/flows - Get all flows with filtering (Protected by JWT)
router.get('/', auth, async (req, res) => {
  try {
    const {
      limit = 100,
      skip = 0,
      malicious,
      attack_type,
      src_country,
      src_ip,
      dst_port,
      min_severity,
      max_severity,
      start_date,
      end_date,
      enriched,
      unique,
      sort_by = 'timestamp',
      sort_order = 'desc'
    } = req.query;

    const query = {};

    if (enriched === 'true') {
      query.threat_intel = { $exists: true, $ne: null };
      // Exclude local/private IPs from global intel feed
      query.src_ip = { $not: /^192\.168\.|^10\.|^127\.0\.0\.1|^172\.(1[6-9]|2[0-9]|3[0-1])\./ };
    }

    if (malicious !== undefined) {
      query.is_malicious = malicious === 'true';
    }

    if (attack_type) {
      query.attack_type = attack_type;
    }

    if (src_country) {
      query.src_country = src_country;
    }

    if (src_ip) {
      query.src_ip = src_ip;
    }

    if (dst_port) {
      query.dst_port = parseInt(dst_port);
    }

    if (min_severity || max_severity) {
      query.severity_score = {};
      if (min_severity) query.severity_score.$gte = parseFloat(min_severity);
      if (max_severity) query.severity_score.$lte = parseFloat(max_severity);
    }

    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }

    // Handle Unique/Distinct Grouping (Move to end)
    if (unique === 'true') {
      const pipeline = [
        { $match: query },
        { $sort: { timestamp: -1 } },
        { $group: {
            _id: '$src_ip',
            latest_flow: { $first: '$$ROOT' }
        }},
        { $replaceRoot: { newRoot: '$latest_flow' } },
        { $sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) }
      ];

      const flows = await Flow.aggregate(pipeline);
      const totalResult = await Flow.aggregate([
        { $match: query },
        { $group: { _id: '$src_ip' } },
        { $count: 'count' }
      ]);
      const total = totalResult.length > 0 ? totalResult[0].count : 0;

      return res.json({
        success: true,
        data: flows,
        pagination: {
          total,
          count: flows.length,
          limit: parseInt(limit),
          skip: parseInt(skip),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    }

    const sortObj = {};
    sortObj[sort_by] = sort_order === 'asc' ? 1 : -1;

    const flows = await Flow.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-__v');

    const total = await Flow.countDocuments(query);

    res.json({
      success: true,
      data: flows,
      pagination: {
        total,
        count: flows.length,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching flows:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/flows/:id - Get single flow by flow_id (Protected by JWT)
router.get('/:id', auth, async (req, res) => {
  try {
    const flow = await Flow.findOne({ flow_id: req.params.id });

    if (!flow) {
      return res.status(404).json({ 
        success: false,
        error: 'Flow not found' 
      });
    }

    res.json({
      success: true,
      data: flow
    });

  } catch (error) {
    console.error('❌ Error fetching flow:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;