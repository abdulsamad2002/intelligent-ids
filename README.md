# Guardian IDS 🛡️

**Advanced Intrusion Detection System & Real-Time Monitoring Platform**

Guardian IDS is a high-performance network security platform designed to detect, analyze, and visualize cyber threats in real-time. It combines a powerful Python-based detection engine with a modern web-based dashboard and a robust Node.js backend.

---

## 🏗️ Architecture

- **Dashboard (Next.js)**: High-fidelity React interface with real-time telemetry, interactive bar charts for attack timelines, and live threat streams.
- **Backend (Node.js/Express)**: Core API handling data persistence, authentication, and real-time communication via Socket.IO.
- **IDS Engine (Python)**: Intelligent packet inspection engine that performs feature extraction and threat classification.

## ✨ Key Features

- **Real-Time Visualization**: Dynamic Attack Timeline and classification charts.
- **Live Activity Stream**: Instant visibility into network flows and identified malicious activity.
- **Threat Intelligence**: Integrated IP intelligence and automated blocking mechanisms.
- **Premium UI**: Sleek dark-mode interface with custom animations and optimized navigation.

## 🚀 Quick Start

### 1. Backend Server

```bash
cd Backend
npm install
npm run dev
```

_Runs on port 3000_

### 2. Dashboard Interface

```bash
cd Dashboard
npm install
npm run dev
```

_Runs on port 3001_

### 3. IDS Engine

```bash
cd IDS
pip install -r requirements.txt
python ids.py
```

## 🛤️ Port Configuration

| Component     | Port  | Description            |
| :------------ | :---- | :--------------------- |
| **Backend**   | 3000  | API & WebSocket Server |
| **Dashboard** | 3001  | Next.js Web Interface  |
| **Database**  | 27017 | MongoDB (Local/Docker) |

---

**Build with Performance & Security in mind.**
