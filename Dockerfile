# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python app
FROM python:3.13-alpine
WORKDIR /app

# Install uv
RUN pip install uv

# Copy backend
COPY backend/ ./

# Copy frontend build
COPY --from=frontend /app/dist ./dist

# Install dependencies
RUN uv pip install --system -e .

EXPOSE 7337

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7337"]
