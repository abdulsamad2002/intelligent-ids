# API Response Templates

This document defines the response structures (JSON objects) that the backend provides to the frontend. All responses follow a unified envelope pattern.

## 1. Global Response Envelope

All API endpoints wrap their payload in a standard success/data envelope.

### Success Response
```json
{
  "success": true,
  "data": { ... }, // Main payload (object or array)
  "pagination": {  // Included in list-based endpoints
    "total": 1250,
    "count": 50,
    "limit": 50,
    "skip": 0,
    "pages": 25
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Short error code or description",
  "message": "Detailed diagnostic message (optional)"
}
```

---

## 2. Authentication (`/api/auth`)

### Login (`POST /login`)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65af3...",
      "username": "admin",
      "role": "admin"
    },
    "token": "eyJhbG..." // JWT Bearer Token
  }
}
```

### User Profile (`GET /me`)
```json
{
  "success": true,
  "data": {
    "id": "65af3...",
    "username": "admin",
    "role": "admin",
    "last_login": "2024-03-21T10:00:00.000Z"
  }
}
```

---

## 3. Dashboard Statistics (`/api/stats`)

### Main Dashboard Data (`GET /`)
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_attacks": 450,
      "total_flows": 12000,
      "benign_flows": 11550,
      "attack_rate": 18.5,
      "avg_threat_level": 7.2,
      "threat_level": "HIGH",
      "time_range": "24h",
      "start_date": "2024-03-20T00:00:00.000Z",
      "end_date": "2024-03-21T00:00:00.000Z"
    },
    "attack_type_breakdown": [
      { "_id": "DDoS", "count": 150 },
      { "_id": "Brute Force", "count": 85 }
    ],
    "top_countries": [
      { "_id": "US", "country_name": "United States", "count": 120 }
    ],
    "top_ips": [
      { 
        "_id": "1.2.3.4", 
        "country": "US", 
        "city": "Boston", 
        "count": 45, 
        "avgSeverity": 8.5 
      }
    ],
    "timeline": [
      { "_id": "2024-03-21 14:00", "count": 12 }
    ],
    "recent_attacks": [
      {
        "flow_id": "f_123",
        "timestamp": "2024-03-21T14:30:00.000Z",
        "src_ip": "1.2.3.4",
        "attack_type": "SQL Injection",
        "severity_score": 9.2
      }
    ]
  }
}
```

---

## 4. Security Alerts (`/api/alerts`)

### List Alerts (`GET /`)
```json
{
  "success": true,
  "data": [
    {
      "_id": "65af...",
      "flow_id": "f_abc123",
      "timestamp": "2024-03-21T15:00:00.000Z",
      "attack_type": "DDoS",
      "severity_score": 8.5,
      "src_ip": "1.2.3.4",
      "dst_ip": "10.0.0.1",
      "status": "new", // 'new', 'investigating', 'resolved', 'false_positive'
      "is_blocked": true,
      "resolution": {
        "comment": "IP automatically blocked",
        "resolved_at": "2024-03-21T15:05:00.000Z",
        "resolved_by": "system"
      }
    }
  ],
  "pagination": { "total": 1, "limit": 50, "skip": 0 }
}
```

---

## 5. Network Flows (`/api/flows`)

### List Flows (`GET /`)
Contains raw flow details including feature extraction data.
```json
{
  "success": true,
  "data": [
    {
      "flow_id": "f_123",
      "timestamp": "2024-03-21...",
      "src_ip": "192.168.1.10",
      "dst_ip": "8.8.8.8",
      "src_port": 44321,
      "dst_port": 53,
      "protocol": 17,
      "is_malicious": false,
      "attack_type": "Benign",
      "confidence": 0.99,
      "severity_score": 0.1,
      "src_country": "US",
      "src_city": "Los Angeles"
    }
  ],
  "pagination": { "total": 1000, "count": 100, "limit": 100, "skip": 0, "pages": 10 }
}
```

---

## 6. Blocking Management (`/api/blocked`)

### List Blocked IPs (`GET /`)
```json
{
  "success": true,
  "data": [
    {
      "_id": "64bc...",
      "ip_address": "5.6.7.8",
      "reason": "Repeated SQL Injection attempts",
      "blocked_at": "2024-03-21T12:00:00.000Z",
      "blocked_until": "2024-03-22T12:00:00.000Z", // null if permanent
      "is_active": true,
      "is_permanent": false,
      "blocked_by": "auto" // 'auto' or 'manual'
    }
  ]
}
```

---

## 7. Threat Intelligence (`/api/threat-intel`)

### IP Reputation Check (`GET /check/:ip`)
```json
{
  "success": true,
  "ip": "1.1.1.1",
  "data": {
    "is_malicious": true,
    "reputation_score": 88,
    "threat_types": ["malware", "botnet"],
    "last_seen": "2024-03-21T00:00:00.000Z",
    "provider": "AbuseIPDB/VirusTotal"
  }
}
```
