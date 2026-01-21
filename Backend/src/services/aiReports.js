const Groq = require('groq-sdk');
const Flow = require('../models/Flow');
const BlockedIP = require('../models/BlockedIP');
const Report = require('../models/Report');

class AIReportService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  /**
   * Generates a comprehensive security report using AI
   * @param {string} timeRange - '24h', '7d', etc.
   */
  async generateReport(timeRange = '24h') {
    try {
      console.log(`🤖 Starting AI Report generation for range: ${timeRange}`);
      
      // 1. Calculate time bounds
      const endDate = new Date();
      let startDate = new Date();
      if (timeRange === '24h') startDate.setHours(startDate.getHours() - 24);
      if (timeRange === '7d') startDate.setDate(startDate.getDate() - 7);

      // 2. Gather Data from Database
      const [totalFlows, maliciousFlows, blockedCount, attackBreakdown] = await Promise.all([
        Flow.countDocuments({ timestamp: { $gte: startDate } }),
        Flow.find({ is_malicious: true, timestamp: { $gte: startDate } }),
        BlockedIP.countDocuments({ createdAt: { $gte: startDate } }),
        Flow.aggregate([
          { $match: { is_malicious: true, timestamp: { $gte: startDate } } },
          { $group: { _id: '$attack_type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      const topAttack = attackBreakdown[0]?._id || 'None Detected';

      // 3. Prepare data for the AI
      const statsSummary = {
        period: timeRange,
        total_traffic: totalFlows,
        attacks_detected: maliciousFlows.length,
        ips_blocked: blockedCount,
        attack_types: attackBreakdown.map(a => `${a._id}: ${a.count}`).join(', '),
        sample_malicious_ips: [...new Set(maliciousFlows.slice(0, 5).map(f => f.src_ip))].join(', ')
      };

      // 4. Prompt the AI
      const prompt = `
        You are an expert Cybersecurity Analyst (CISM/CISSP certified). 
        Analyze the following IDS (Intrusion Detection System) security data for the last ${timeRange}:
        
        DATA SUMMARY:
        - Total Network Flows Analyzed: ${statsSummary.total_traffic}
        - Malicious Attacks Detected: ${statsSummary.attacks_detected}
        - Systems Automatically Blocked: ${statsSummary.ips_blocked}
        - Primary Attack Vectors: ${statsSummary.attack_types}
        - Recent Malicious Source IPs: ${statsSummary.sample_malicious_ips}

        Please provide a professional Security Analysis Report in Markdown format with the following sections:
        1. **Executive Summary**: A high-level overview of the security posture.
        2. **Threat Landscape**: Detailed analysis of the detected attack patterns.
        3. **Pattern Recognition**: Identify if these attacks suggest a specific type of campaign (e.g., botnet activity, targeted scanning).
        4. **Actionable Recommendations**: 3-5 specific technical steps to improve security based on this data.

        Keep the tone professional, concise, and technical.
      `;

      // 5. Call Groq AI
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
      });

      const aiResponse = chatCompletion.choices[0].message.content;

      // 6. Save Report to Database
      const report = new Report({
        title: `Security Analysis Report (${timeRange})`,
        time_range: { start: startDate, end: endDate },
        summary: {
          total_flows: totalFlows,
          malicious_count: maliciousFlows.length,
          blocked_count: blockedCount,
          top_attack_type: topAttack
        },
        ai_analysis: {
          raw_content: aiResponse
        },
        status: 'completed'
      });

      await report.save();
      console.log(`✅ AI Report generated and saved: ${report._id}`);
      
      return report;

    } catch (error) {
      console.error('❌ AI Report Generation Failed:', error.message);
      throw error;
    }
  }

  async getLatestReport() {
    return await Report.findOne({ status: 'completed' }).sort({ createdAt: -1 });
  }

  async getAllReports(limit = 10) {
    return await Report.find().sort({ createdAt: -1 }).limit(limit);
  }
}

module.exports = new AIReportService();
