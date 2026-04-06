# Smart Lamp System

A smart lamp monitoring and control system based on OpenClaw. The system features AI-powered behavior detection, voice alerts, and real-time monitoring through a web interface.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   OpenClaw  │───▶│  Express.js  │───▶│  Python Bridge  │
│  (WhatsApp/ │    │  (Port 3001) │    │  (Port 5000)    │
│   Feishu)   │    └──────────────┘    └─────────────────┘
└─────────────┘           │                      │
                          ▼                      ▼
                   ┌──────────────┐      ┌──────────────┐
                   │  Web UI      │      │ Smart Lamp   │
                   │  (Monitor)   │      │ (Hardware)   │
                   └──────────────┘      └──────────────┘
```

## Components

- **Express Server** (`server.js`) - Main API server handling task execution, camera control, AI detection
- **Python Bridge** (`lamp_server.py`) - Windows PC backend bridging to physical smart lamp (photo capture, TTS, audio playback)
- **Web UI** (`public/index.html`) - Real-time monitoring dashboard

## Quick Start

```bash
# Start Express server (main service)
npm install
npm start

# Start Python bridge (optional, for physical lamp integration)
python lamp_server.py
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/task/execute` | POST | Execute detection task |
| `/api/camera/status` | GET | Get camera status |
| `/api/history` | GET | Get detection history |
| `/api/status` | GET | Get system status |
| `/` | GET | Monitoring UI |

## Features

- **AI Behavior Detection** - Detects activities like homework via camera analysis
- **Voice Alerts** - Text-to-speech reminders when behaviors are not detected
- **Camera Integration** - Supports external camera service or local capture
- **OpenClaw Integration** - Cron-based task scheduling via OpenClaw gateway
- **Real-time Monitoring** - Web dashboard with live status and history
- **History Tracking** - Persistent detection records with statistics

## OpenClaw Integration

```bash
# Setup cron tasks
./openclaw-scripts/setup-cron.sh

# Manual test
./openclaw-scripts/test-manual.sh
```

## Configuration

- Express server port: `3001` (default)
- Python bridge port: `5000` (default)
- Lamp base URL: `http://192.168.199.10:60010`

## Project Structure

```
smart-lamp-system/
├── server.js           # Express main server
├── lamp_server.py      # Python bridge to hardware
├── src/
│   ├── api/            # API route handlers
│   └── utils/          # Utility modules
│       ├── camera.js   # Camera control
│       ├── detector.js # AI detection
│       ├── voice.js    # Voice alerts
│       └── history.js  # History management
├── public/             # Web UI assets
└── openclaw-scripts/   # OpenClaw integration scripts
```
