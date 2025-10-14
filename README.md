# CloudMask GUI

Web interface for [CloudMask-AWS](https://github.com/sam-fakhreddine/cloudmask-aws) anonymization tool.

## Features

- 🎭 Mask/unmask AWS infrastructure identifiers
- 📊 Side-by-side diff viewer for before/after comparison
- 🔧 Configuration management (YAML/TOML)
- 🎯 Custom regex pattern builder
- 🤖 **AI-powered English to RegEx** (Ollama + Qwen2.5-Coder)
- 📋 Clipboard integration
- 📁 File upload/download support
- 🌐 AWS Cloudscape Design System
- 🐳 Docker/Podman deployment

## Quick Start

### Prerequisites

**Choose ONE container runtime:**

- **Docker**: Docker Engine 20.10+ or Docker Desktop 4.0+
- **Podman**: Podman 4.0+ (fully open-source alternative)

### Installation

```bash
# Clone repository
git clone https://github.com/sam-fakhreddine/cloudmask-aws-gui.git
cd cloudmask-aws-gui

# Start services (Docker)
docker-compose up -d

# OR start services (Podman)
podman compose up -d

# Open browser
open http://localhost:7337
```

### Single Container Architecture

CloudMask GUI now runs as a single container that serves both the API and static React files. This simplifies deployment and reduces resource usage.

## Development

### Option 1: Backend with Static Files (Production-like)

```bash
# Build frontend first
cd frontend
npm install
npm run build
cd ..

# Copy build to backend
cp -r frontend/dist backend/

# Run backend (serves API + static files)
source .venv/bin/activate
cd backend
uvicorn api:app --reload --port 7337

# Open http://localhost:7337
```

### Option 2: Separate Dev Servers (Hot Reload)

```bash
# Terminal 1: Backend API only
source .venv/bin/activate
cd backend
uvicorn api:app --reload --port 7337

# Terminal 2: Frontend dev server with proxy
cd frontend
npm install
npm run dev

# Open http://localhost:5173 (proxies API to :7337)
```

## Architecture

```
Browser → localhost:7337 → FastAPI (API + Static Files) → CloudMask
```

- **Frontend**: React + Vite + AWS Cloudscape Design System (Node 22)
- **Backend**: Python 3.13 + FastAPI + CloudMask
- **Deployment**: Single container (Docker/Podman)

## API Endpoints

- `GET /health` - Health check
- `POST /api/mask` - Mask text
- `POST /api/unmask` - Unmask text
- `POST /api/validate-config` - Validate configuration

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [Architecture](ARCHITECTURE.md) - System architecture and design
- [English to RegEx AI](docs/ENGLISH-TO-REGEX.md) - AI-powered regex generation
- [Technical Spec](docs/SPEC.md) - Feature specifications
- [Project Steering](docs/STEERING.md) - Project direction

## License

MIT
