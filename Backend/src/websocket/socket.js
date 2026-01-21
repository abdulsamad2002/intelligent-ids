const { Server } = require('socket.io');
const logger = require('../config/logger');

let io;
let connectedClients = 0;

/**
 * Initialize WebSocket server
 */
function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    connectedClients++;
    console.log(`✓ WebSocket client connected (Total: ${connectedClients})`);
    console.log(`  Client ID: ${socket.id}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to IDS real-time feed',
      timestamp: new Date().toISOString()
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      connectedClients--;
      console.log(`✗ WebSocket client disconnected (Total: ${connectedClients})`);
    });

    // Handle client ping (for testing)
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  console.log('✓ WebSocket server initialized');
  return io;
}

/**
 * Broadcast new attack to all connected clients
 */
function broadcastNewAttack(flowData) {
  if (!io) {
    console.warn('⚠ WebSocket not initialized, cannot broadcast');
    return;
  }

  // Only broadcast malicious flows
  if (!flowData.is_malicious) {
    return;
  }

  console.log(`📡 Broadcasting attack to ${connectedClients} clients: ${flowData.flow_id}`);

  // Send to all connected clients
  io.emit('new_attack', {
    flow_id: flowData.flow_id,
    timestamp: flowData.timestamp,
    attack_type: flowData.attack_type,
    confidence: flowData.confidence,
    severity_score: flowData.severity_score,
    src_ip: flowData.src_ip,
    src_country: flowData.src_country,
    src_country_name: flowData.src_country_name,
    src_city: flowData.src_city,
    dst_ip: flowData.dst_ip,
    dst_port: flowData.dst_port,
    protocol: flowData.protocol
  });
}

/**
 * Broadcast statistics update
 */
function broadcastStatsUpdate(stats) {
  if (!io) return;
  
  io.emit('stats_update', stats);
}

/**
 * Broadcast IDS terminal log to all connected clients
 */
function broadcastLog(logContent, level = 'info') {
  if (!io) return;
  
  io.emit('ids_terminal_log', {
    message: logContent,
    level: level,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get connected clients count
 */
function getConnectedClients() {
  return connectedClients;
}

module.exports = {
  initWebSocket,
  broadcastNewAttack,
  broadcastStatsUpdate,
  broadcastLog,
  getConnectedClients
};