const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time_range: {
    start: Date,
    end: Date
  },
  summary: {
    total_flows: Number,
    malicious_count: Number,
    blocked_count: Number,
    top_attack_type: String
  },
  ai_analysis: {
    executive_summary: String,
    threat_landscape: String,
    detected_patterns: [String],
    recommendations: [String],
    raw_content: String // Full markdown from AI
  },
  status: { type: String, enum: ['generating', 'completed', 'failed'], default: 'generating' },
  created_by: { type: String, default: 'system' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
