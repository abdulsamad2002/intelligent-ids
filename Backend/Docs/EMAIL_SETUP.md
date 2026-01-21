# 📧 Email Alert Service Setup Guide

## Overview
The IDS Backend now includes an email alert service that automatically sends notifications when high-severity attacks are detected.

## Features
- ✅ **Beautiful HTML Email Templates** with attack details
- ✅ **Severity Threshold** - Only sends emails for attacks above threshold (default: 9.0/10)
- ✅ **Cooldown Period** - Prevents email spam (5-minute cooldown per IP)
- ✅ **Detailed Attack Information** including geolocation, threat intel, and traffic stats
- ✅ **Daily Summary Emails** (optional)

---

## Setup Instructions

### 1️⃣ **Gmail App Password** (Most Common)

If using Gmail, you **MUST** use an App Password (not your regular password):

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** in the left menu
3. Enable **2-Step Verification** if not already enabled
4. Search for **"App Passwords"**
5. Generate a new app password for "Mail"
6. Copy the 16-character password

### 2️⃣ **Update .env File**

Edit your `.env` file:

```env
# Email Alerts
EMAIL_ENABLED=true  # ⚠️ Set to true to enable
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # 16-char App Password from Gmail
EMAIL_RECIPIENT=admin@example.com  # Who receives the alerts
EMAIL_ALERT_THRESHOLD=9.0  # Only send emails for severity >= 9.0
```

### 3️⃣ **Using Other Email Providers**

#### **Outlook/Office 365**
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### **Yahoo Mail**
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password  # Yahoo also requires app password
```

#### **Custom SMTP**
```env
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_USER=alerts@yourdomain.com
EMAIL_PASSWORD=your-password
```

### 4️⃣ **Restart the Server**

```bash
npm run dev
```

You should see:
```
📧 Email Service:
   Status: Enabled
   From: your-email@gmail.com
   Alert Threshold: 9.0/10
```

---

## What Triggers an Email?

An email is sent when **ALL** of these conditions are met:

1. ✅ `EMAIL_ENABLED=true` in `.env`
2. ✅ Attack is malicious (`is_malicious: true`)
3. ✅ Severity score >= threshold (default 9.0)
4. ✅ No recent alert for this IP (5-minute cooldown)

---

## Email Content

The email includes:

### **Header**
- 🚨 Alert type and attack name
- Severity and confidence badges

### **Attack Details**
- Flow ID, timestamp, attack type
- Recommended action

### **Source Information**
- Attacker's IP address
- Geographic location (city, country)
- Interactive map link
- Source port

### **Target Information**
- Your server's IP and port
- Protocol used

### **Traffic Statistics**
- Total packets and bytes
- Attack duration
- Packet/byte rates

### **Threat Intelligence** (if available)
- AbuseIPDB score
- Number of reports
- ISP information

### **Next Steps Checklist**
- Actionable items to respond to the attack

---

## Testing

### Test Email Configuration

Create a test endpoint in `server.js`:

```javascript
// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  const testFlow = {
    flow_id: 'test_001',
    timestamp: new Date(),
    attack_type: 'Test Attack',
    confidence: 0.95,
    severity_score: 9.5,
    recommended_action: 'block',
    src_ip: '192.168.1.100',
    src_city: 'Test City',
    src_country: 'US',
    src_country_name: 'United States',
    dst_ip: '10.0.0.1',
    dst_port: 80,
    protocol: 'TCP',
    total_packets: 1000,
    total_bytes: 500000,
    duration: 30.5
  };
  
  const result = await require('./services/emailService').sendCriticalAlert(testFlow);
  res.json(result);
});
```

Then visit: `http://localhost:3000/api/test-email`

---

## Troubleshooting

### ❌ "Email service error: Invalid login"

**Solution:** Make sure you're using an **App Password**, not your regular Gmail password.

### ❌ "Connection timeout"

**Solution:** 
- Check your firewall allows outbound SMTP connections
- Try port `465` with `secure: true` instead of port `587`

### ❌ "Email service disabled"

**Solution:** Set `EMAIL_ENABLED=true` in your `.env` file

### ❌ Not receiving emails

**Check:**
1. Email is enabled: `EMAIL_ENABLED=true`
2. Attack severity >= threshold
3. No cooldown active (wait 5 minutes between attacks from same IP)
4. Check spam folder
5. Verify `EMAIL_RECIPIENT` is correct

---

## Advanced Configuration

### Change Cooldown Period

Edit `src/services/emailService.js`:

```javascript
this.cooldownPeriod = 600000; // 10 minutes instead of 5
```

### Change Email Threshold

In `.env`:
```env
EMAIL_ALERT_THRESHOLD=8.0  # Lower threshold = more emails
```

### Disable Email for Specific Attack Types

Edit the service to filter by `attack_type`:

```javascript
async sendCriticalAlert(flow) {
  // Skip certain attack types
  if (flow.attack_type === 'Port Scan') {
    return { success: false, message: 'Attack type filtered' };
  }
  // ... rest of code
}
```

---

## Daily Summary Emails

To enable daily summary emails, add to `src/server.js`:

```javascript
const emailService = require('./services/emailService');
const cron = require('node-cron');

// Schedule daily summary at 9 AM
cron.schedule('0 9 * * *', async () => {
  const stats = {
    total_attacks: await Flow.countDocuments({ is_malicious: true }),
    total_flows: await Flow.countDocuments(),
    blocked_ips: await BlockedIP.countDocuments({ is_active: true })
  };
  
  await emailService.sendDailySummary(stats);
});
```

---

## Security Best Practices

1. ✅ **Never commit `.env` to Git** (it's in `.gitignore`)
2. ✅ **Use App Passwords**, not account passwords
3. ✅ **Limit recipient list** to authorized personnel only
4. ✅ **Use TLS/SSL** for SMTP connections
5. ✅ **Monitor email quota** to avoid hitting provider limits
6. ✅ **Set appropriate threshold** to avoid alert fatigue

---

## Example Email Preview

When an attack with severity 9.5 is detected, you'll receive:

![Email Preview](https://via.placeholder.com/600x800/d32f2f/ffffff?text=Critical+Security+Alert)

- **Subject:** 🚨 CRITICAL ALERT: DDoS Attack Detected
- **From:** IDS Alert System
- **Priority:** High

---

## Support

For issues or questions:
1. Check the console output for email service status
2. Verify SMTP credentials are correct
3. Test with `/api/test-email` endpoint
4. Check provider's SMTP documentation

---

**That's it! Your IDS will now send beautiful email alerts for critical attacks!** 📧🎉
