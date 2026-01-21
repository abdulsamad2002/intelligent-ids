# 🌐 Guardian IDS - API Endpoints Documentation

This document provides a comprehensive guide to all available API endpoints and WebSocket events provided by the Guardian IDS Backend.

---

## 🔑 Authenticationw

Most endpoints require a **JSON Web Token (JWT)**.
- **Header**: `Authorization: Bearer <your_token>`

### User Auth Routes (`/api/auth`)
| Method | Endpoint | Description | Body Params |
|--------|----------|-------------|-------------|
| `POST` | `/login` | User login | `{ username, password }` |
| `GET` | `/me` | Get current user info | (None) |
| `POST` | `/setup` | Initial admin setup | `{ username, password }` |

---

## 🏥 System Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server uptime, DB status, and active client count |

---

## 📊 Security Dashboard Statistics (`/api/stats`)
| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/` | Comprehensive dashboard stats | `time_range` (1h, 6h, 24h, 7d, 30d) |
| `GET` | `/summary` | Quick 24h summary | (None) |

---

## 📡 Network Flow Management (`/api/flows`)
| Method | Endpoint | Description | Query Params / Body |
|--------|----------|-------------|---------------------|
| `GET` | `/` | List network flows | `malicious` (bool), `limit`, `skip`, `sort_by` |
| `GET` | `/:id` | Get single flow detail | `id` (flow_id) |
| `POST` | `/` | Submit new flow (IDS Engine) | `{ flow_data }` |

---

## 🚨 Alert Center (`/api/alerts`)
| Method | Endpoint | Description | Body Params |
|--------|----------|-------------|-------------|
| `GET` | `/` | List all security alerts | `status`, `severity_min`, `limit` |
| `PATCH` | `/:id/resolve` | Resolve an alert | `{ comment, user }` |
| `GET` | `/stats` | Alert status counts | (None) |

---

## 🚫 IP Block List (`/api/blocked`)
| Method | Endpoint | Description | Body Params |
|--------|----------|-------------|-------------|
| `GET` | `/` | List blocked IPs | `active` (bool), `limit` |
| `POST` | `/` | Manually block an IP | `{ ip_address, reason, duration_hours }` |
| `DELETE` | `/:ip` | Unblock an IP | (None) |
| `GET` | `/stats` | Blocked IP statistics | (None) |

---

## 📝 AI Security Reports (`/api/reports`)
| Method | Endpoint | Description | Body Params |
|--------|----------|-------------|-------------|
| `GET` | `/` | List generated reports | `limit` |
| `GET` | `/latest` | Get newest AI report | (None) |
| `POST` | `/generate` | Force generate new report | `{ time_range }` (24h, 7d) |

---

## 🛡️ Threat Intelligence (`/api/threat-intel`)
| Method | Endpoint | Description | Body Params |
|--------|----------|-------------|-------------|
| `GET` | `/check/:ip` | Check IP reputation | (None) |
| `GET` | `/stats` | Service quota stats | (None) |
| `POST` | `/clear-cache` | Clear local intel cache | (None) |

---

## 🔌 WebSocket Events (Real-time)

**URL**: `ws://localhost:3000`

### Incoming Events (Listen for these):
1.  **`new_attack`**: Triggered when a malicious flow is logged.
    - `Data`: Flow details including type, severity, and source IP.
2.  **`stats_update`**: Periodic dashboard data updates.
3.  **`ids_terminal_log`**: Real-time terminal output from the IDS Python engine.
    - `Data`: `{ message, level, timestamp }`
4.  **`connected`**: Receive welcome message and server timestamp on connection.

---

## 🛡️ IDS Engine Protection (Internal)
Endpoints marked for "IDS Engine" require an **API Key** instead of a JWT.
- **Header**: `X-IDS-Key`
- **Endpoints**: `POST /api/flows`, `POST /api/logs`
