const Groq = require('groq-sdk');
const Flow = require('../models/Flow');
const BlockedIP = require('../models/BlockedIP');
const Report = require('../models/Report');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class AIReportService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  // ... (generateReport and other methods)
  
  async generatePDF(reportId) {
    const report = await Report.findById(reportId);
    if (!report) throw new Error('Report not found');

    const filePath = path.join(__dirname, '../../exports/reports', `${reportId}.pdf`);

    // If file already exists on disk, return it
    if (fs.existsSync(filePath)) {
      console.log(`📄 Serving PDF from filesystem: ${reportId}.pdf`);
      return fs.readFileSync(filePath);
    }

    // Otherwise generate it (and save it)
    const pdfBuffer = await this._renderPDFBuffer(report);
    this._saveToDisk(reportId, pdfBuffer);
    return pdfBuffer;
  }

  async _saveToDisk(reportId, buffer) {
    const dir = path.join(__dirname, '../../exports/reports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const filePath = path.join(dir, `${reportId}.pdf`);
    fs.writeFileSync(filePath, buffer);
    console.log(`💾 Report saved to filesystem: ${filePath}`);
  }

  async _renderPDFBuffer(report) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: report.title,
          Author: 'Intelligent IDS'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- PDF CONTENT ---

      // Header
      doc.rect(0, 0, doc.page.width, 80).fill('#000000');
      doc.fillColor('#FFFFFF')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('INTELLIGENT IDS', 50, 32);
      
      doc.fontSize(10)
         .font('Helvetica')
         .text('SECURITY ANALYSIS REPORT', 50, 52, { characterSpacing: 1 });

      doc.fillColor('#666666')
         .fontSize(8)
         .text(new Date().toUTCString(), doc.page.width - 200, 35, { align: 'right' });

      doc.moveDown(6);

      // Report Title & Date
      doc.fillColor('#000000')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(report.title.toUpperCase(), 50, 110);
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Analysis Period: ${new Date(report.time_range.start).toLocaleString()} - ${new Date(report.time_range.end).toLocaleString()}`, 50, 140);

      doc.moveTo(50, 160).lineTo(doc.page.width - 50, 160).stroke('#EEEEEE');

      // Summary Stats Row
      doc.moveDown(4);
      const statsY = 180;
      
      // Box 1: Total Flows
      doc.rect(50, statsY, 120, 60).stroke('#EEEEEE');
      doc.fontSize(8).fillColor('#999999').text('TOTAL FLOWS', 60, statsY + 10);
      doc.fontSize(14).fillColor('#000000').font('Helvetica-Bold').text(report.summary.total_flows.toLocaleString(), 60, statsY + 25);

      // Box 2: Malicious
      doc.rect(180, statsY, 120, 60).stroke('#EEEEEE');
      doc.fontSize(8).fillColor('#999999').text('MALICIOUS FLOWS', 190, statsY + 10);
      doc.fontSize(14).fillColor('#FF0000').font('Helvetica-Bold').text(report.summary.malicious_count.toLocaleString(), 190, statsY + 25);

      // Box 3: Blocked
      doc.rect(310, statsY, 120, 60).stroke('#EEEEEE');
      doc.fontSize(8).fillColor('#999999').text('IPS BLOCKED', 320, statsY + 10);
      doc.fontSize(14).fillColor('#000000').font('Helvetica-Bold').text(report.summary.blocked_count.toLocaleString(), 320, statsY + 25);

      // Box 4: Top Attack
      doc.rect(440, statsY, 105, 60).stroke('#EEEEEE');
      doc.fontSize(8).fillColor('#999999').text('PRIMARY VECTOR', 450, statsY + 10);
      doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text(report.summary.top_attack_type || 'N/A', 450, statsY + 25);

      doc.moveDown(8);

      // --- MALICIOUS TREND GRAPH ---
      doc.moveDown(8);
      const graphY = 270;
      const graphHeight = 80;
      const graphWidth = doc.page.width - 100;
      
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('24-HOUR THREAT TREND', 50, graphY - 15);
      
      // Draw Axes
      doc.moveTo(50, graphY).lineTo(50, graphY + graphHeight).lineTo(50 + graphWidth, graphY + graphHeight).stroke('#CCCCCC');

      const timeline = report.summary.timeline || [];
      if (timeline.length > 1) {
        const maxVal = Math.max(...timeline.map(t => t.maliciousFlows || 0), 1);
        const stepX = graphWidth / (timeline.length - 1);
        
        doc.moveTo(50, graphY + graphHeight - ((timeline[0].maliciousFlows || 0) / maxVal) * graphHeight);
        
        timeline.forEach((point, idx) => {
          const x = 50 + (idx * stepX);
          const y = (graphY + graphHeight) - ((point.maliciousFlows || 0) / maxVal) * graphHeight;
          
          doc.lineTo(x, y);
          
          // Draw small dots at data points
          doc.circle(x, y, 1.5).fill('#000000');
          doc.moveTo(x, y); // Reset path for next line
        });
        
        doc.lineWidth(1.5).stroke('#000000');
        
        // Add Axis Labels
        doc.fontSize(6).fillColor('#999999');
        doc.text('MAX PEAK', 55, graphY, { width: 50 });
        doc.text('0 FLOWS', 55, graphY + graphHeight - 6, { width: 50 });
      } else {
        doc.fontSize(8).fillColor('#999999').text('INSUFFICIENT DATA FOR TREND ANALYSIS', 50, graphY + 30, { align: 'center', width: graphWidth });
      }

      // --- AI ANALYSIS SECTION ---
      doc.moveDown(10);
      const aiY = graphY + graphHeight + 40;

      doc.fillColor('#000000')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('ARTIFICIAL INTELLIGENCE ANALYSIS', 50, aiY);
      
      doc.rect(50, aiY + 20, 40, 2).fill('#000000');
      
      doc.moveDown(2);
      doc.fillColor('#333333')
         .fontSize(10)
         .font('Helvetica')
         .text(report.ai_analysis.raw_content, 50, aiY + 40, {
           align: 'justify',
           lineGap: 4,
           paragraphGap: 10
         });

      // Footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#999999')
           .fontSize(8)
           .text(`Page ${i + 1} of ${range.count} | Intelligent IDS Internal Security Document`, 50, doc.page.height - 50, { align: 'center' });
      }

      doc.end();
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
      const [totalFlows, maliciousFlows, blockedCount, attackBreakdown, timelineData] = await Promise.all([
        Flow.countDocuments({ timestamp: { $gte: startDate } }),
        Flow.find({ is_malicious: true, timestamp: { $gte: startDate } }),
        BlockedIP.countDocuments({ createdAt: { $gte: startDate } }),
        Flow.aggregate([
          { $match: { is_malicious: true, timestamp: { $gte: startDate } } },
          { $group: { _id: '$attack_type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Flow.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: {
              _id: { $dateToString: { format: "%Y-%m-%dT%H:00:00.000Z", date: "$timestamp" } },
              maliciousFlows: { $sum: { $cond: [{ $eq: ["$is_malicious", true] }, 1, 0] } }
            }
          },
          { $sort: { _id: 1 } }
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

        Please provide a professional Security Analysis Report in plain text format. Do not use complex markdown formatting like excessive bolding or tables.
        Include these sections:
        1. EXECUTIVE SUMMARY: A high-level overview.
        2. THREAT LANDSCAPE: Analysis of attack patterns.
        3. PATTERN RECOGNITION: Campaign identification.
        4. ACTIONABLE RECOMMENDATIONS: 3-5 specific steps.
        Keep it professional and technical.
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
          top_attack_type: topAttack,
          timeline: timelineData
        },
        ai_analysis: {
          raw_content: aiResponse
        },
        status: 'completed'
      });

      await report.save();
      console.log(`✅ AI Report generated and saved to DB: ${report._id}`);
      
      // Auto-save to filesystem
      try {
        const pdfBuffer = await this._renderPDFBuffer(report);
        await this._saveToDisk(report._id, pdfBuffer);
      } catch (fsError) {
        console.error('⚠️ Failed to save PDF to filesystem:', fsError.message);
      }
      
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
