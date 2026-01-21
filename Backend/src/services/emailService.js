const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.enabled = process.env.EMAIL_ENABLED === 'true';
    this.emailThreshold = parseFloat(process.env.EMAIL_ALERT_THRESHOLD || 9.0);
    
    if (this.enabled) {
      // Create transporter for Gmail (or other SMTP)
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      // Verify connection
      this.transporter.verify((error) => {
        if (error) {
          console.error('❌ Email service error:', error.message);
          this.enabled = false;
        } else {
          console.log('\n📧 Email Service:');
          console.log(`   Status: Enabled`);
          console.log(`   From: ${process.env.EMAIL_USER}`);
          console.log(`   Alert Threshold: ${this.emailThreshold}/10`);
        }
      });
    } else {
      console.log('\n📧 Email Service: Disabled');
    }

    // Track sent emails to prevent spam
    this.recentAlerts = new Map();
    this.cooldownPeriod = 300000; // 5 minutes
  }

  async sendCriticalAlert(flow) {
    if (!this.enabled) {
      return { success: false, message: 'Email service disabled' };
    }

    // Check if severity meets threshold
    if (flow.severity_score < this.emailThreshold) {
      return { success: false, message: 'Severity below threshold' };
    }

    // Check cooldown to prevent spam
    const lastAlert = this.recentAlerts.get(flow.src_ip);
    if (lastAlert && (Date.now() - lastAlert < this.cooldownPeriod)) {
      console.log(`⏳ Email cooldown active for IP: ${flow.src_ip}`);
      return { success: false, message: 'Cooldown active' };
    }

    try {
      const subject = `🚨 CRITICAL ALERT: ${flow.attack_type} Detected`;
      const html = this.generateAlertHTML(flow);

      const info = await this.transporter.sendMail({
        from: `"IDS Alert System" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_RECIPIENT || process.env.EMAIL_USER,
        subject: subject,
        html: html
      });

      // Update cooldown
      this.recentAlerts.set(flow.src_ip, Date.now());

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📧 CRITICAL ALERT EMAIL SENT`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   To: ${process.env.EMAIL_RECIPIENT || process.env.EMAIL_USER}`);
      console.log(`   Attack: ${flow.attack_type}`);
      console.log(`   Severity: ${flow.severity_score}/10`);
      console.log(`   Source IP: ${flow.src_ip}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`${'='.repeat(60)}\n`);

      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Failed to send email alert:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateAlertHTML(flow) {
    const timestamp = new Date(flow.timestamp).toLocaleString();
    const severityColor = flow.severity_score >= 9 ? '#d32f2f' : '#f57c00';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background-color: ${severityColor};
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .alert-box {
      background-color: #fff3e0;
      border-left: 4px solid ${severityColor};
      padding: 15px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-label {
      font-weight: bold;
      width: 150px;
      color: #555;
    }
    .detail-value {
      flex: 1;
      color: #333;
    }
    .severity-badge {
      display: inline-block;
      background-color: ${severityColor};
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
    }
    .footer {
      padding: 20px;
      text-align: center;
      background-color: #f5f5f5;
      color: #666;
      font-size: 12px;
    }
    .map-link {
      display: inline-block;
      margin-top: 10px;
      padding: 10px 20px;
      background-color: #2196f3;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 CRITICAL SECURITY ALERT</h1>
      <p>${flow.attack_type}</p>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <strong>⚠️ High-severity attack detected and requires immediate attention!</strong>
        <br><br>
        <span class="severity-badge">Severity: ${flow.severity_score}/10</span>
        <span class="severity-badge">Confidence: ${(flow.confidence * 100).toFixed(1)}%</span>
      </div>

      <h3>Attack Details</h3>
      
      <div class="detail-row">
        <div class="detail-label">Flow ID:</div>
        <div class="detail-value"><code>${flow.flow_id}</code></div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Timestamp:</div>
        <div class="detail-value">${timestamp}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Attack Type:</div>
        <div class="detail-value"><strong>${flow.attack_type}</strong></div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Recommended Action:</div>
        <div class="detail-value">${flow.recommended_action}</div>
      </div>

      <h3>Source Information</h3>
      
      <div class="detail-row">
        <div class="detail-label">Source IP:</div>
        <div class="detail-value"><strong style="color: #d32f2f;">${flow.src_ip}</strong></div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Location:</div>
        <div class="detail-value">
          ${flow.src_city || 'Unknown'}, ${flow.src_country_name || flow.src_country || 'Unknown'}
          ${flow.src_latitude && flow.src_longitude ? 
            `<br><a href="https://www.google.com/maps?q=${flow.src_latitude},${flow.src_longitude}" class="map-link" target="_blank">📍 View on Map</a>` 
            : ''}
        </div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Source Port:</div>
        <div class="detail-value">${flow.src_port || 'N/A'}</div>
      </div>

      <h3>Target Information</h3>
      
      <div class="detail-row">
        <div class="detail-label">Target IP:</div>
        <div class="detail-value">${flow.dst_ip}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Target Port:</div>
        <div class="detail-value">${flow.dst_port || 'N/A'}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Protocol:</div>
        <div class="detail-value">${flow.protocol || 'Unknown'}</div>
      </div>

      <h3>Traffic Statistics</h3>
      
      <div class="detail-row">
        <div class="detail-label">Total Packets:</div>
        <div class="detail-value">${flow.total_packets?.toLocaleString() || 'N/A'}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Total Bytes:</div>
        <div class="detail-value">${flow.total_bytes?.toLocaleString() || 'N/A'} bytes</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Duration:</div>
        <div class="detail-value">${flow.duration ? flow.duration.toFixed(2) + 's' : 'N/A'}</div>
      </div>

      ${flow.threat_intel?.checked ? `
      <h3>Threat Intelligence</h3>
      
      <div class="detail-row">
        <div class="detail-label">Abuse Score:</div>
        <div class="detail-value"><strong>${flow.threat_intel.abuse_score}/100</strong></div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">Reports Count:</div>
        <div class="detail-value">${flow.threat_intel.reports_count || 0}</div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label">ISP:</div>
        <div class="detail-value">${flow.threat_intel.isp || 'Unknown'}</div>
      </div>
      ` : ''}

      <div class="alert-box" style="margin-top: 30px;">
        <strong>📋 Next Steps:</strong>
        <ul>
          <li>Review the attack details above</li>
          <li>Check if the source IP has been auto-blocked</li>
          <li>Investigate related network traffic</li>
          <li>Update firewall rules if necessary</li>
          <li>Monitor for additional attacks from this source</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated alert from your Intrusion Detection System</p>
      <p>Generated at ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  async sendDailySummary(stats) {
    if (!this.enabled) {
      return { success: false, message: 'Email service disabled' };
    }

    try {
      const subject = `📊 Daily IDS Summary - ${new Date().toLocaleDateString()}`;
      const html = this.generateSummaryHTML(stats);

      const info = await this.transporter.sendMail({
        from: `"IDS Report System" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_RECIPIENT || process.env.EMAIL_USER,
        subject: subject,
        html: html
      });

      console.log(`📧 Daily summary email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Failed to send summary email:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateSummaryHTML(stats) {
    // Simple summary template (you can expand this)
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #333; }
    .stat-box { padding: 15px; margin: 10px 0; background: #f0f0f0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Daily Security Summary</h1>
    <p>Security overview for ${new Date().toLocaleDateString()}</p>
    
    <div class="stat-box">
      <strong>Total Attacks:</strong> ${stats.total_attacks || 0}
    </div>
    
    <div class="stat-box">
      <strong>Total Flows:</strong> ${stats.total_flows || 0}
    </div>
    
    <div class="stat-box">
      <strong>IPs Blocked:</strong> ${stats.blocked_ips || 0}
    </div>
    
    <p>Check your dashboard for more details.</p>
  </div>
</body>
</html>
    `;
  }

  getStats() {
    return {
      enabled: this.enabled,
      threshold: this.emailThreshold,
      recent_alerts: this.recentAlerts.size
    };
  }
}

module.exports = new EmailService();
