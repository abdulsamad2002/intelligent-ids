require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  
  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(','),
  
  // Auto-blocking
  autoBlock: {
    enabled: process.env.AUTO_BLOCK_ENABLED === 'true',
    threshold: parseFloat(process.env.AUTO_BLOCK_THRESHOLD || 8.5)
  },
  
  // Threat Intelligence
  abuseipdb: {
    apiKey: process.env.ABUSEIPDB_API_KEY
  },
  
  // AI Reports
  groq: {
    apiKey: process.env.GROQ_API_KEY
  },
  
  // Email Configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
    recipient: process.env.EMAIL_RECIPIENT,
    threshold: parseFloat(process.env.EMAIL_ALERT_THRESHOLD || 9.0)
  }
};

module.exports = config;
