const express = require('express');
const router = express.Router();
const aiReportService = require('../services/aiReports');
const { auth } = require('../middleware/auth');

// Protect all report routes
router.use(auth);

// GET /api/reports - Get list of all reports
router.get('/', async (req, res) => {
  try {
    const reports = await aiReportService.getAllReports(req.query.limit || 20);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/latest - Get the most recent report
router.get('/latest', async (req, res) => {
  try {
    const report = await aiReportService.getLatestReport();
    if (!report) {
      return res.status(404).json({ success: false, error: 'No reports found' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reports/generate - Trigger a new AI report generation
router.post('/generate', async (req, res) => {
  try {
    const { time_range } = req.body; // '24h', '7d'
    
    // We start the generation
    // Note: AI generation can take 5-10 seconds, so in a real production app 
    // you might want to run this in the background and use WebSockets to notify when done.
    const report = await aiReportService.generateReport(time_range || '24h');
    
    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    if (error.message.includes('apiKey')) {
      return res.status(401).json({ 
        success: false, 
        error: 'GROQ_API_KEY is missing or invalid. Please add it to your .env file.' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
