# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci && npm cache clean --force
COPY frontend/ ./
RUN npm run build

# Stage 2: Python app
FROM python:3.13-alpine
WORKDIR /app

# Install system dependencies and security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache gcc musl-dev libffi-dev

# Install uv
RUN pip install --no-cache-dir uv

# Create non-root user
RUN addgroup -g 1001 appuser && \
    adduser -D -u 1001 -G appuser appuser && \
    chown -R appuser:appuser /app

# Copy backend files
COPY --chown=appuser:appuser backend/ ./

# Copy frontend build
COPY --from=frontend --chown=appuser:appuser /app/dist ./dist

# Install dependencies as root (needed for system installs)
RUN uv pip install --system --no-cache -e .

# Switch to non-root user
USER appuser

EXPOSE 7337

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7337/health || exit 1

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7337"]
