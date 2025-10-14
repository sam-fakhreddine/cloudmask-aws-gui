# CloudMask GUI Deployment Guide

## Prerequisites

### Choose ONE Container Runtime

#### Option A: Docker
- **Docker Engine** 20.10+ (Linux)
- **Docker Desktop** 4.0+ (Windows/macOS)
- **Docker Compose** v2

```bash
# Verify installation
docker --version
docker-compose --version
```

#### Option B: Podman (Open Source Alternative)
- **Podman** 4.0+
- **Podman Compose** (built-in with Podman 3.0+)

```bash
# macOS installation
brew install podman

# Start Podman machine (macOS/Windows)
podman machine init
podman machine start

# Verify installation
podman --version
podman compose version
```

**Why Podman?**
- Fully open-source (Apache 2.0)
- No licensing restrictions
- Daemonless architecture
- Rootless by default
- Drop-in Docker replacement

## Quick Start

### With Docker

```bash
# Clone repository
git clone <repo-url>
cd cloudmask-gui

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Open browser
open http://localhost:7337
```

### With Podman

```bash
# Clone repository
git clone <repo-url>
cd cloudmask-gui

# Build and start services
podman compose up -d

# View logs
podman compose logs -f

# Stop services
podman compose down

# Open browser
open http://localhost:7337
```

## Architecture

```
Browser → localhost:7337 → Nginx (frontend container)
                              ↓
                         /api/* requests
                              ↓
                    backend:5337 (backend container)
                              ↓
                         CloudMask Library
```

### Container Details

**Frontend Container:**
- Base: `node:22-alpine`
- Build: Vite production build
- Runtime: Nginx 1.25
- Port: 7337 (external) → 80 (internal)
- Features: SPA routing, API proxy

**Backend Container:**
- Base: `python:3.13-slim`
- Runtime: Uvicorn ASGI server
- Port: 5337 (internal only)
- Features: FastAPI, CloudMask integration

**Networking:**
- Bridge network: `cloudmask-network`
- Backend NOT exposed to host (security)
- All API calls proxied through Nginx

## Development Mode

### Backend Only

```bash
# Create virtual environment
uv venv

# Activate
source .venv/bin/activate  # Unix/macOS
.venv\Scripts\activate     # Windows

# Install dependencies
uv pip install -e ".[dev]"

# Run backend
cd backend
uvicorn api:app --reload --port 5337
```

### Frontend Only

```bash
cd frontend
npm install
npm run dev

# Opens at http://localhost:5173
# Proxies /api/* to localhost:5337
```

### Both Together

```bash
# Terminal 1: Backend
source .venv/bin/activate
cd backend
uvicorn api:app --reload --port 5337

# Terminal 2: Frontend
cd frontend
npm run dev

# Open http://localhost:5173
```

## Building Images

### Docker

```bash
# Build backend
docker build -t cloudmask-backend -f backend/Dockerfile .

# Build frontend
docker build -t cloudmask-frontend frontend/

# Or build both with compose
docker-compose build
```

### Podman

```bash
# Build backend
podman build -t cloudmask-backend -f backend/Dockerfile .

# Build frontend
podman build -t cloudmask-frontend frontend/

# Or build both with compose
podman compose build
```

## Troubleshooting

### Docker-Specific Issues

**Port conflicts:**
```bash
# Check what's using port 7337
lsof -ti:7337
# Kill process
lsof -ti:7337 | xargs kill -9
```

**Permission denied:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in

# Or use sudo
sudo docker-compose up -d
```

**Docker Desktop licensing:**
- Required for enterprise use (250+ employees)
- Consider Podman as open-source alternative

### Podman-Specific Issues

**Command not found:**
```bash
# Podman compose is built-in with Podman 3.0+
# Update Podman if needed
brew upgrade podman

# Verify
podman compose version
```

**Machine not running (macOS/Windows):**
```bash
# Check status
podman machine list

# Start machine
podman machine start

# If issues, recreate
podman machine stop
podman machine rm
podman machine init
podman machine start
```

**Networking issues:**
```bash
# Check network
podman network ls

# Recreate network
podman network rm cloudmask-network
podman-compose up -d
```

**Port binding errors (rootless):**
- Ports <1024 require root
- Our setup uses 7337 (works rootless)
- If issues, use `--privileged` flag

### Both Runtimes

**Backend unreachable:**
```bash
# Check logs
docker-compose logs backend
# or
podman compose logs backend

# Verify service name in nginx.conf matches compose
grep backend frontend/nginx.conf
```

**404 on /api requests:**
```bash
# Rebuild frontend (nginx config changed)
docker-compose build frontend
docker-compose up -d

# or
podman compose build frontend
podman compose up -d
```

**Slow performance:**
- Increase Docker Desktop resources (CPU/Memory)
- Increase Podman machine resources:
  ```bash
  podman machine stop
  podman machine set --cpus 4 --memory 4096
  podman machine start
  ```

**Container won't start:**
```bash
# Check logs
docker-compose logs
# or
podman compose logs

# Remove and recreate
docker-compose down -v
docker-compose up -d --build
```

## Production Deployment

### Environment Variables

Create `.env` file:
```bash
# Backend
CLOUDMASK_SEED=your-secret-seed
CLOUDMASK_CONFIG_PATH=/app/config.yml

# Frontend
VITE_API_URL=http://localhost:7337
```

### Security Considerations

1. **Change default ports** if needed
2. **Use HTTPS** in production (add SSL certificates to Nginx)
3. **Set strong seed** for CloudMask
4. **Restrict CORS** in backend (remove `allow_origins=["*"]`)
5. **Use secrets management** for sensitive config
6. **Run as non-root** (already configured)
7. **Keep images updated** regularly

### HTTPS Setup (Production)

Update `frontend/nginx.conf`:
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... rest of config
}
```

Mount certificates in `docker-compose.yml`:
```yaml
frontend:
  volumes:
    - ./ssl:/etc/nginx/ssl:ro
```

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:7337/api/health

# Expected: {"status":"healthy","version":"0.1.0"}
```

### Logs

```bash
# All services
docker-compose logs -f
# or
podman compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Resource Usage

```bash
# Docker
docker stats

# Podman
podman stats
```

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# or
podman compose down
podman compose up -d --build
```

## Backup

### Mapping Files

CloudMask stores mappings in container at `/root/.cloudmask/`

To persist:
```yaml
# Add to docker-compose.yml
backend:
  volumes:
    - ./data:/root/.cloudmask
```

## Support

- **Documentation**: See README.md
- **Issues**: GitHub Issues
- **Logs**: Check container logs first
- **Community**: GitHub Discussions
