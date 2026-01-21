const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  flow_id: { type: String, required: true, ref: 'Flow' },
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Attack Info
  attack_type: { type: String, required: true, index: true },
  severity_score: { type: Number, required: true, index: true },
  src_ip: { type: String, required: true, index: true },
  dst_ip: { type: String },
  
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
