# CloudMask GUI

Web interface for [CloudMask-AWS](https://github.com/sam-fakhreddine/cloudmask-aws) anonymization tool.

## Features

- 🎭 Mask/unmask AWS infrastructure identifiers
- 📊 Side-by-side diff viewer for before/after comparison
- 🔧 Configuration management (YAML/TOML)
- 🎯 Custom regex pattern builder
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

## Development

### Backend

```bash
# Create virtual environment
uv venv

# Activate virtual environment
source .venv/bin/activate  # Unix/macOS
# .venv\Scripts\activate   # Windows

# Install dependencies
uv pip install -e ".[dev]"

# Run backend
cd backend
uvicorn api:app --reload --port 5337
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Testing Locally

```bash
# Terminal 1: Start backend
source .venv/bin/activate
cd backend
uvicorn api:app --reload --port 5337

# Terminal 2: Start frontend
cd frontend
npm run dev

# Open http://localhost:5173
```

## Architecture

```
Browser → localhost:7337 → Nginx → backend:5337 → CloudMask
```

- **Frontend**: React + Vite + AWS Cloudscape Design System (Node 22)
- **Backend**: Python 3.13 + FastAPI + CloudMask
- **Deployment**: Multi-container (Docker/Podman)

## API Endpoints

- `GET /health` - Health check
- `POST /api/mask` - Mask text
- `POST /api/unmask` - Unmask text
- `POST /api/validate-config` - Validate configuration

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [Architecture](ARCHITECTURE.md) - System architecture and design
- [Technical Spec](docs/SPEC.md) - Feature specifications
- [Project Steering](docs/STEERING.md) - Project direction

## License

MIT
