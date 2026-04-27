# 🛡️ Intelligent IDS

An advanced, real-time Intrusion Detection System (IDS) powered by Deep Learning. This system monitors network traffic, extracts complex flow features, and utilizes a **Deep Autoencoder** to identify anomalous behavior and potential security threats with high precision.

![Dashboard Preview](https://via.placeholder.com/1200x600?text=Intelligent+IDS+Dashboard+Preview)

## 🚀 Overview

Intelligent IDS is a full-stack security solution designed for modern SOC (Security Operations Center) environments. It goes beyond simple signature matching by learning the "baseline" of your network and flagging deviations using reconstruction error analysis.

### 🧩 Key Components

- **Core IDS (`/IDS`)**: A Python-based engine that captures live traffic, performs feature engineering (81 features per flow), and runs real-time inference using a Keras-based Autoencoder.
- **Security Backend (`/Backend`)**: A robust Node.js API that handles alert persistence in MongoDB, manages IP blacklists, and broadcasts real-time updates via WebSockets.
- **SOC Dashboard (`/Dashboard`)**: A high-performance Next.js frontend featuring:
    - **Real-time Threat Timeline**: Visualizing attack density.
    - **3D Threat Map**: Global visualization of attack origins.
    - **AI Security Reports**: Automated analysis of detected incidents.
    - **Dynamic Theme System**: Sleek Dark and Light modes.

## 🛠️ Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Model** | TensorFlow/Keras (Deep Autoencoder) |
| **Capture** | Scapy, Pandas, Numpy |
| **Backend** | Node.js, Express, MongoDB, Socket.io |
| **Frontend** | Next.js 15+, Tailwind CSS 4, Lucide Icons |
| **Visualization** | Globe.gl, Chart.js |

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB (Running locally or via Atlas)
- Npcap (for Windows packet capture)

### 1. IDS Engine Setup
```bash
cd IDS
pip install -r requirements.txt
python ids.py -i "Your-Interface-Name"
```

### 2. Backend Setup
```bash
cd Backend
npm install
# Create a .env file with your MONGO_URI and GEMINI_API_KEY
npm run dev
```

### 3. Dashboard Setup
```bash
cd Dashboard
npm install
npm run dev # Runs on http://localhost:3001
```

## 🧠 Detection Logic
The system uses a **Deep Autoencoder** architecture. During the inference phase:
1. Network flows are normalized to an 81-feature vector.
2. The model attempts to reconstruct the input.
3. If the **Mean Squared Error (MSE)** between input and output exceeds a dynamically calculated threshold, the flow is flagged as **Anomalous**.

## 📊 Features
- **Real-time Packet Inspection**: Zero-latency analysis of live network streams.
- **Enriched Threat Intel**: Automatic IP geolocation and reputation checks.
- **Active Response**: Integrated blacklist management to block malicious IPs.
- **AI-Generated Summaries**: High-level executive reports on daily network health.

## 📝 Documentation
For a deep dive into the architecture, feature list, and API endpoints, see the [DOCUMENTATION.md](./DOCUMENTATION.md).

---
**Disclaimer**: This tool is designed for security monitoring and research. Ensure you have proper authorization before monitoring any network traffic.
