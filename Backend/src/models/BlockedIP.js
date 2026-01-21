const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema({
  ip_address: { type: String, required: true, unique: true, index: true },
  reason: { type: String, required: true },
  attack_type: { type: String },
  severity_score: { type: Number },
  blocked_at: { type: Date, default: Date.now, index: true },
  blocked_until: { type: Date }, // null = permanent
  is_permanent: { type: Boolean, default: false },
  blocked_by: { type: String, default: 'auto' }, // 'auto' or 'manual'
  
  // Related flow that triggered the block
  flow_id: { type: String },
  
  // Statistics
  attack_count: { type: Number, default: 1 },
  last_attack: { type: Date, default: Date.now },
  
  // Geolocation
  country: { type: String },
  country_name: { type: String },
  city: { type: String },
  
  // Status
  is_active: { type: Boolean, default: true, index: true }
}, {
  timestamps: true
});

// Indexes
blockedIPSchema.index({ blocked_at: -1 });
blockedIPSchema.index({ is_active: 1, blocked_at: -1 });
blockedIPSchema.index({ ip_address: 1, is_active: 1 });

module.exports = mongoose.model('BlockedIP', blockedIPSchema);