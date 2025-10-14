# CloudMask GUI Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Browser                            │
│                     http://localhost:7337                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Single App Container (Python)                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  FastAPI Application                                       │ │
│  │  - POST /api/mask (anonymize text)                         │ │
│  │  - POST /api/unmask (restore original)                     │ │
│  │  - GET /health (health check)                              │ │
│  │  - Pydantic validation                                     │ │
│  │  - CORS middleware                                         │ │
│  │  - Static file serving (React build)                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React App (Static Files)                                  │ │
│  │  - Cloudscape Design System                                │ │
│  │  - Dark Mode Support                                       │ │
│  │  - File Upload/Download                                    │ │
│  │  - Clipboard Integration                                   │ │
│  │  - Served from /dist directory                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  CloudMask Library                                         │ │
│  │  - Deterministic hashing                                   │ │
│  │  - AWS resource ID anonymization                           │ │
│  │  - Pattern matching                                        │ │
│  │  - Mapping management                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Uvicorn ASGI Server                                       │ │
│  │  - Async request handling                                  │ │
│  │  - Python 3.13 runtime                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Port: 7337 (external)                                           │
└───────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (React + Cloudscape)

**Technology Stack:**
- **Framework**: React 18
- **Build Tool**: Vite 7
- **UI Library**: AWS Cloudscape Design System
- **HTTP Client**: Axios
- **File Handling**: browser-fs-access
- **Node Version**: 22+ (for latest features)

**Key Features:**
- Responsive horizontal layout (Input/Output panels)
- Dark/Light mode toggle with localStorage persistence
- File upload with drag-and-drop support
- Copy to clipboard functionality
- Character/line counter
- Real-time validation
- Loading states and error handling
- Success/error notifications

**Build Process:**
1. `npm install` - Install dependencies
2. `npm run build` - Vite production build
3. Output: `dist/` directory with optimized static files
4. FastAPI serves from `/app/dist` directory

### Backend (FastAPI + CloudMask)

**Technology Stack:**
- **Framework**: FastAPI 0.100+
- **Server**: Uvicorn (ASGI)
- **Validation**: Pydantic v2
- **Core Library**: cloudmask-aws
- **Python Version**: 3.13+

**API Endpoints:**

```python
GET /health
Response: {"status": "healthy", "version": "0.1.0"}

POST /api/mask
Request: {
  "text": str,
  "patterns": list[str]  # Optional
}
Response: {
  "masked_text": str,
  "items_masked": int,
  "processing_time_ms": float
}
```

**Request Flow:**
1. Receive POST request with text
2. Validate input with Pydantic
3. Initialize CloudMask instance
4. Call `mask.anonymize(text)`
5. Measure processing time
6. Return masked text + metadata

### Static File Serving

**FastAPI Configuration:**
```python
# Mount static assets
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Serve SPA for all non-API routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404)
    
    file_path = Path("dist") / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    return FileResponse("dist/index.html")
```

**Responsibilities:**
- Serve React static files
- Handle SPA routing (all routes → index.html)
- Serve API endpoints
- Single port for everything

### Docker Networking

**Network Configuration:**
```yaml
networks:
  cloudmask-network:
    driver: bridge
```

**Service Communication:**
- App → Ollama: Uses service name `ollama` (Docker DNS)
- Single port exposed (7337)
- Simplified architecture

**Security Benefits:**
- Single entry point
- No internal proxying needed
- CORS not needed (same-origin)
- Ollama isolated on internal network

## Data Flow

### Anonymization Request

```
1. User types/pastes text in Input panel
   ↓
2. User clicks "Mask data" button
   ↓
3. Frontend validates input (not empty)
   ↓
4. Frontend sends POST /api/mask via Axios
   ↓
5. FastAPI receives request at localhost:7337/api/mask
   ↓
6. Pydantic validates request body
   ↓
7. CloudMask.anonymize(text) processes input
   ↓
8. Response with masked_text + metadata
   ↓
9. Frontend displays in Output panel
   ↓
10. Success notification shown
```

### File Upload Flow

```
1. User clicks "Load file" button
   ↓
2. Browser file picker opens
   ↓
3. User selects file
   ↓
4. FileReader API reads file content
   ↓
5. Content loaded into Input textarea
   ↓
6. File name badge displayed
   ↓
7. Character/line count updated
   ↓
8. User proceeds with "Mask data"
```

### File Save Flow

```
1. User clicks "Save" button in Output panel
   ↓
2. browser-fs-access library invoked
   ↓
3. Native file picker opens (Chrome/Edge)
   OR
   Download link triggered (Firefox/Safari)
   ↓
4. User chooses location and filename
   ↓
5. File saved to local filesystem
   ↓
6. Success notification (or error if cancelled)
```

## State Management

### Frontend State

**Component State (useState):**
- `text` - Input textarea content
- `result` - Masked output + metadata
- `loading` - API request in progress
- `notifications` - Success/error messages
- `fileName` - Uploaded file metadata
- `theme` - Dark/Light mode preference

**Persistence:**
- Theme preference → localStorage
- No other state persisted (stateless app)

### Backend State

**Stateless Design:**
- No session management
- No user authentication
- Each request independent
- CloudMask instance created per request

**Future Considerations:**
- Could add mapping persistence
- Could add user sessions
- Could add request history

## Security Architecture

### Current Security Measures

1. **Backend Isolation**: Not exposed to host network
2. **Non-root User**: Containers run as unprivileged user
3. **Input Validation**: Pydantic validates all requests
4. **File Size Limits**: 50MB max upload
5. **CORS**: Configured for development (needs tightening for prod)
6. **No Credentials**: No authentication required (single-user)

### Production Security Recommendations

1. **Add HTTPS**: SSL/TLS certificates in Nginx
2. **Restrict CORS**: Remove `allow_origins=["*"]`
3. **Add Rate Limiting**: Prevent abuse
4. **Add Authentication**: If multi-user deployment
5. **Secrets Management**: Environment variables for sensitive config
6. **Regular Updates**: Keep base images updated
7. **Network Policies**: Restrict container communication

## Scalability Considerations

### Current Limitations

- **Single-user design**: No concurrent user support
- **In-memory processing**: Large files consume RAM
- **No caching**: Each request processes from scratch
- **No queue**: Synchronous request handling

### Scaling Options

**Horizontal Scaling:**
- Add load balancer in front of multiple frontend containers
- Add multiple backend containers
- Use Redis for shared session state

**Vertical Scaling:**
- Increase container CPU/memory limits
- Use streaming for large files
- Implement chunked processing

**Performance Optimizations:**
- Cache CloudMask instances
- Use async processing for large files
- Add progress indicators for long operations
- Implement request queuing

## Development vs Production

### Development Mode

- Frontend: Vite dev server (port 5173)
- Backend: Uvicorn with `--reload`
- Hot module replacement (HMR)
- Source maps enabled
- CORS wide open
- Detailed error messages

### Production Mode

- Frontend: Nginx serving static build
- Backend: Uvicorn production mode
- Minified/optimized assets
- No source maps
- Restricted CORS
- Generic error messages
- HTTPS required

## Monitoring & Observability

### Health Checks

```bash
# Backend health
curl http://localhost:7337/api/health

# Container health
docker ps
podman ps
```

### Logging

**Frontend Logs:**
- Browser console (development)
- Nginx access/error logs (production)

**Backend Logs:**
- Uvicorn stdout/stderr
- FastAPI request logs
- CloudMask processing logs

**Access Logs:**
```bash
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Metrics (Future)

- Request count
- Processing time distribution
- Error rate
- File size distribution
- Items masked per request

## Technology Choices Rationale

### Why React + Cloudscape?
- AWS-native design system
- Production-tested components
- Consistent UX patterns
- Built-in accessibility
- Dark mode support

### Why FastAPI?
- Modern async Python framework
- Automatic OpenAPI docs
- Pydantic validation
- High performance
- Easy to test

### Why Docker/Podman?
- Consistent deployment
- Isolated environments
- Easy scaling
- Platform-independent
- Podman: Open-source alternative

### Why FastAPI for Static Files?
- Single container simplicity
- Built-in static file support
- SPA routing with catch-all route
- Lower resource usage
- Easier deployment

### Why Node 22?
- Latest JavaScript features
- Better performance
- Native TypeScript support
- Improved error messages
- Modern tooling support
