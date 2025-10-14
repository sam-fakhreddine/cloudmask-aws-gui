# CloudMask GUI

Web frontend for [CloudMask-AWS](https://github.com/sam-fakhreddine/cloudmask-aws) anonymization tool.

## Features

- 🎭 Anonymize AWS infrastructure identifiers
- 🌐 Modern web interface with AWS Cloudscape Design System
- 🐳 Multi-container deployment (Docker/Podman)
- 📋 Clipboard integration
- 📁 File upload/download support

## Quick Start

### Prerequisites

**Choose ONE container runtime:**

- **Docker**: Docker Engine 20.10+ or Docker Desktop 4.0+
- **Podman**: Podman 4.0+ (fully open-source alternative)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd cloudmask-gui

# Start services (Docker)
docker-compose up -d

# OR start services (Podman)
podman-compose up -d

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
uv run uvicorn api:app --reload --port 5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
Browser → localhost:7337 → Nginx → api:5000 → Backend
```

- **Frontend**: React + TypeScript + Vite + AWS Cloudscape
- **Backend**: Python 3.13 + FastAPI + CloudMask
- **Deployment**: Multi-container (Docker/Podman)

## Documentation

- [Agent Instructions](.amazonq/rules/AGENTS.md)
- [Git Workflow](.amazonq/rules/git-workflow.md)
- [Technical Spec](.amazonq/SPEC.md)
- [Project Plan](.amazonq/PROJECT-PLAN.md)

## License

MIT
