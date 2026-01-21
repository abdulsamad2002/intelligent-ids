# 📟 Frontend Terminal Logs Integration Guide

This guide explains how to integrate the real-time IDS terminal log stream into your frontend application using **Socket.io**.

---

## 🔌 1. Establish WebSocket Connection

Ensure you have the `socket.io-client` library installed:
```bash
npm install socket.io-client
```

Connect to the backend:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('connected to IDS backend');
});
```

---

## 📡 2. Listen for Terminal Logs

The backend emits an event named `ids_terminal_log` whenever the Python engine generates output.

### Event Payload Structure:
```json
{
  "message": "The log text content...",
  "level": "info", // e.g., 'info', 'warning', 'error'
  "timestamp": "2026-01-21T11:30:00.000Z"
}
```

### Implementation Example (React):
```javascript
import React, { useEffect, useState, useRef } from 'react';

const TerminalComponent = () => {
  const [logs, setLogs] = useState([]);
  const terminalRef = useRef(null);

  useEffect(() => {
    // Listen for terminal logs
    socket.on('ids_terminal_log', (newLog) => {
      setLogs((prevLogs) => [...prevLogs, newLog]);
      
      // Auto-scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    });

    return () => socket.off('ids_terminal_log');
  }, []);

  return (
    <div className="terminal-container" ref={terminalRef}>
      {logs.map((log, index) => (
        <div key={index} className={`log-entry log-${log.level}`}>
          <span className="timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
          <pre className="message">{log.message}</pre>
        </div>
      ))}
    </div>
  );
};
```

---

## 🎨 3. Recommended Styling (CSS)

To achieve a professional "Security Terminal" look:

```css
.terminal-container {
  background-color: #0d1117;
  color: #e6edf3;
  font-family: 'Fira Code', 'Courier New', monospace;
  padding: 20px;
  border-radius: 8px;
  height: 400px;
  overflow-y: auto;
  border: 1px solid #30363d;
}

.log-entry {
  margin-bottom: 4px;
  line-height: 1.4;
}

.timestamp {
  color: #7d8590;
  margin-right: 10px;
}

.message {
  display: inline;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Severity Colors */
.log-info { color: #e6edf3; }
.log-warning { color: #d29922; font-weight: bold; }
.log-error { color: #f85149; font-weight: bold; }

/* Custom "Malicious Detected" highlight */
.log-warning .message:contains("MALICIOUS") {
  background-color: rgba(248, 81, 73, 0.15);
}
```

---

## 💡 Best Practices

1.  **Buffer Size**: To avoid memory issues during high-traffic scenarios (e.g., a DDoS attack generating thousands of logs), limit the state to the last 200-500 logs:
    ```javascript
    setLogs((prev) => [...prev, newLog].slice(-500));
    ```
2.  **ANSI Support**: If you decide to send colored text from Python using libraries like `colorama`, you may need a library like `ansi-to-react` to render those colors on the web.
3.  **Search/Filter**: Implement a simple text filter to allow analysts to search for specific IPs or attack types within the log history.
