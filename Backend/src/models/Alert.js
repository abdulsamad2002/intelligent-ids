const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  flow_id: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Attack Info
  attack_type: { type: String, required: true, index: true },
  severity_score: { type: Number, required: true, index: true },
  confidence: { type: Number, default: 1.0 },
  
  // Connection Info
  src_ip: { type: String, required: true, index: true },
  src_port: { type: Number },
  dst_ip: { type: String },
  dst_port: { type: Number },
  protocol: { type: String },
  
  // Geolocation
  src_country: { type: String },
  src_country_name: { type: String },
  src_city: { type: String },
  
  // Traffic Stats
  duration: { type: Number },
  total_bytes: { type: Number },
  flow_packets_per_sec: { type: Number },
  
  // Management Status
  status: { 
    type: String, 
    enum: ['new', 'investigating', 'resolved', 'false_positive'], 
    default: 'new',
    index: true 
  },
  resolution: {
    comment: String,
    resolved_at: Date,
    resolved_by: String
  },
  
  // Flags
  is_blocked: { type: Boolean, default: false },
  is_notified: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
