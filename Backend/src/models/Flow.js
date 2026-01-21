const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  // Identifiers
  flow_id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  
  // Threat Intelligence (enriched from AbuseIPDB)
  threat_intel: {
    checked: { type: Boolean, default: false },
    abuse_score: { type: Number },
    is_known_malicious: { type: Boolean },
    reports_count: { type: Number },
    last_reported: { type: Date },
    categories: [Number],
    country_code: { type: String },
    usage_type: { type: String },
    isp: { type: String },
    domain: { type: String },
    is_whitelisted: { type: Boolean },
    is_tor: { type: Boolean }
  },
  
  // Classification
  prediction: { type: String, required: true, index: true },
  attack_type: { type: String, required: true },
  confidence: { type: Number, required: true },
  is_malicious: { type: Boolean, required: true, index: true },
  severity_score: { type: Number, required: true, index: true },
  recommended_action: { type: String, required: true },
  
  // Probabilities (top 5)
  class_probabilities: { type: Map, of: Number },
  
  // Source Information
  src_ip: { type: String, required: true, index: true },
  src_port: { type: Number },
  src_country: { type: String, index: true },
  src_country_name: { type: String },
  src_city: { type: String },
  src_latitude: { type: Number },
  src_longitude: { type: Number },
  
  // Destination Information
  dst_ip: { type: String, required: true, index: true },
  dst_port: { type: Number, index: true },
  
  // Protocol
  protocol: { type: String },
  protocol_number: { type: Number },
  
  // Flow Statistics
  duration: { type: Number },
  total_packets: { type: Number },
  total_bytes: { type: Number },
  fwd_packets: { type: Number },
  bwd_packets: { type: Number },
  fwd_bytes: { type: Number },
  bwd_bytes: { type: Number },
  
  // Timing
  flow_start_time: { type: Date },
  flow_end_time: { type: Date },
  
  // Performance Metrics
  flow_bytes_per_sec: { type: Number },
  flow_packets_per_sec: { type: Number },
  flow_iat_mean: { type: Number },
  
  // TCP Flags
  tcp_flags: {
    syn: { type: Number, default: 0 },
    fin: { type: Number, default: 0 },
    rst: { type: Number, default: 0 },
    psh: { type: Number, default: 0 },
    ack: { type: Number, default: 0 }
  },
  
  // Metadata
  processing_time_ms: { type: Number },
  features_used: { type: Number }
  
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

// Indexes for query performance
flowSchema.index({ timestamp: -1 });
flowSchema.index({ src_ip: 1, timestamp: -1 });
flowSchema.index({ is_malicious: 1, timestamp: -1 });
flowSchema.index({ severity_score: -1 });

module.exports = mongoose.model('Flow', flowSchema);