# Quick Start Guide - Guardian IDS Dashboard

## 🚀 Quick Start (3 Steps)

### 1. Setup Admin User (One-time)
```bash
cd Backend
node setup-admin.js
```

### 2. Start Backend
```bash
cd Backend
npm start
```
**Backend URL**: http://localhost:3000

### 3. Start Dashboard
```bash
cd Dashboard
npm run dev
```
**Dashboard URL**: http://localhost:3002

## 🔑 Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Change password after first login!**

## 📡 Connection Status

✅ **Backend Connected**: Check WebSocket indicator (green = live)
✅ **Data Loading**: Dashboard shows real-time statistics
✅ **Auto-refresh**: Every 30 seconds

## 🎯 What You'll See

- **Total Attacks** - Count of malicious flows
- **Attack Rate** - Attacks per hour
- **Threat Level** - Average severity (0-10)
- **Attack Timeline** - Visual chart of attacks over time
- **Top Countries** - Geographic attack sources
- **Top IPs** - Most active attacking IPs
- **Live Stream** - Real-time attack feed

## 🔧 Troubleshooting

### Can't login?
- Ensure backend is running on port 3000
- Check MongoDB is connected
- Verify admin user was created

### No data showing?
- Check backend has data in MongoDB
- Verify authentication token is valid
- Check browser console for errors

### WebSocket offline?
- Restart backend server
- Check firewall settings
- Verify port 3000 is accessible

## 📚 More Info

- Full setup guide: `SETUP.md`
- Integration details: `INTEGRATION_SUMMARY.md`
- Backend docs: `../Backend/README.md`
