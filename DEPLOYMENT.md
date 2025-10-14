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
Browser → localhost:7337 → FastAPI (Single Container)
                              ↓
                         API + Static Files
                              ↓
                         CloudMask Library
```

### Container Details

**Single App Container:**
- Base: `python:3.13-alpine`
- Build: Multi-stage (Node 22 → Python 3.13)
- Runtime: Uvicorn ASGI server
- Port: 7337 (external)
- Features: FastAPI API + React static files

**Networking:**
- Bridge network: `cloudmask-network`
- Single port exposed (7337)
- Simplified architecture

## Development Mode

### Option 1: Production-like (Backend serves static files)

```bash
# Build frontend
cd frontend
npm install
npm run build
cd ..

# Copy build to backend
cp -r frontend/dist backend/

# Run backend
source .venv/bin/activate
cd backend
uvicorn api:app --reload --port 7337

# Open http://localhost:7337
```

### Option 2: Separate Dev Servers (Hot Reload)

```bash
# Terminal 1: Backend API
source .venv/bin/activate
cd backend
uvicorn api:app --reload --port 7337

# Terminal 2: Frontend dev server
cd frontend
npm install
npm run dev

# Open http://localhost:5173 (proxies /api to :7337)
```

## Building Images

### Docker

```bash
# Build single container
docker build -t cloudmask-app .

# Or build with compose
docker-compose build
```

### Podman

```bash
# Build single container
podman build -t cloudmask-app .

# Or build with compose
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
docker-compose logs app
# or
podman compose logs app

# Verify container is running
docker ps
# or
podman ps
```

**404 on /api requests:**
```bash
# Rebuild container
docker-compose build
docker-compose up -d

# or
podman compose build
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
# App health
curl http://localhost:7337/health

# Expected: {"status":"healthy","version":"0.1.0"}
```

### Logs

```bash
# All services
docker-compose logs -f
# or
podman compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f ollama
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

Already persisted in docker-compose.yml:
```yaml
app:
  volumes:
    - ~/.cloudmask:/root/.cloudmask
```

## Support

- **Documentation**: See README.md
- **Issues**: GitHub Issues
- **Logs**: Check container logs first
- **Community**: GitHub Discussions
