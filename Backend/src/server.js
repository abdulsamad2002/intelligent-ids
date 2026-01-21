const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const config = require('./config/config');
const connectDB = require('./config/database');
const { initWebSocket, getConnectedClients } = require('./websocket/socket');
const autoBlockService = require('./services/autoBlock');
const schedulerService = require('./services/scheduler');

const app = express();
const server = http.createServer(app);
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: 'connected',
    websocket_clients: getConnectedClients(),
    auto_block_enabled: config.autoBlock.enabled
  });
});

// Routes
const flowsRouter = require('./routes/flows');
const statsRouter = require('./routes/stats');
const blockedRouter = require('./routes/blocked');
const threatIntelRouter = require('./routes/threatIntel');
const reportsRouter = require('./routes/reports');
const alertsRouter = require('./routes/alerts');
const authRouter = require('./routes/auth');
const logsRouter = require('./routes/logs');

app.use('/api/flows', flowsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/blocked', blockedRouter);
app.use('/api/threat-intel', threatIntelRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/auth', authRouter);
app.use('/api/logs', logsRouter);

const errorHandler = require('./middleware/errorHandler');

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// Start server
async function start() {
  try {
    await connectDB();
    
    initWebSocket(server);
    
    // Initialize scheduled tasks (expired blocks, daily reports)
    schedulerService.init();
    
    server.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`  IDS BACKEND SERVER`);
      console.log(`${'='.repeat(60)}`);
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ WebSocket: Enabled`);
      console.log(`✓ Auto-Block: ${config.autoBlock.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`\n  Available Endpoints:`);
      console.log(`  → GET    /health`);
      console.log(`  → POST   /api/flows`);
      console.log(`  → GET    /api/flows`);
      console.log(`  → GET    /api/stats`);
      console.log(`  → GET    /api/blocked`);
      console.log(`  → POST   /api/blocked`);
      console.log(`  → DELETE /api/blocked/:ip`);
      console.log(`  → GET    /api/threat-intel/check/:ip`);
      console.log(`  → GET    /api/threat-intel/stats`);
      console.log(`  → POST   /api/reports/generate`);
      console.log(`  → GET    /api/reports/latest`);
      console.log(`  → GET    /api/alerts`);
      console.log(`${'='.repeat(60)}\n`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

start();