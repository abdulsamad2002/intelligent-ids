# Guardian IDS - Docker Deployment Guide

This project consists of two main components:
1.  **Backend**: A Node.js Express API that handles flow storage, AI reporting, and real-time alerts.
2.  **IDS Engine**: A Python-based intrusion detection system that sniffs network traffic and classifies it using Machine Learning.

## 🐳 Running with Docker

### Prerequisites
- Docker and Docker Compose installed.
- Elevated privileges (required for the IDS engine to sniff packets).

### 1. Configure Environment
Ensure you have a `.env` file in the `Backend/` directory with the necessary API keys and MongoDB URI.

### 2. Build and Start
Run the following command in the root directory:

```bash
docker compose up --build
```

### 3. Important Considerations
- **Network Mode**: The `ids-engine` service uses `network_mode: "host"`. This is required to allow the container to access the host's network interfaces for packet sniffing.
- **Privileges**: The `ids-engine` runs with `privileged: true` to allow low-level networking operations.
- **Backend URL**: The IDS engine is configured to communicate with the backend at `http://localhost:3000` because they share the host network space (or the backend is port-forwarded to the host).

## 📂 Project Structure
- `Backend/`: Node.js server source and Dockerfile.
- `IDS/`: Python IDS engine source, ML models, and Dockerfile.
- `docker-compose.yml`: Orchestration for both services.
