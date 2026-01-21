const BlockedIP = require('../models/BlockedIP');
const { broadcastStatsUpdate } = require('../websocket/socket');

class AutoBlockService {
  constructor() {
    this.enabled = process.env.AUTO_BLOCK_ENABLED === 'true';
    this.threshold = parseFloat(process.env.AUTO_BLOCK_THRESHOLD || 8.5);
    
    console.log(`\n🛡️  Auto-Block Service:`);
    console.log(`   Enabled: ${this.enabled}`);
    console.log(`   Threshold: ${this.threshold}/10`);
  }

  async shouldBlock(flow) {
    // Check if auto-blocking is enabled
    if (!this.enabled) {
      return false;
    }

    // Check if flow meets threshold
    if (!flow.is_malicious || flow.severity_score < this.threshold) {
      return false;
    }

    // Check if IP is already blocked
    const existing = await BlockedIP.findOne({ 
      ip_address: flow.src_ip, 
      is_active: true 
    });

    if (existing) {
      // Update existing block
      existing.attack_count += 1;
      existing.last_attack = new Date();
      existing.severity_score = Math.max(existing.severity_score, flow.severity_score);
      await existing.save();
      
      console.log(`⚠️  IP already blocked, updated: ${flow.src_ip} (attacks: ${existing.attack_count})`);
      return false; // Already blocked
    }

    return true; // Should block
  }

  async blockIP(flow, duration = null) {
    try {
      // Create block record
      const blockedIP = new BlockedIP({
        ip_address: flow.src_ip,
        reason: `Auto-blocked: ${flow.attack_type}`,
        attack_type: flow.attack_type,
        severity_score: flow.severity_score,
        flow_id: flow.flow_id,
        blocked_until: duration ? new Date(Date.now() + duration) : null,
        is_permanent: !duration,
        country: flow.src_country,
        country_name: flow.src_country_name,
        city: flow.src_city
      });

      await blockedIP.save();

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚫 IP BLOCKED AUTOMATICALLY`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   IP: ${flow.src_ip}`);
      console.log(`   Location: ${flow.src_city}, ${flow.src_country_name}`);
      console.log(`   Attack: ${flow.attack_type}`);
      console.log(`   Severity: ${flow.severity_score}/10`);
      console.log(`   Type: ${duration ? 'Temporary' : 'Permanent'}`);
      console.log(`${'='.repeat(60)}\n`);

      // Note: Actual firewall commands would go here
      // await this.executeFirewallBlock(flow.src_ip);

      return true;

    } catch (error) {
      if (error.code === 11000) {
        // Duplicate - already blocked
        return false;
      }
      console.error(`❌ Failed to block IP ${flow.src_ip}:`, error.message);
      return false;
    }
  }

  async unblockIP(ip) {
    try {
      const blockedIP = await BlockedIP.findOne({ 
        ip_address: ip, 
        is_active: true 
      });

      if (!blockedIP) {
        return { success: false, message: 'IP not found in blocked list' };
      }

      blockedIP.is_active = false;
      await blockedIP.save();

      console.log(`✅ IP unblocked: ${ip}`);

      // Note: Actual firewall removal would go here
      // await this.executeFirewallUnblock(ip);

      return { success: true, message: 'IP unblocked successfully' };

    } catch (error) {
      console.error(`❌ Failed to unblock IP ${ip}:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async checkExpiredBlocks() {
    try {
      const now = new Date();
      
      const expired = await BlockedIP.find({
        is_active: true,
        is_permanent: false,
        blocked_until: { $lte: now }
      });

      for (const block of expired) {
        await this.unblockIP(block.ip_address);
      }

      if (expired.length > 0) {
        console.log(`⏰ Auto-unblocked ${expired.length} expired IPs`);
      }

      return expired.length;

    } catch (error) {
      console.error('❌ Error checking expired blocks:', error.message);
      return 0;
    }
  }

  // Placeholder for actual firewall integration
  async executeFirewallBlock(ip) {
    // WARNING: These commands require root/sudo privileges
    // For production, use a separate service or API
    
    console.log(`   🔥 Firewall: Would execute block for ${ip}`);
    console.log(`   ⚠️  Note: Actual firewall commands disabled for safety`);
    
    // Examples of what you could do:
    // Linux iptables: sudo iptables -A INPUT -s ${ip} -j DROP
    // Windows firewall: netsh advfirewall firewall add rule name="Block ${ip}" dir=in action=block remoteip=${ip}
    // Cloud firewall API: await cloudProvider.blockIP(ip)
    
    return true;
  }

  async executeFirewallUnblock(ip) {
    console.log(`   🔥 Firewall: Would execute unblock for ${ip}`);
    return true;
  }
}

module.exports = new AutoBlockService();