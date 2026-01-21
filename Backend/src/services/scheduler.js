const cron = require('node-cron');
const autoBlockService = require('./autoBlock');
const aiReportService = require('./aiReports');
const Flow = require('../models/Flow');
const BlockedIP = require('../models/BlockedIP');
const emailService = require('./emailService');

class SchedulerService {
  init() {
    console.log('\n⏰ Scheduler Service: Initialized');

    // 1. Check for expired IP blocks every hour
    // Runs at minute 0 of every hour
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running Task: Check Expired Blocks...');
      await autoBlockService.checkExpiredBlocks();
    });

    // 2. Generate Daily AI Summary at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('⏰ Running Task: Generating Daily AI Security Report...');
      try {
        const stats = {
          total_attacks: await Flow.countDocuments({ 
            is_malicious: true, 
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
          }),
          total_flows: await Flow.countDocuments({
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }),
          blocked_ips: await BlockedIP.countDocuments({ is_active: true })
        };

        // Generate the report
        await aiReportService.generateReport('24h');
        
        // Send email summary if enabled
        await emailService.sendDailySummary(stats);
        
        console.log('✅ Daily AI Report generation complete.');
      } catch (error) {
        console.error('❌ Failed to generate scheduled daily report:', error.message);
      }
    });

    // 3. System Health Check Log every 6 hours
    cron.schedule('0 */6 * * *', () => {
      const uptime = Math.floor(process.uptime() / 3600);
      console.log(`⏰ System Health: Server has been running for ${uptime} hours.`);
    });
  }
}

module.exports = new SchedulerService();
