# Running Intelligent IDS with Docker

This guide explains how to set up and run the Intelligent IDS project using Docker Compose.

## Prerequisites

1.  **Docker Desktop**: Installed and running on your machine.
2.  **WSL2 (Windows only)**: Ensure Docker is configured to use the WSL2 backend.
3.  **Permissions**: Packet capture (IDS Engine) requires administrative/privileged access.

## Quick Start

1.  **Build and Start the Services**:
    In the project root directory, run:
    ```bash
    docker compose up --build
    ```

2.  **Access the Dashboard**:
    Open your browser and navigate to:
    [http://localhost:3001](http://localhost:3001)

3.  **Backend API**:
    The backend is available at:
    [http://localhost:3000](http://localhost:3000)

## Service Overview

-   **Backend**: Node.js API that manages flows, data, and logic.
-   **Dashboard**: Next.js frontend for visualization and management.
-   **IDS Engine**: Python-based packet sniffer and AI classifier.
-   **MongoDB**: Persistent database for storing all IDS data.

## Important Note for Windows Users (Packet Sniffing)

The `ids-engine` container uses `network_mode: "host"` to capture network traffic. 

> [!WARNING]
> On Windows, Docker Desktop runs inside a lightweight VM. Using `host` networking mode will capture traffic from the **WSL2 virtual network**, not necessarily your physical WiFi or Ethernet adapter.

### To capture real system traffic on Windows:
If the Docker container doesn't see your external traffic, it is recommended to run the IDS engine natively while keeping the rest in Docker:

1.  Keep Backend, Dashboard, and MongoDB running in Docker.
2.  Install Python dependencies on your host:
    ```bash
    cd IDS
    pip install -r requirements.txt
    ```
3.  Run the engine:
    ```bash
    python ids.py -m models/rf_attack_model.pkl -f models/selected_features.pkl -e models/label_encoder.pkl
    ```

## Customization

If you want to use external services (like Groq for AI reports or AbuseIPDB), copy `Backend/.env.example` to `Backend/.env` and fill in your API keys before running `docker compose up`.
