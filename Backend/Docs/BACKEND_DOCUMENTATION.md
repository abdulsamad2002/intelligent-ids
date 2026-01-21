# 🛡️ Guardian IDS - Backend Documentation

Welcome to the official documentation for the **Guardian IDS Backend**. This document provides an extensive overview of the system architecture, its internal workings, data models, and API specifications.

---

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Core Technologies](#core-technologies)
3. [Internal Workflows](#internal-workflows)
4. [Database Models](#database-models)
5. [Authentication & Security](#authentication--security)
7. [API Reference (Detailed)](./API_REFERENCE.md)
8. [WebSocket Protocol](#websocket-protocol)
9. [Frontend Log Integration](./FRONTEND_TERMINAL_GUIDE.md)
10. [Configuration (.env)](#configuration-env)
11. [Setup & Development](#setup--development)

---

## 🏗️ System Architecture

The Guardian IDS Backend is designed as a **Modular real-time security pipeline**. It doesn't just store data; it actively processes network flows to defend the infrastructure.

### The Pipeline Flow:
1. **Collector**: The Python IDS engine sends a network flow (POST /api/flows).
2. **Validator**: Middleware ensures the data is clean and mandatory fields are present.
3. **Storage**: The flow is saved to MongoDB.
4. **Decision Engine**: 
   - If malicious:
     - **Persistence**: Create an Alert record.
     - **Real-time**: Emit WebSocket event to all connected dashboards.
     - **Defense**: Interface with the Auto-Block service to evaluate if the IP should be banned.
     - **Intelligence**: Trigger an asynchronous enrichment check with AbuseIPDB.
     - **Notification**: Send a critical alert email if the severity exceeds the threshold.
5. **Automation**: A background scheduler clears expired bans and generates daily AI summaries.

---

## 💻 Core Technologies

| Technology | Purpose |
|------------|---------|
| **Node.js / Express** | Core server framework |
| **MongoDB / Mongoose** | Persistent storage for flows, alerts, and reports |
| **Socket.io** | Real-time bidirectional communication |
| **Groq (Llama 3)** | AI inference for security trend analysis |
| **Winston** | Industrial-grade structured logging |
| **Node-Cron** | Automated task scheduling |
| **Nodemailer** | SMTP alert delivery |

---

## 🔄 Internal Workflows

### 1. The Malicious Flow Pipeline
When a flow marked `is_malicious: true` arrives:
- **Alert Creation**: A new record is added to the `Alerts` collection with status `new`.
- **WebSocket Broadcast**: A `new_attack` event is emitted. The frontend uses this to play sounds or show popups instantly.
- **Auto-Blocking**: The `autoBlockService` checks if `severity >= AUTO_BLOCK_THRESHOLD`. If true, it saves the IP to the `BlockedIP` collection and executes a firewall command (placeholder).
- **Threat Intel Enrichment**: The system calls the AbuseIPDB API. It caches the results for 1 hour to save API quota.

### 2. AI Intelligence Reports
Triggered manually (API) or automatically (9:00 AM daily):
- The `aiReportService` queries the last 24 hours of malicious traffic.
- It aggregates stats: Top attack types, top malicious IPs, and total volume.
- It sends this data to the **Groq API** with a "Security Analyst" persona prompt.
- The AI generates a Markdown report with an Executive Summary, Threat Landscape analysis, and Recommendations.

---

## 🗄️ Database Models

### 📡 Flow (`models/Flow.js`)
Stores every network packet analysis received from the IDS.
- `flow_id`: Unique identifier from the tracker.
- `src_ip / dst_ip`: Network endpoints.
- `threat_intel`: Enriched data object (Abuse score, ISP, Country).

### 🚨 Alert (`models/Alert.js`)
Tracking for SOC (Security Operations Center) management.
- `status`: ['new', 'investigating', 'resolved', 'false_positive'].

### 🚫 BlockedIP (`models/BlockedIP.js`)
Active ban list.

---

## 🔐 Authentication & Security

The project implements a multi-layered security architecture:

### 1. Human Analyst Layer (JWT)
Used for the dashboard and administrative tasks.
- **Protocol**: JSON Web Token (JWT)
- **Token Location**: `Authorization: Bearer <token>`
- **Expiration**: 24 hours

### 2. Machine-to-Machine Layer (API Key)
Used specifically for the IDS engine (Python script).
- **Header**: `X-IDS-Key`
- **Validation**: Strict equality check against `IDS_API_KEY` in `.env`.

---

## 🚀 API Reference

### 🏥 System Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns server status, uptime, DB connection, and WS client count. |

### 📊 Flow Management
| Method | Path | Description | Protection |
|--------|------|-------------|------------|
| `POST` | `/api/flows` | Submit a network flow | **API Key** |
| `POST` | `/api/logs` | Stream IDS terminal logs | **API Key** |
| `GET` | `/api/flows` | List flows with filtering | **JWT** |
| `GET` | `/api/flows/:id` | Get detail for one flow | **JWT** |

### 🛡️ Threat Intelligence
| Method | Path | Description | Protection |
|--------|------|-------------|------------|
| `GET` | `/api/threat-intel/check/:ip` | Manual reputation lookup | **JWT** |

### 🚫 Block List Management
| Method | Path | Description | Protection |
|--------|------|-------------|------------|
| `GET` | `/api/blocked` | List active bans | **JWT** |
| `POST` | `/api/blocked` | Manually ban an IP | **JWT** |

### 🚨 Alert Center
| Method | Path | Description | Protection |
|--------|------|-------------|------------|
| `GET` | `/api/alerts` | List all attack alerts | **JWT** |

### 📝 AI Reports
| Method | Path | Description | Protection |
|--------|------|-------------|------------|
| `POST` | `/api/reports/generate` | Trigger AI Analysis | **JWT** |

---

## 🔌 WebSocket Protocol

**URL:** `ws://your-server-ip:3000`

### Outgoing Events (Server to Client):
- `new_attack`: Published when a malicious flow is detected.
- `stats_update`: Published periodically with system stats.
- `ids_terminal_log`: Published when the Python IDS engine sends a terminal log message.
    - Payload: `{ message: string, level: string, timestamp: string }`

---

## 🔧 Configuration (.env)

Check `SECURITY_SETUP.md` for detailed instructions on setting up your API keys and first accounts.

---

## 🛠️ Setup & Development

### Installation
```bash
npm install
```

### Running in Development
```bash
npm run dev
```

---

*Document Generated on: 2026-01-20*
*Version: 2.2.0 (JWT-Integrated)*
