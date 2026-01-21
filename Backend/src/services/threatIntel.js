const axios = require('axios');
const Flow = require('../models/Flow');

class ThreatIntelService {
  constructor() {
    this.apiKey = process.env.ABUSEIPDB_API_KEY;
    this.baseURL = 'https://api.abuseipdb.com/api/v2';
    this.cache = new Map(); // In-memory cache
    this.cacheTTL = 3600000; // 1 hour
    this.requestCount = 0;
    this.lastRequestTime = 0;
    
    console.log(`\n🔍 Threat Intelligence Service:`);
    console.log(`   Provider: AbuseIPDB`);
    console.log(`   API Key: ${this.apiKey ? '✓ Configured' : '✗ Not configured'}`);
  }

  async checkIP(ip) {
    if (!this.apiKey) {
      console.warn('⚠️  AbuseIPDB API key not configured');
      return null;
    }

    // Check cache first
    const cached = this.cache.get(ip);
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      console.log(`💾 Cache hit for IP: ${ip}`);
      return cached.data;
    }

    // Rate limiting (1 request/second)
    const now = Date.now();
    if (now - this.lastRequestTime < 1000) {
      const waitTime = 1000 - (now - this.lastRequestTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      this.lastRequestTime = Date.now();
      this.requestCount++;

      console.log(`🌐 Querying AbuseIPDB for: ${ip}`);

      const response = await axios.get(`${this.baseURL}/check`, {
        headers: {
          'Key': this.apiKey,
          'Accept': 'application/json'
        },
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: true
        },
        timeout: 5000
      });

      const data = response.data.data;

      const threatIntel = {
        checked: true,
        abuse_score: data.abuseConfidenceScore,
        is_known_malicious: data.abuseConfidenceScore > 50,
        reports_count: data.totalReports,
        last_reported: data.lastReportedAt,
        categories: data.reports?.map(r => r.categories).flat() || [],
        country_code: data.countryCode,
        usage_type: data.usageType,
        isp: data.isp,
        domain: data.domain,
        is_whitelisted: data.isWhitelisted,
        is_tor: data.isTor
      };

      // Cache result
      this.cache.set(ip, {
        data: threatIntel,
        timestamp: Date.now()
      });

      console.log(`✓ AbuseIPDB: ${ip} - Score: ${data.abuseConfidenceScore}/100`);

      return threatIntel;

    } catch (error) {
      if (error.response) {
        if (error.response.status === 429) {
          console.error('❌ AbuseIPDB rate limit exceeded');
        } else if (error.response.status === 422) {
          console.error(`❌ Invalid IP address: ${ip}`);
        } else {
          console.error(`❌ AbuseIPDB error: ${error.response.status}`);
        }
      } else {
        console.error(`❌ AbuseIPDB request failed: ${error.message}`);
      }
      return null;
    }
  }

  async enrichFlow(flowId) {
    try {
      const flow = await Flow.findOne({ flow_id: flowId });
      
      if (!flow) {
        console.log(`⚠️  Flow not found: ${flowId}`);
        return;
      }

      // Only check malicious flows to save API quota
      if (!flow.is_malicious) {
        return;
      }

      const threatIntel = await this.checkIP(flow.src_ip);

      if (threatIntel) {
        flow.threat_intel = threatIntel;
        await flow.save();
        
        console.log(`✓ Enriched flow ${flowId} with threat intel`);
        
        return threatIntel;
      }

    } catch (error) {
      console.error(`❌ Failed to enrich flow ${flowId}:`, error.message);
    }
  }

  async bulkCheck(ips) {
    // Note: Bulk endpoint requires paid plan
    // For free tier, check IPs one by one
    const results = {};
    
    for (const ip of ips) {
      const result = await this.checkIP(ip);
      if (result) {
        results[ip] = result;
      }
    }
    
    return results;
  }

  getStats() {
    return {
      total_requests: this.requestCount,
      cache_size: this.cache.size,
      api_configured: !!this.apiKey
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('✓ Threat intel cache cleared');
  }
}

module.exports = new ThreatIntelService();