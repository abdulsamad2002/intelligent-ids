# Guardian IDS - Port Configuration

## 🔌 Port Allocation

Each component of the Guardian IDS system runs on a different port to avoid conflicts:

### **Backend (Node.js/Express)**
- **Port**: `3000`
- **Service**: REST API + WebSocket Server
- **URL**: `http://localhost:3000`
- **Configuration**: `Backend/.env` → `PORT=3000`
- **Endpoints**:
  - `/api/flows` - Receive flow data from IDS engine
  - `/api/stats` - Dashboard statistics
  - `/api/auth/login` - User authentication
  - `/api/alerts` - Alert management
  - `/api/blocked` - Blocked IPs
  - WebSocket for real-time updates

### **Dashboard (Next.js Frontend)**
- **Port**: `3002` (previously `3001`)
- **Service**: Web UI for monitoring
- **URL**: `http://localhost:3002`
- **Configuration**: `Dashboard/package.json` → `"dev": "next dev -p 3002"`
- **Features**:
  - Login page
  - Real-time dashboard
  - Attack visualization
  - Statistics and reports

### **IDS Python Engine**
- **Port**: None (no web server)
- **Service**: Network traffic analysis
- **Communication**: HTTP POST to Backend
- **Sends data to**: `http://localhost:3000/api/flows`

---

## 📊 Data Flow

```
┌─────────────────────┐
│  IDS Python Engine  │
│  (No web server)    │
└──────────┬──────────┘
           │ POST /api/flows
           │ (with X-IDS-Key header)
           ↓
┌─────────────────────┐
│   Backend Server    │
│   Port: 3000        │
│   - REST API        │
│   - WebSocket       │
│   - MongoDB         │
└──────────┬──────────┘
           │ WebSocket broadcast
           │ (new_attack events)
           ↓
┌─────────────────────┐
│  Dashboard (Next.js)│
│   Port: 3002        │
│   - Login UI        │
│   - Real-time data  │
└─────────────────────┘
```

---

## 🚀 Starting All Services

### 1. Start Backend (Port 3000)
```bash
cd Backend
npm start
```
**Check**: Visit `http://localhost:3000/health`

### 2. Start Dashboard (Port 3002)
```bash
cd Dashboard
npm run dev
```
**Check**: Visit `http://localhost:3002`

### 3. Run IDS Engine (No port)
```bash
cd IDS
python ids_core/detector.py
```
**Check**: Look for console output showing packet analysis

---

## ⚠️ Port Conflicts

If you see `EADDRINUSE` errors:

### Backend (Port 3000)
```powershell
# Find and kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Dashboard (Port 3002)
```powershell
# Find and kill process on port 3002
Get-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess | Stop-Process -Force
```

---

## 🔧 Changing Ports

### Backend
Edit `Backend/.env`:
```env
PORT=3000  # Change to desired port
```

### Dashboard
Edit `Dashboard/package.json`:
```json
"scripts": {
  "dev": "next dev -p 3002"  // Change to desired port
}
```

**Important**: If you change the backend port, update `Dashboard/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:YOUR_NEW_PORT
NEXT_PUBLIC_WS_URL=http://localhost:YOUR_NEW_PORT
```

---

## 📝 Summary

| Component | Port | Purpose | URL |
|-----------|------|---------|-----|
| Backend | 3000 | API + WebSocket | http://localhost:3000 |
| Dashboard | 3002 | Web UI | http://localhost:3002 |
| IDS Engine | - | Traffic Analysis | Sends to Backend |

**All three components must be running simultaneously for the system to work properly.**
