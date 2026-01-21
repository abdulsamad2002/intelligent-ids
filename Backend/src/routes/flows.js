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
    if (flow.is_malicious) {
      // 0. Save persistent alert
      const alert = new Alert({
        flow_id: flow.flow_id,
        attack_type: flow.attack_type,
        severity_score: flow.severity_score,
        src_ip: flow.src_ip,
        dst_ip: flow.dst_ip,
        status: 'new'
      });
      await alert.save();

      // 1. Broadcast to WebSocket
      broadcastNewAttack(flowData);
      
      // 2. Check auto-block
      const shouldBlock = await autoBlockService.shouldBlock(flow);
      if (shouldBlock) {
        await autoBlockService.blockIP(flow);
      }
      
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
      sort_by = 'timestamp',
      sort_order = 'desc'
    } = req.query;

    const query = {};

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