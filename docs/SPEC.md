# CloudMask GUI - Technical Specification

## System Architecture

### Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP :7337
       ▼
┌─────────────────┐
│ Frontend        │
│ (Nginx + React) │
└──────┬──────────┘
       │ /api → :5000
       ▼
┌─────────────────┐
│ Backend         │
│ (Python + CM)   │
└─────────────────┘
```

### Components

#### Frontend Container

- **Base**: nginx:alpine
- **Content**: React SPA build artifacts
- **Port**: 7337 (external)
- **Responsibilities**: Serve static files, reverse proxy /api

#### Backend Container

- **Base**: python:3.13-slim
- **Framework**: Flask or FastAPI
- **Port**: 5000 (internal only)
- **Responsibilities**: CloudMask operations, API endpoints

## Technology Stack

### Frontend

- **Framework**: React 18+
- **Language**: TypeScript 5+
- **Build Tool**: Vite 5+
- **UI Library**: AWS Cloudscape Design System
- **State**: React useState + useContext

### Backend

- **Language**: Python 3.13+
- **Framework**: Flask 3+ or FastAPI 0.100+
- **Validation**: Pydantic 2+
- **Core Library**: CloudMask-AWS
- **Package Manager**: uv

## API Specification

### POST /api/anonymize

Anonymize text using CloudMask.

**Request**:

```json
{
  "text": "string (required)",
  "seed": "string (optional)",
  "config": {
    "company_names": ["string"],
    "preserve_prefixes": true,
    "anonymize_ips": true
  }
}
```

**Response** (200):

```json
{
  "anonymized_text": "string",
  "mapping": {},
  "stats": {
    "items_anonymized": 42,
    "processing_time_ms": 123
  }
}
```

### POST /api/unanonymize

Restore original values.

**Request**:

```json
{
  "text": "string (required)",
  "mapping": {}
}
```

**Response** (200):

```json
{
  "original_text": "string"
}
```

### GET /api/health

Health check endpoint.

**Response** (200):

```json
{
  "status": "healthy",
  "cloudmask_version": "1.0.0"
}
```

## Data Models

### Configuration

```typescript
interface Config {
  company_names: string[];
  custom_patterns: CustomPattern[];
  preserve_prefixes: boolean;
  anonymize_ips: boolean;
  anonymize_domains: boolean;
  seed?: string;
}
```

### Mapping

```typescript
interface Mapping {
  [original: string]: string;
}
```

## Security

- Backend validates all inputs with Pydantic
- Regex patterns tested with timeout protection
- File size limits enforced (10MB default)
- Mapping files: 600 permissions
- HTTPS required for production

## Performance Requirements

- Anonymize (1KB): <100ms
- Anonymize (10KB): <500ms
- Anonymize (100KB): <2s
- Max input size: 10MB
- Frontend bundle: <500KB gzipped

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

## Container Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "7337:7337"
    depends_on:
      - backend

  backend:
    build: ./backend
    environment:
      - PYTHONUNBUFFERED=1
```

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus indicators
- Color contrast ≥4.5:1

## Configuration Presets

### Minimal

```yaml
company_names: []
preserve_prefixes: true
anonymize_ips: true
```

### Standard

```yaml
company_names:
  - Acme Corp
preserve_prefixes: true
anonymize_ips: true
```
