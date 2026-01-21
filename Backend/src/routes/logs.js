const express = require('express');
const router = express.Router();
const { idsAuth } = require('../middleware/auth');
const { broadcastLog } = require('../websocket/socket');

/**
 * POST /api/logs
 * Receive terminal logs from the IDS Python engine and broadcast them via WebSockets.
 * Protected by IDS API Key.
 */
router.post('/', idsAuth, (req, res) => {
  try {
    const { message, level } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Missing message in request body'
      });
    }

    // Broadcast to all connected WebSocket clients
    broadcastLog(message, level || 'info');

    // Also log to backend console if needed
    // console.log(`[IDS-LOG] ${message}`);

    res.status(200).json({
      success: true,
      message: 'Log broadcasted'
    });
  } catch (error) {
    console.error('❌ Error broadcasting IDS log:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
