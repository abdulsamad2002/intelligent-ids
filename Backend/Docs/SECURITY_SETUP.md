# 🔐 Guardian IDS - Security & Authentication

This project implements a multi-layered security architecture to protect the backend from unauthorized access.

## 🛡️ Authentication Layers

### 1. **Human Analyst Layer (JWT)**
Used for the dashboard and administrative tasks.
- **Protocol**: JSON Web Token (JWT)
- **Token Location**: `Authorization: Bearer <token>`
- **Expiration**: 24 hours
- **Roles**:
  - `admin`: Full access (Reset system, delete data).
  - `analyst`: Read-only + alert resolution.

### 2. **Machine-to-Machine Layer (API Key)**
Used specifically for the IDS engine (Python script) to submit network flows.
- **Header**: `X-IDS-Key`
- **Validation**: Strict equality check against `IDS_API_KEY` in `.env`.

---

## 🚀 Getting Started with Auth

### 1. Initial System Setup
When you first start the backend, it has no users. You must create the first admin user:
- **Endpoint**: `POST /api/auth/setup`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "your_secure_password"
  }
  ```
- *Note: This endpoint only works if the User collection is empty.*

### 2. Logging In
- **Endpoint**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "your_secure_password"
  }
  ```
- **Response**: Returns a `token` and user details.

---

## 🔒 Protected Routes

| Endpoint | Protection Type | Requirement |
|----------|-----------------|-------------|
| `POST /api/flows` | **API Key** | `X-IDS-Key` header |
| `GET /api/flows` | **JWT** | Valid Bearer Token |
| `GET /api/stats` | **JWT** | Valid Bearer Token |
| `ALL /api/blocked` | **JWT** | Valid Bearer Token |
| `ALL /api/reports` | **JWT** | Valid Bearer Token |
| `ALL /api/alerts` | **JWT** | Valid Bearer Token |

---

## 🔧 Technical Implementation

- **Library**: `jsonwebtoken` for signing/verification.
- **Hashing**: `bcryptjs` for one-way password hashing (salt rounds: 10).
- **Middleware**: 
  - `auth.js`: Verifies JWT and injects `req.user`.
  - `idsAuth`: Verifies the machine API key.

## ⚠️ Security Checklist for FYP Viva
1. Mention that passwords are **hashed** with Bcrypt and never stored in plain text.
2. Highlight that the IDS engine uses a separate **API Key** so it doesn't need to "login" like a human.
3. Explain that JWT tokens are **stateless** and expire automatically, reducing risk if intercepted.
