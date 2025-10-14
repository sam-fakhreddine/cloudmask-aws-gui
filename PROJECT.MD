# CloudMask Web Frontend Project Plan

**A production-ready web interface for data masking with AWS Cloudscape, containerized deployment, and browser-native file handling.** This project will transform CloudMask's Python backend into an accessible single-user web application featuring clipboard-based text input and file upload workflows, with configuration management through the browser's File System Access API. The architecture leverages multi-container Docker deployment, React with AWS Cloudscape Design System for the UI, and Flask/FastAPI for backend API integration.

## Research limitations and approach

The CloudMask GitHub repository (github.com/sam-fakhreddine/cloudmask-aws) is currently private or inaccessible, though the package exists on PyPI as cloudmask-aws v0.1.0. This plan assumes CloudMask is a data masking tool for sensitive information (PII, credentials, AWS keys) in text and files. **The architecture is designed to be flexible and adaptable** once repository access is obtained. Before implementation begins, the team must examine the actual CloudMask API to confirm integration points and adjust the technical approach accordingly.

## Technical architecture

### System overview

The application employs a **three-tier architecture** optimized for standalone, single-user deployment: a React frontend served by Nginx, a Python backend API wrapping CloudMask functionality, and Docker orchestration managing both containers. This separation enables independent scaling, better security isolation, and cleaner development workflows compared to monolithic alternatives.

The frontend communicates exclusively through a REST API proxied by Nginx to avoid CORS complexity and prevent direct backend exposure. Users interact with either clipboard-based text input or file upload mechanisms, triggering masking operations that flow through the API layer to CloudMask's Python implementation. Results return through the same API channel for display or download via browser-native file save dialogs.

### Component interaction flow

When a user pastes text into the Cloudscape textarea, the React application captures the input and transmits it via POST request to `/api/mask`. Nginx receives this request and proxies it internally to the Python backend container using Docker's service-based DNS (<http://api:5000>). The Flask/FastAPI application invokes CloudMask's masking functions with the provided text and configuration parameters, then returns the masked result as JSON.

For file-based workflows, the frontend reads the file content using JavaScript's File API, sends the content to `/api/mask-file` with metadata (filename, type), and receives the processed result. The File System Access API then presents a save dialog allowing users to write the masked output directly to their local filesystem with their chosen filename and location.

Configuration files follow a similar pattern: users load existing configs via file picker, the app sends them to `/api/config/validate` for verification, and saves modified configs using `showSaveFilePicker()` with appropriate file type filters (.json, .yaml, or CloudMask's native format).

### Container networking

Docker Compose creates a bridge network connecting both containers. The API container exposes port 5000 internally but **never maps to the host** - it's accessible only within the Docker network. The frontend container runs Nginx on port 80 internally, mapped to host port 3000, becoming the sole external entry point. Nginx configuration includes reverse proxy rules directing `/api/*` requests to `http://api:5000`, leveraging Docker's automatic service name resolution.

This topology provides security through obscurity (backend isn't directly accessible), eliminates CORS requirements (all requests appear same-origin to the browser), and simplifies deployment since only one port needs exposure. For development environments, the React dev server can proxy to localhost:5000 directly using package.json's proxy setting.

## Technology stack recommendations

### Frontend stack

**Framework**: React 18+ with functional components and hooks provides the optimal balance of maturity, ecosystem support, and Cloudscape compatibility. Cloudscape Design System is built specifically for React and expects modern component patterns.

**Build tooling**: Vite replaces Create React App as the recommended bundler due to faster development server startup, better HMR performance, and native ES modules support. Configuration is minimal and Vite handles Cloudscape's CSS imports correctly without additional loaders.

**State management**: Start with React's built-in useState and useContext for form state and application configuration. For more complex state needs (multi-step workflows, undo/redo), consider Zustand rather than Redux - it's lighter weight and more appropriate for single-user applications without complex async coordination.

**HTTP client**: Axios provides cleaner API than fetch() with automatic JSON transformation, request/response interceptors for error handling, and simpler timeout configuration. The error interceptor can standardize error responses for consistent Flashbar notifications.

**File handling**: Install browser-fs-access polyfill library by Google Chrome Labs to provide automatic fallbacks for File System Access API. This library detects browser capabilities and gracefully degrades to traditional download links on Firefox/Safari while using native file pickers on Chromium browsers.

### Backend stack

**API framework**: FastAPI is recommended over Flask for its automatic OpenAPI documentation, native async support, Pydantic data validation, and better performance. The automatic /docs endpoint accelerates frontend development by providing interactive API exploration. However, Flask with Flask-RESTX is acceptable if team familiarity is higher.

**WSGI server**: Gunicorn with 4 worker processes handles production traffic efficiently for CPU-bound masking operations. Configure `--timeout 120` to accommodate potentially lengthy file processing operations without premature worker restarts.

**Python version**: Python 3.9+ required, with 3.11 recommended for performance improvements in asyncio and JSON parsing. Check CloudMask's actual requirements.txt when repository access is obtained.

**Key dependencies**:

- cloudmask-aws (once installation method confirmed)
- fastapi or flask + flask-cors (if not using nginx proxy)
- pydantic (for request/response validation)
- python-multipart (for file upload handling)
- uvicorn or gunicorn (ASGI/WSGI server)

### Container infrastructure

**Base images**:

- Frontend build stage: `node:18-alpine` (130MB vs 900MB for full node image)
- Frontend runtime: `nginx:1.25-alpine` (40MB)
- Backend: `python:3.11-slim` (150MB vs 1GB for full python image)

**Orchestration**: Docker Compose v2 or Podman Compose provides declarative service definition, automatic network creation, environment variable management, and simple commands for starting/stopping the entire stack. Single-file docker-compose.yml (or podman-compose.yml) configuration makes deployment repeatable.

**Container runtime choice**: The project supports both **Docker** and **Podman**:

- **Docker**: Traditional container runtime, widely adopted, requires Docker Desktop on Windows/macOS (proprietary licensing for large organizations)
- **Podman**: Daemonless, rootless alternative, fully open-source (Apache 2.0), drop-in Docker replacement, better security model, especially valuable for Windows users seeking open-source solutions

**Why Podman matters**: Docker Desktop changed licensing in 2021, requiring paid subscriptions for organizations over 250 employees. Podman provides a fully open-source alternative with no licensing restrictions. On Windows, Podman runs via WSL2 without proprietary desktop applications.

**Compatibility**: All commands work with both runtimes:

- `docker build` = `podman build`
- `docker-compose up` = `podman-compose up` (requires podman-compose installation)
- `docker run` = `podman run`

The project uses standard OCI container images and standard compose specifications, ensuring full compatibility between both runtimes.

**Volume strategy**: Use named volumes for persistent configuration storage (if needed) rather than bind mounts. Named volumes survive container recreation and work consistently across platforms (Linux, macOS, Windows with Docker Desktop or Podman Desktop).

## Cloudscape components for UI implementation

### Layout and structure

**AppLayout** forms the foundation, providing consistent page structure with collapsible navigation, content area, and tools panel. For this single-purpose application, set `navigationHide={true}` and `toolsHide={true}` to maximize content space. The content slot receives all application UI through SpaceBetween for consistent vertical spacing.

**Container** components wrap logical groupings like "Input Options" and "Masking Configuration". Each Container accepts a Header component defining the section title and optional action buttons. Containers provide the visual card-style separation users expect from modern web applications.

**SpaceBetween** replaces manual margin/padding with consistent spacing using predefined sizes (xs, s, m, l, xl). Use `direction="vertical"` between form sections and `direction="horizontal"` for button groups in form actions.

### Input workflow components

**Textarea** with FormField wrapper creates the clipboard paste interface. Set rows={15} for comfortable viewing, add character count using constraintText, and implement validation showing errorText when content exceeds limits or contains invalid formats. The onChange handler receives `event.detail.value` (not event.target.value) per Cloudscape's custom event pattern.

**FormField** wraps every input with label, description, and validation. The label provides screen reader text, description offers guidance ("Paste text containing sensitive data"), constraintText shows requirements ("Maximum 100,000 characters"), and errorText displays validation failures. This pattern ensures accessibility compliance and consistent UX.

**File upload** requires custom implementation since Cloudscape lacks a dedicated component. Create a Button with `iconName="upload"` triggering a hidden `<input type="file">`. Display selected filename using StatusIndicator or Alert components. Show file size validation immediately after selection to prevent uploading oversized files.

### Configuration management components

**Form** component wraps all configuration controls with an actions slot for primary/secondary buttons. This standardizes form submission patterns and provides proper semantic HTML structure. The Form handles disabled states during submission and coordinates with FormField validation.

**Select** dropdowns configure masking strategies (asterisk replacement, tokenization, redaction, etc.). Use the `selectedOption` controlled pattern with onChange receiving `event.detail.selectedOption`. Group related options using the optionGroups prop for complex configuration with categories like "AWS Patterns", "PII Patterns", "Custom Patterns".

**Input** components handle text configuration like regex patterns, replacement strings, or custom delimiters. Combine with validation regex to show immediate feedback on pattern validity using FormField's errorText. For multi-line patterns or JSON configuration, switch to Textarea or CodeEditor.

**Checkbox** and **Toggle** components enable/disable feature flags like "Preserve format", "Case sensitive matching", or "Export with metadata". Toggle is preferred for settings taking immediate effect, while Checkbox suits batch operations applied on form submission.

**CodeEditor** component (if JSON/YAML configs are complex) provides syntax highlighting, line numbers, and error detection for configuration files. The editor integrates with Ace editor and supports multiple languages and themes.

### Action and feedback components

**Button** variants structure user actions hierarchically: `variant="primary"` for the main "Mask Data" action, `variant="normal"` for "Preview" or "Load Config", and `variant="link"` for "Clear" or "Cancel". The `loading` prop displays an inline spinner during async operations without disabling the button, maintaining better accessibility.

**ButtonDropdown** consolidates export options under a single control. Configure items for "Download as TXT", "Download as JSON", "Copy to clipboard", or "Save configuration". The onItemClick handler receives `event.detail.id` to determine which action to execute.

**Flashbar** displays page-level notifications at the top of the AppLayout content area. Success messages ("Data masked successfully. 47 items masked in 0.8 seconds."), errors ("Masking failed: Invalid regex pattern at line 12"), and warnings ("File size exceeds 10MB. Processing may take longer.") all route through a notifications state array. Set dismissible={true} and implement onDismiss to let users clear messages.

**ProgressBar** shows deterministic progress for file processing. Update the value prop as chunks complete, display filesProcessed/totalFiles in the description, and show estimated time remaining in the label. This transforms opaque waits into informed waiting, significantly improving perceived performance.

**Alert** components provide contextual warnings within forms. Use type="warning" for non-blocking issues ("This regex pattern may be slow for large files") and type="error" for blocking problems ("CloudMask service is unavailable. Please check Docker container status."). Position Alerts above the problematic FormField for clear association.

### Advanced components for enhanced UX

**Modal** dialog for configuration export/import provides focus containment and clear actions. Size="medium" works for most scenarios. Include warning Modals before destructive actions like "Clear all configuration".

**Table** displays batch processing results when users mask multiple files. Configure columns for filename, original size, masked size, items found, and status. Enable sorting and filtering for large result sets. The selection prop allows bulk re-processing of failed items.

**CopyToClipboard** component simplifies copying masked output with a single click. It handles the Clipboard API automatically and shows feedback on successful copy.

## Agentic implementation strategy

### Development approach for autonomous agents

This project will be implemented using agentic development tools (Claude Code, Cursor, Aider, or similar) that can autonomously write, test, and iterate on code. The plan is restructured around **atomic, verifiable objectives** with clear success criteria that agents can validate independently.

**Key differences from traditional development**:

- **Self-contained tasks**: Each objective includes complete context, avoiding dependency on previous conversation state
- **Validation-driven**: Every task specifies how the agent can verify success (run tests, check endpoints, validate output)
- **Error recovery**: Tasks include common failure modes and debugging strategies for autonomous troubleshooting
- **Incremental verification**: Frequent checkpoints where agents can confirm working state before proceeding

### Agent execution workflow

```
FOR EACH OBJECTIVE:
  1. Agent reads objective with full context
  2. Agent analyzes current codebase state
  3. Agent implements changes
  4. Agent runs validation checks
  5. IF validation fails:
     - Agent analyzes error output
     - Agent attempts fix (max 3 retries)
     - IF still failing: HALT and request human review
  6. Agent commits working code
  7. PROCEED to next objective
```

The human overseer monitors progress, intervenes when agents get stuck, and provides clarifications for ambiguous requirements. The agent handles all coding, testing, debugging, and routine decision-making.

## Agentic objectives (atomic tasks)

### Objective 1: Create new repository with CloudMask reference

**Context**: Initialize a new git repository for the web frontend that references the existing cloudmask-aws repository as a dependency, keeping projects separate.

**Success criteria**:

- New repository created (locally or on GitHub/GitLab)
- Directory structure exists: `/frontend`, `/backend`, `/docs`
- `.gitignore` configured for node_modules, **pycache**, .env, venv
- `backend/requirements.txt` includes `cloudmask-aws` as dependency (from git or PyPI)
- Repository README indicates this is the web frontend for cloudmask-aws
- CloudMask repository linked in documentation

**Validation commands**:

```bash
git init
git add .
git commit -m "Initial commit: CloudMask web frontend structure"
ls -la frontend/ backend/ docs/
cat backend/requirements.txt | grep cloudmask
```

**Common failures**: None expected (initialization only)

**backend/requirements.txt** should include:

```
# CloudMask dependency - choose ONE:
cloudmask-aws>=0.1.0  # If available on PyPI
# OR
git+https://github.com/sam-fakhreddine/cloudmask-aws.git@main#egg=cloudmask-aws  # From git
```

**README.md** should state:

```markdown
# CloudMask Web Frontend

A modern web interface for [CloudMask](https://github.com/sam-fakhreddine/cloudmask-aws), 
providing clipboard-based text masking and file processing capabilities.

## Related Projects
- Backend engine: [cloudmask-aws](https://github.com/sam-fakhreddine/cloudmask-aws)
```

---

### Objective 2: Bootstrap project structure

**Context**: Create empty project with correct directory structure and configuration files.

**Success criteria**:

- Directory structure complete with subdirectories
- Each directory contains initial README or .gitkeep
- `.gitignore` covers common patterns

**Validation command**: `find . -type f -name "README.md" -o -name ".gitkeep"`

**Common failures**: None expected (file creation only)

---

### Objective 2: Initialize React frontend with Cloudscape

**Context**: Create Vite-based React application with Cloudscape Design System installed and basic AppLayout rendered.

**Success criteria**:

- `frontend/package.json` exists with dependencies: react, vite, @cloudscape-design/components, @cloudscape-design/global-styles
- `frontend/src/App.jsx` imports and renders basic `<AppLayout>` component
- Development server starts successfully: `npm run dev` in frontend/ directory
- Browser displays Cloudscape AppLayout at localhost:5173 (Vite default)

**Validation commands**:

```bash
cd frontend
npm install
npm run dev
# Verify http://localhost:5173 shows Cloudscape UI (manual browser check)
```

**Common failures**:

- Missing global styles import: Add `import '@cloudscape-design/global-styles/index.css'` to App.jsx
- Module resolution errors: Verify package.json has exact package names from npm

**Reference documentation**: <https://cloudscape.design/get-started/integration/using-cloudscape-components/>

---

### Objective 3: Create FastAPI backend with health check

**Context**: Initialize Python backend with FastAPI, basic health check endpoint, and CORS configuration.

**Success criteria**:

- `backend/requirements.txt` exists with: fastapi, uvicorn[standard], python-multipart
- `backend/api.py` exists with FastAPI app and GET /health endpoint returning `{"status": "ok"}`
- Server starts: `uvicorn api:app --reload` in backend/ directory
- Endpoint responds: `curl http://localhost:8000/health` returns JSON with status ok

**Validation commands**:

```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload &
sleep 2
curl http://localhost:8000/health
# Should output: {"status":"ok"}
kill %1  # Stop uvicorn
```

**Common failures**:

- Port 8000 already in use: Kill existing process or use --port 8001
- Import errors: Verify requirements.txt has exact package names from PyPI

**Minimal api.py template**:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}
```

---

### Objective 4: Build frontend Docker container

**Context**: Create multi-stage Dockerfile for React frontend that builds static files and serves with Nginx. Works with both Docker and Podman.

**Success criteria**:

- `frontend/Dockerfile` exists with build and production stages
- `frontend/nginx.conf` exists with SPA routing configuration
- Image builds successfully with Docker OR Podman:
  - Docker: `docker build -t cloudmask-frontend frontend/`
  - Podman: `podman build -t cloudmask-frontend frontend/`
- Container runs and serves app:
  - Docker: `docker run -p 3000:80 cloudmask-frontend`
  - Podman: `podman run -p 3000:80 cloudmask-frontend`
- Browser shows Cloudscape UI at localhost:3000

**Validation commands** (use docker OR podman):

```bash
cd frontend
# Docker
docker build -t cloudmask-frontend .
docker run -d -p 3000:80 --name test-frontend cloudmask-frontend
sleep 2
curl -I http://localhost:3000  # Should return 200 OK
docker stop test-frontend
docker rm test-frontend

# OR Podman
podman build -t cloudmask-frontend .
podman run -d -p 3000:80 --name test-frontend cloudmask-frontend
sleep 2
curl -I http://localhost:3000  # Should return 200 OK
podman stop test-frontend
podman rm test-frontend
```

**Common failures**:

- Build context missing files: Ensure package.json, src/ copied before npm install
- Nginx configuration errors: Test nginx.conf syntax with `nginx -t` in container
- Port conflicts: Use different port or stop conflicting containers
- Podman on Windows: Ensure WSL2 is configured and podman machine is running (`podman machine start`)

**Required nginx.conf** for SPA routing:

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Objective 5: Build backend Docker container

**Context**: Create Dockerfile for Python backend with Gunicorn and environment configuration. Works with both Docker and Podman.

**Success criteria**:

- `backend/Dockerfile` exists with Python slim base, dependencies, and Gunicorn CMD
- Image builds with Docker OR Podman:
  - Docker: `docker build -t cloudmask-backend backend/`
  - Podman: `podman build -t cloudmask-backend backend/`
- Container runs:
  - Docker: `docker run -p 5000:5000 cloudmask-backend`
  - Podman: `podman run -p 5000:5000 cloudmask-backend`
- Health endpoint responds: `curl http://localhost:5000/health` returns status ok

**Validation commands** (use docker OR podman):

```bash
cd backend
# Docker
docker build -t cloudmask-backend .
docker run -d -p 5000:5000 --name test-backend cloudmask-backend
sleep 3
curl http://localhost:5000/health
docker stop test-backend
docker rm test-backend

# OR Podman
podman build -t cloudmask-backend .
podman run -d -p 5000:5000 --name test-backend cloudmask-backend
sleep 3
curl http://localhost:5000/health
podman stop test-backend
podman rm test-backend
```

**Common failures**:

- Gunicorn command syntax errors: Use format `gunicorn api:app --bind 0.0.0.0:5000`
- Missing app variable: Ensure api.py contains `app = FastAPI()`
- Permission issues: Add non-root user or run as root temporarily
- Podman rootless networking: May need to use different port range (>1024) or configure slirp4netns

---

### Objective 6: Create docker-compose multi-container orchestration

**Context**: Configure Docker Compose or Podman Compose to run frontend and backend together with proper networking and reverse proxy.

**Success criteria**:

- `docker-compose.yml` (also works as `podman-compose.yml`) exists at project root with services: frontend, backend
- Backend service does NOT expose ports to host (internal only)
- Frontend service exposes port 3000
- `frontend/nginx.conf` updated with `/api/` reverse proxy to backend
- Stack starts with Docker Compose OR Podman Compose:
  - Docker: `docker-compose up -d`
  - Podman: `podman-compose up -d` (requires podman-compose package)
- Frontend accessible at localhost:3000
- API calls to localhost:3000/api/health proxied to backend and return status ok

**Validation commands** (use docker-compose OR podman-compose):

```bash
# Docker Compose
docker-compose up -d
sleep 5
curl http://localhost:3000  # Should return HTML (frontend)
curl http://localhost:3000/api/health  # Should return {"status":"ok"} (backend via proxy)
docker-compose down

# OR Podman Compose (requires: pip install podman-compose)
podman-compose up -d
sleep 5
curl http://localhost:3000  # Should return HTML (frontend)
curl http://localhost:3000/api/health  # Should return {"status":"ok"} (backend via proxy)
podman-compose down
```

**Common failures**:

- Backend not accessible: Verify service name matches nginx proxy_pass (e.g., `http://backend:5000`)
- 404 on /api: Check nginx.conf proxy location and rewrite rules
- Containers not starting: Check logs with `docker-compose logs` or `podman-compose logs`
- Podman compose not found: Install with `pip install podman-compose`
- Podman networking issues: May need to specify network mode in compose file

**Required nginx.conf addition**:

```nginx
location /api/ {
    proxy_pass http://backend:5000/;
    proxy_set_header Host $host;
    proxy_read_timeout 120s;
}
```

**Key docker-compose.yml elements**:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    # No ports exposed to host (internal networking only)
  
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
```

**Note for Windows users**:

- Docker requires Docker Desktop (proprietary) or Docker Engine in WSL2
- Podman requires Podman Desktop (open-source) or podman in WSL2
- Both work equivalently with standard compose files

---

### Objective 7: Analyze CloudMask repository and API

**Context**: Access CloudMask repository (if available) or PyPI package to understand API surface, inputs/outputs, and configuration schema.

**Success criteria**:

- Documentation file created: `docs/cloudmask-api-analysis.md`
- Document contains: import statements, main functions/classes, input parameters, output formats, configuration schema
- Sample Python script in `backend/cloudmask_test.py` that successfully imports CloudMask and runs basic masking operation
- Test script runs successfully in backend container

**Validation commands**:

```bash
cd backend
pip install cloudmask-aws  # Or install from repo
python cloudmask_test.py
# Should output masked text without errors
```

**Common failures**:

- Package not found: Search PyPI for exact package name or verify git URL
- Import errors: Check dependencies in CloudMask's requirements
- Missing credentials: CloudMask may need AWS credentials (check documentation)

**If repository is inaccessible**: Document this limitation and create mock API in `backend/mock_cloudmask.py` with plausible interface:

```python
def mask_text(text: str, patterns: list) -> dict:
    return {"masked_text": text, "items_masked": 0}
```

---

### Objective 8: Implement backend /api/mask endpoint

**Context**: Create REST endpoint that accepts text and returns masked version using CloudMask.

**Success criteria**:

- `backend/api.py` has POST /api/mask endpoint
- Endpoint accepts JSON body: `{"text": str, "patterns": [str]}`
- Endpoint returns: `{"masked_text": str, "items_masked": int, "processing_time_ms": float}`
- Pydantic models exist for request/response validation
- Endpoint handles errors with appropriate HTTP status codes (400 for invalid input, 500 for processing errors)
- Manual test succeeds:

**Validation commands**:

```bash
cd backend
uvicorn api:app --reload &
sleep 2
curl -X POST http://localhost:8000/api/mask \
  -H "Content-Type: application/json" \
  -d '{"text": "My email is test@example.com", "patterns": ["email"]}'
# Should return JSON with masked_text
kill %1
```

**Common failures**:

- CloudMask integration issues: Use mock implementation initially, replace later
- Validation errors: Ensure Pydantic models match actual request structure
- Timeout issues: Add try/except around CloudMask calls

**Minimal endpoint template**:

```python
from pydantic import BaseModel

class MaskRequest(BaseModel):
    text: str
    patterns: list[str] = []

class MaskResponse(BaseModel):
    masked_text: str
    items_masked: int
    processing_time_ms: float

@app.post("/api/mask", response_model=MaskResponse)
def mask_text_endpoint(request: MaskRequest):
    # TODO: Integrate actual CloudMask
    return MaskResponse(
        masked_text=request.text,
        items_masked=0,
        processing_time_ms=0.0
    )
```

---

### Objective 9: Build frontend text input UI with Cloudscape

**Context**: Create React component with Textarea for text input and configuration controls using Cloudscape components.

**Success criteria**:

- `frontend/src/components/MaskingForm.jsx` exists
- Component renders Textarea wrapped in FormField
- Component includes Button for "Mask Data" action
- Component includes SpaceBetween layout with proper spacing
- Component has controlled state for textarea value
- Form displays in AppLayout content area
- No console errors when typing in textarea

**Validation**: Manually run `npm run dev` and verify UI appears correctly in browser

**Common failures**:

- Import errors: Verify exact import paths from @cloudscape-design/components
- Controlled input warnings: Ensure textarea has value prop and onChange handler
- Layout issues: Use SpaceBetween for vertical spacing, Container for grouping

**Component structure**:

```jsx
import { useState } from 'react';
import { Container, FormField, Textarea, Button, SpaceBetween } from '@cloudscape-design/components';

export function MaskingForm() {
  const [text, setText] = useState('');

  return (
    <Container>
      <SpaceBetween size="l">
        <FormField label="Input text" description="Paste or type text containing sensitive data">
          <Textarea
            value={text}
            onChange={e => setText(e.detail.value)}
            rows={15}
          />
        </FormField>
        <Button variant="primary">Mask data</Button>
      </SpaceBetween>
    </Container>
  );
}
```

---

### Objective 10: Connect frontend to backend API

**Context**: Wire up form submission to call POST /api/mask endpoint and display results.

**Success criteria**:

- `frontend/package.json` includes axios dependency
- MaskingForm component calls axios.post on button click
- Component displays loading state during API call (Button loading prop)
- Component displays results in separate Container after successful response
- Component displays error in Flashbar on API failure
- End-to-end test succeeds: Type text → Click mask → See masked result

**Validation**: Run full stack with `docker-compose up` or `podman-compose up`, use browser to submit form and verify results appear

**Common failures**:

- CORS errors: Verify backend CORS middleware allows origin, or ensure proxy is working
- Network errors: Check compose networking with `docker-compose logs` or `podman-compose logs`, verify services can communicate
- 404 on /api: Ensure nginx proxy configuration is correct and frontend container rebuilt
- Podman DNS resolution: Backend service name may not resolve in some Podman configurations, check network settings

**Integration code**:

```jsx
import axios from 'axios';
import { Alert, Spinner } from '@cloudscape-design/components';

const [loading, setLoading] = useState(false);
const [result, setResult] = useState(null);
const [error, setError] = useState(null);

async function handleMask() {
  setLoading(true);
  setError(null);
  try {
    const response = await axios.post('/api/mask', {
      text: text,
      patterns: []
    });
    setResult(response.data.masked_text);
  } catch (err) {
    setError(err.response?.data?.detail || 'Masking failed');
  } finally {
    setLoading(false);
  }
}
```

---

### Objective 11: Implement file upload UI

**Context**: Add file selection and upload capability using HTML file input and File API.

**Success criteria**:

- MaskingForm component includes hidden `<input type="file">` element
- Component includes Button with upload icon triggering file input click
- Component reads file content using FileReader API
- Component displays selected filename
- Component validates file size (warn >10MB, block >50MB)
- File content populates textarea after selection

**Validation**: Upload text file via UI, verify content appears in textarea

**Common failures**:

- FileReader encoding issues: Use `readAsText()` with UTF-8 encoding
- File size in wrong units: FileReader gives bytes, divide by 1024²  for MB
- Multiple file selection: Add `multiple` attribute if needed, or restrict to single

**File upload implementation**:

```jsx
import { useRef } from 'react';

const fileInputRef = useRef(null);

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 50 * 1024 * 1024) {
    setError('File too large (max 50MB)');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => setText(e.target.result);
  reader.readAsText(file);
}

// In JSX:
<input
  ref={fileInputRef}
  type="file"
  accept=".txt,.json,.csv"
  style={{display: 'none'}}
  onChange={handleFileSelect}
/>
<Button
  iconName="upload"
  onClick={() => fileInputRef.current?.click()}
>
  Load file
</Button>
```

---

### Objective 12: Implement configuration save with File System Access API

**Context**: Add ability to save masked output or configuration using browser file picker with fallback.

**Success criteria**:

- `frontend/package.json` includes browser-fs-access dependency
- Component includes "Save result" button
- Clicking button opens native file picker (Chrome/Edge) or triggers download (Firefox/Safari)
- Saved file contains masked text
- Error handling for user cancellation (AbortError)

**Validation**: Click save button, verify file picker appears and file saves correctly

**Common failures**:

- AbortError floods console: Catch and ignore AbortError specifically
- Permission denied: File System Access API needs HTTPS or localhost
- Polyfill not working: Verify import statement and library installation

**Save implementation**:

```jsx
import { fileSave } from 'browser-fs-access';

async function handleSave() {
  if (!result) return;
  
  const blob = new Blob([result], { type: 'text/plain' });
  try {
    await fileSave(blob, {
      fileName: 'masked-output.txt',
      extensions: ['.txt']
    });
  } catch (err) {
    if (err.name !== 'AbortError') {
      setError('Failed to save file');
    }
  }
}
```

---

### Objective 13: Add comprehensive error handling and UX polish

**Context**: Improve error messages, loading states, and edge case handling.

**Success criteria**:

- All async operations show loading indicators
- All errors display user-friendly messages in Flashbar
- Empty input validation prevents API calls
- Success messages confirm operations completed
- Keyboard shortcuts work (Enter to submit if textarea not focused)

**Validation**: Test error scenarios (disconnect backend, send invalid input, cancel file save) and verify UX handles gracefully

**Polish checklist**:

```jsx
// Validation before submit
if (!text.trim()) {
  setError('Please enter some text to mask');
  return;
}

// Success feedback
<Flashbar items={[
  {
    type: 'success',
    content: `Masked ${result?.items_masked} items in ${result?.processing_time_ms}ms`,
    dismissible: true,
    onDismiss: () => setNotifications([])
  }
]} />

// Loading state
<Button
  variant="primary"
  onClick={handleMask}
  loading={loading}
  disabled={!text.trim()}
>
  Mask data
</Button>
```

---

### Objective 14: Create deployment documentation

**Context**: Write comprehensive README with setup and usage instructions for both Docker and Podman.

**Success criteria**:

- `README.md` exists at project root
- Documentation includes: prerequisites (Docker OR Podman), installation steps, running commands, usage instructions, troubleshooting
- Quick start section gets user from zero to running application in <5 minutes for both runtimes
- Architecture diagram (ASCII or image) shows container relationship
- Clear guidance on choosing between Docker and Podman

**Validation**: Follow README instructions on clean system (or fresh directory) and verify application runs with both container runtimes

**Documentation structure**:

```markdown
# CloudMask Web Frontend

## Prerequisites

Choose ONE container runtime:

### Option A: Docker
- Docker Engine 20.10+ (Linux) OR Docker Desktop 4.0+ (Windows/macOS)
- Docker Compose v2

### Option B: Podman (Open Source Alternative)
- Podman 4.0+
- Podman Compose: `pip install podman-compose`
- **Windows users**: Install Podman Desktop or use WSL2 with podman

**Why Podman?** Fully open-source (Apache 2.0), no licensing restrictions, daemonless architecture, rootless by default. Drop-in replacement for Docker.

## Quick Start

### With Docker
```bash
git clone <repo>
cd cloudmask-web
docker-compose up -d
# Open http://localhost:3000
```

### With Podman

```bash
git clone <repo>
cd cloudmask-web
podman-compose up -d
# Open http://localhost:3000
```

## Architecture

- Frontend: React + Cloudscape (port 3000)
- Backend: FastAPI + CloudMask (internal only)
- Reverse proxy: Nginx routes /api to backend

## Development

### With Docker

- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && uvicorn api:app --reload`
- Build: `docker-compose build`
- Logs: `docker-compose logs -f`

### With Podman

- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && uvicorn api:app --reload`
- Build: `podman-compose build`
- Logs: `podman-compose logs -f`

## Troubleshooting

### Docker-specific issues

- Port conflicts: Check `docker ps` for existing containers
- Permission denied: Add user to docker group or use sudo
- Docker Desktop licensing: Required for enterprise use (250+ employees)

### Podman-specific issues

- Command not found: Install podman-compose: `pip install podman-compose`
- Networking issues: May need to configure CNI plugins
- Windows: Ensure podman machine is running: `podman machine start`
- Port binding errors: Use ports >1024 for rootless operation

### Both runtimes

- Backend unreachable: Verify service names in nginx.conf match compose file
- 404 on /api: Rebuild frontend container after nginx.conf changes
- Slow performance: Increase Docker Desktop/Podman Desktop resources

```

**Additional documentation files**:
- `DOCKER_VS_PODMAN.md` - Detailed comparison and migration guide
- `CONTRIBUTING.md` - Instructions for testing with both runtimes

---

## Agent steering and oversight

### When agents should request human input

Agents should HALT and request clarification when:
- **CloudMask API differs significantly** from assumptions (requires architectural changes)
- **Validation fails 3+ times** despite debugging attempts (indicates requirement ambiguity)
- **Security concern identified** (e.g., potential injection vulnerability in config validation)
- **Performance issue detected** (e.g., masking takes >30s on test data)
- **Docker networking fails** on specific host environment (macOS vs Linux differences)

### Human monitoring checkpoints

Review agent progress after:
1. **Objective 7** - CloudMask API analysis (ensure integration approach is sound)
2. **Objective 10** - First end-to-end flow working (validate UX direction)
3. **Objective 13** - Final polish complete (approve for deployment)

### Agent autonomy boundaries

**Agents CAN decide**:
- Exact component structure and file organization
- Error message wording (as long as user-friendly)
- CSS/styling details within Cloudscape patterns
- Timeout values, retry logic, buffer sizes
- Variable and function naming
- Test data for validation

**Agents MUST ask for**:
- Changes to technology stack (switching from FastAPI to Flask)
- Adding new external services or APIs
- Changes to security model (exposing backend port)
- Significant performance optimizations that change behavior
- Non-standard Docker configurations

### Recovery from stuck states

If agent gets stuck (same error 3+ times), human should:
1. **Analyze error pattern** - Is it environment-specific (Docker version, OS) or code issue?
2. **Simplify objective** - Break into smaller sub-objectives if too complex
3. **Provide example** - Show working code snippet for specific pattern
4. **Adjust validation** - Maybe success criteria too strict or test environment flaky
5. **Skip and return** - Mark objective as "needs manual attention", proceed to next

The agentic approach succeeds when objectives are atomic, validations are automated, and the human provides course corrections rather than detailed implementation guidance.

## Docker containerization strategy

### Multi-container architecture rationale

The recommended architecture uses **two separate containers** orchestrated by Docker Compose or Podman Compose rather than a monolithic single-container approach. While single containers are simpler, multi-container deployment provides significant advantages for this use case:

**Security isolation**: The backend API container never exposes ports to the host machine, eliminating direct attack surface. Only Nginx receives external traffic, acting as a hardened gateway. This defense-in-depth approach prevents accidental backend exposure during deployment.

**Independent scaling**: Though this application is single-user, separating concerns enables future extensions like background job processing, database integration, or shared deployment models without architectural refactoring.

**Simpler updates**: Frontend updates deploy by rebuilding only the client container, preserving backend state and connections. This reduces downtime and simplifies rollback if frontend changes introduce issues.

**Cleaner development workflow**: Developers can rebuild and restart frontend or backend independently. Backend developers work without node/npm installed, frontend developers work without Python environments, and hot reload works naturally in both containers.

**Runtime flexibility**: Using standard OCI container images and compose specifications means the same deployment works with Docker or Podman without changes, giving users freedom to choose based on their licensing, security, or organizational requirements.

### Container runtime: Docker vs Podman

Both Docker and Podman are supported as equivalent alternatives. The choice depends on your requirements:

**Docker**:
- ✅ Most widely adopted, extensive ecosystem
- ✅ Better GUI tools (Docker Desktop)
- ✅ More mature compose implementation
- ❌ Docker Desktop requires licensing for large organizations (250+ employees, $10M+ revenue)
- ❌ Daemon-based architecture requires root access
- ❌ Proprietary components in Docker Desktop

**Podman**:
- ✅ Fully open-source (Apache 2.0 license), no licensing restrictions
- ✅ Daemonless architecture - more secure, no root daemon
- ✅ Rootless by default - containers run as non-root user
- ✅ Drop-in Docker CLI compatibility (`alias docker=podman`)
- ✅ Perfect for Windows users seeking open-source solutions
- ❌ Smaller ecosystem, fewer GUI tools
- ❌ Podman Compose slightly less mature than Docker Compose

**Recommendation**: Use Podman if open-source licensing matters, especially on Windows. Use Docker if you need the most mature tooling and don't have licensing concerns.

### Dockerfile specifications

**Frontend Dockerfile** (Dockerfile.client):

```dockerfile
# Build stage - compile React application
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source and build
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Production stage - serve with Nginx
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The multi-stage pattern reduces final image size from ~900MB (with Node) to ~50MB (just Nginx + static files). The build stage leverages npm ci for faster, deterministic installs and separates dependency installation from source copying to maximize layer caching in both Docker and Podman.

**Backend Dockerfile** (Dockerfile.api):

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies if CloudMask needs compiled libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "api:app"]
```

The slim Python base image excludes unnecessary tools, saving 800MB compared to the full image. Installing system dependencies in a single RUN statement minimizes layers. Running as non-root user appuser follows security best practices and works identically in Docker and Podman (though Podman adds additional rootless isolation).

### Compose configuration (Docker/Podman compatible)

**docker-compose.yml** (also works as podman-compose.yml):

```yaml
version: '3.8'

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - FLASK_ENV=production
      - CLOUDMASK_CONFIG_PATH=/app/config
    volumes:
      - config-data:/app/config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  client:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  config-data:
```

This compose file works without changes in both Docker Compose and Podman Compose. The `depends_on` directive ensures the API starts before the frontend, preventing startup race conditions. Named volume `config-data` persists configuration files across container restarts. Health checks automatically restart the API container if it becomes unresponsive. The restart policy ensures the application recovers from crashes without manual intervention.

### Nginx reverse proxy configuration

**nginx.conf**:

```nginx
server {
    listen 80;
    server_name localhost;

    # Serve React static files
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://api:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running operations
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

The `try_files` directive enables React Router's client-side routing by serving index.html for all unmatched routes. Proxy headers preserve original request information for backend logging. Extended timeouts accommodate file processing operations that may exceed Nginx's 60-second default. This configuration works identically with Docker and Podman networking.
WORKDIR /app

# Install system dependencies if CloudMask needs compiled libraries

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code

COPY *.py ./

# Create non-root user for security

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "api:app"]

```

The slim Python base image excludes unnecessary tools, saving 800MB compared to the full image. Installing system dependencies in a single RUN statement minimizes layers. Running as non-root user appuser follows security best practices by limiting container privileges.

### Docker Compose configuration

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - FLASK_ENV=production
      - CLOUDMASK_CONFIG_PATH=/app/config
    volumes:
      - config-data:/app/config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  client:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  config-data:
```

The `depends_on` directive ensures the API starts before the frontend, preventing startup race conditions. Named volume `config-data` persists configuration files across container restarts. Health checks automatically restart the API container if it becomes unresponsive. The restart policy ensures the application recovers from crashes without manual intervention.

### Nginx reverse proxy configuration

**nginx.conf**:

```nginx
server {
    listen 80;
    server_name localhost;

    # Serve React static files
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://api:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running operations
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

The `try_files` directive enables React Router's client-side routing by serving index.html for all unmatched routes. Proxy headers preserve original request information for backend logging. Extended timeouts accommodate file processing operations that may exceed Nginx's 60-second default.

## File handling implementation strategy

### File System Access API with fallbacks

The File System Access API provides native file picker dialogs but only works in Chromium browsers (Chrome, Edge, Opera). **Firefox and Safari have zero support with no announced implementation plans**, requiring mandatory fallback mechanisms for a functional cross-browser application.

### Recommended approach: browser-fs-access library

Install the browser-fs-access polyfill library created by Google Chrome Labs:

```bash
npm install browser-fs-access
```

This library automatically detects browser capabilities and uses File System Access API when available, gracefully degrading to traditional `<a download>` mechanisms on unsupported browsers. The API remains consistent regardless of underlying implementation.

**Save file implementation**:

```javascript
import { fileSave } from 'browser-fs-access';

async function saveConfig(configData) {
  const blob = new Blob([JSON.stringify(configData, null, 2)], { 
    type: 'application/json' 
  });
  
  try {
    await fileSave(blob, {
      fileName: 'cloudmask-config.json',
      extensions: ['.json'],
      description: 'CloudMask Configuration'
    });
    
    setNotifications([{
      type: 'success',
      content: 'Configuration saved successfully'
    }]);
  } catch (err) {
    if (err.name !== 'AbortError') {  // User cancelled
      setNotifications([{
        type: 'error',
        content: 'Failed to save configuration: ' + err.message
      }]);
    }
  }
}
```

On Chrome/Edge, this displays the native file picker allowing users to choose location and filename. On Firefox/Safari, it triggers an automatic download to the default downloads folder with the suggested filename. The UX differs but both accomplish the save operation.

**Load file implementation**:

```javascript
import { fileOpen } from 'browser-fs-access';

async function loadConfig() {
  try {
    const blob = await fileOpen({
      mimeTypes: ['application/json'],
      extensions: ['.json'],
      description: 'CloudMask Configuration'
    });
    
    const text = await blob.text();
    const config = JSON.parse(text);
    
    // Validate config structure
    const response = await axios.post('/api/config/validate', config);
    if (response.data.valid) {
      setConfiguration(config);
      setNotifications([{
        type: 'success',
        content: 'Configuration loaded successfully'
      }]);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      setNotifications([{
        type: 'error',
        content: 'Failed to load configuration: ' + err.message
      }]);
    }
  }
}
```

The library normalizes the file selection experience across browsers and handles error cases consistently. User cancellation throws AbortError which should be caught but not reported as an error.

### Clipboard integration

The Clipboard API has **excellent cross-browser support for text operations** in all modern browsers (Chrome, Firefox, Safari, Edge). Text-based clipboard functionality is reliable and requires no fallbacks.

**Paste implementation**:

```javascript
import Button from '@cloudscape-design/components/button';

async function handlePasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    setInputText(text);
    setNotifications([{
      type: 'success',
      content: 'Text pasted from clipboard'
    }]);
  } catch (err) {
    // Permission denied or clipboard empty
    setNotifications([{
      type: 'error',
      content: 'Could not access clipboard. Please use Ctrl+V to paste.'
    }]);
  }
}

// In component JSX
<SpaceBetween direction="horizontal" size="xs">
  <Button iconName="copy" onClick={handlePasteFromClipboard}>
    Paste from clipboard
  </Button>
</SpaceBetween>
```

Clipboard read operations require user activation (must be triggered by a click or other gesture) and may prompt for permission on first use. Always wrap in try-catch to handle permission denial gracefully. The fallback instruction directs users to use standard keyboard shortcuts which always work.

**Copy implementation**:

```javascript
import { CopyToClipboard } from '@cloudscape-design/components/copy-to-clipboard';

// Simple approach with built-in component
<CopyToClipboard
  textToCopy={maskedResult}
  copySuccessText="Copied to clipboard"
  copyErrorText="Failed to copy"
/>

// Or manual implementation for custom UI
async function copyResult() {
  try {
    await navigator.clipboard.writeText(maskedResult);
    setNotifications([{
      type: 'success',
      content: 'Results copied to clipboard'
    }]);
  } catch (err) {
    setNotifications([{
      type: 'error',
      content: 'Failed to copy results'
    }]);
  }
}
```

Cloudscape's CopyToClipboard component handles all the complexity including fallbacks for older browsers. For custom implementations, write operations are more reliable than read and typically don't require explicit permissions.

### Browser capability detection and user messaging

Detect File System Access API availability and inform users about limitations:

```javascript
import { useState, useEffect } from 'react';
import Alert from '@cloudscape-design/components/alert';

function App() {
  const [hasFileSystemAccess, setHasFileSystemAccess] = useState(false);

  useEffect(() => {
    setHasFileSystemAccess('showSaveFilePicker' in window);
  }, []);

  return (
    <AppLayout content={
      <SpaceBetween size="l">
        {!hasFileSystemAccess && (
          <Alert type="warning" header="Limited file system access">
            Your browser doesn't support advanced file system access. 
            Files will be saved to your default downloads folder. 
            For the best experience, use Chrome or Edge.
          </Alert>
        )}
        {/* Rest of application */}
      </SpaceBetween>
    } />
  );
}
```

This non-blocking warning educates users about browser-specific behavior without preventing application use. Position it prominently but dismissibly so users understand limitations upfront.

## Development timeline estimate

**Total estimated duration: 6-7 weeks for core functionality**, with an optional 1-2 weeks for enhancements.

This timeline assumes:

- One full-time developer with React and Python experience
- CloudMask repository access obtained within first week
- No major architectural surprises in CloudMask's actual implementation
- Standard complexity for masking operations (no GPU acceleration or distributed processing)

**Accelerators** that could reduce timeline:

- Developer already familiar with Cloudscape Design System (-1 week)
- CloudMask has well-documented Python API with examples (-3-5 days)
- Using pre-built Docker base images with CloudMask dependencies pre-installed (-2-3 days)
- Skipping batch file processing and advanced features (-1 week)

**Risk factors** that could extend timeline:

- CloudMask requires significant refactoring to expose API (+1-2 weeks)
- Complex configuration schema requiring extensive validation (+3-5 days)
- Performance issues with large files requiring optimization (+1 week)
- Undocumented CloudMask dependencies causing installation issues (+2-5 days)

The phased approach enables early validation of technical feasibility. After Phase 2 (CloudMask integration), the team will have concrete evidence of API complexity and can revise subsequent phase estimates accordingly.

## Key technical considerations and risks

### Repository access and API surface uncertainty

**Risk**: The CloudMask repository is currently inaccessible, creating uncertainty about its actual API design, configuration options, and integration complexity. The actual implementation may differ significantly from assumptions.

**Mitigation**: Obtain repository access before beginning Phase 2. Allocate 2-3 days for thorough API analysis before writing any integration code. If the API is CLI-only with no Python library interface, budget additional time for subprocess wrapper implementation or consider forking CloudMask to expose a programmatic API.

**Impact if not addressed**: Potentially 1-2 weeks of rework if architectural assumptions prove incorrect. Could require switching from direct Python imports to CLI invocation via subprocess, affecting error handling and performance.

### Browser compatibility for file operations

**Risk**: File System Access API's Chromium-only support means 40% of users (Firefox/Safari) will experience degraded file save UX with downloads instead of picker dialogs. Mobile browsers have zero support for this API.

**Mitigation**: Use browser-fs-access polyfill library for automatic fallbacks. Display browser-specific guidance in the UI when File System Access API is unavailable. Consider the application primarily desktop-focused and document browser requirements clearly. Test extensively on Firefox and Safari to ensure fallback mechanisms work reliably.

**Impact if not addressed**: Frustrated users on Firefox/Safari, potential confusion about where files are saved, and support burden from users expecting picker dialogs that never appear.

### Large file processing performance

**Risk**: Masking operations on large files (100MB+ logs or CSV exports) may take 30-120 seconds, risking timeout errors, browser unresponsiveness, or poor user experience during processing.

**Mitigation**: Implement chunked processing in the backend, streaming partial results as they complete. Use ProgressBar with WebSocket or Server-Sent Events for real-time progress updates. Set Gunicorn timeout to 120+ seconds and configure Nginx timeouts appropriately. For very large files, consider background job processing with result polling rather than synchronous request-response.

**Impact if not addressed**: Timeouts causing 504 Gateway Timeout errors, lost work, and perception of broken functionality. Users may reload the page mid-processing, further degrading performance.

### Docker networking complexity for developers

**Risk**: Developers unfamiliar with Docker or Podman networking may struggle with the service-name-based communication pattern, localhost vs container hostname confusion, and port mapping concepts.

**Mitigation**: Provide comprehensive README with networking diagrams showing request flow from browser → localhost:3000 → Nginx container → api:5000 → backend container. Include troubleshooting section for common issues like "connection refused" (backend not started) or "404 on /api" (Nginx misconfigured). Create helper scripts for common operations like viewing logs, restarting services, or accessing container shells. Document Podman-specific networking quirks (rootless mode, slirp4netns).

**Impact if not addressed**: Extended debugging sessions, frustration during development, and potential workarounds like exposing backend ports directly that violate the architecture's security model.

### Podman-specific considerations

**Risk**: Podman has subtle differences from Docker that may cause confusion or unexpected behavior, especially on Windows with WSL2.

**Mitigation**:

- Document Podman machine setup for Windows users (`podman machine init && podman machine start`)
- Explain rootless vs rootful modes and when each is appropriate
- Provide equivalent commands for all Docker commands (though most are identical)
- Test thoroughly on both runtimes during development
- Note that some Docker Compose features may not work identically in Podman Compose

**Podman-specific gotchas**:

- Rootless containers can't bind to ports <1024 by default (use 8080 instead of 80 if needed)
- DNS resolution between containers may require explicit network configuration
- Volume mounting may have different permission semantics
- Podman Compose may lag behind Docker Compose feature parity

**Impact if not addressed**: Windows users choosing Podman for open-source benefits may encounter unexpected issues and abandon the project, or revert to Docker Desktop despite licensing preferences.

### Configuration validation complexity

**Risk**: If CloudMask supports complex regex patterns, nested conditions, or domain-specific language for masking rules, validating user-entered configurations may require significant effort and create opportunities for injection attacks or crashes.

**Mitigation**: Implement backend validation for all configuration using Pydantic models with strict schemas. Sandbox regex pattern testing in the frontend with timeout protection to prevent ReDoS attacks. Provide extensive preset configurations to minimize manual regex authoring. Consider using CodeEditor with JSON Schema validation for structured feedback.

**Impact if not addressed**: Application crashes from malformed regex, potential security vulnerabilities from code injection through configuration, and poor user experience with cryptic error messages about pattern failures.

### Single-container vs multi-container decision complexity

**Risk**: While multi-container architecture is recommended, some deployment scenarios (resource-constrained environments, airgapped systems, or extreme simplicity requirements) may benefit from single-container deployment despite the tradeoffs.

**Mitigation**: Design the application to support both architectures with minimal changes. Keep frontend/backend coupling loose through well-defined REST API contracts. Document both deployment approaches in README with clear tradeoffs. Provide separate docker-compose.yml configurations for each approach. Ensure both work with Docker and Podman.

**Impact if not addressed**: Need to maintain two parallel architectures, or boxing users into one approach that doesn't fit their deployment constraints or container runtime preferences.

### Container runtime choice and compatibility

**Risk**: Supporting both Docker and Podman doubles the testing surface area and may lead to runtime-specific bugs or documentation gaps.

**Mitigation**:

- Use only standard OCI container features and Compose v3.8 specifications
- Avoid Docker-specific extensions or Podman-specific features
- Test all objectives with both runtimes before marking complete
- Create automated test script that validates deployment on both runtimes
- Document known incompatibilities clearly in README

**Testing checklist for each objective**:

```bash
# Test with Docker
docker build ...
docker-compose up -d
# Verify functionality
docker-compose down

# Test with Podman
podman build ...
podman-compose up -d
# Verify functionality
podman-compose down
```

**Impact if not addressed**: Users choosing Podman for open-source benefits encounter broken functionality, creating support burden and damaging project reputation. Windows users particularly affected as Podman is their only fully open-source option.

### State management for complex workflows

**Risk**: If configuration management, multi-file processing, or undo/redo functionality becomes complex, React's useState may become insufficient, leading to prop drilling, unnecessary re-renders, or difficult-to-track state bugs.

**Mitigation**: Start simple with useState and useContext. Only introduce Zustand or similar state management if clear pain points emerge (typically in Phase 5 or later). Design components to be as stateless as possible, deriving data from props. Use React DevTools to profile re-renders and identify performance issues before adding complexity.

**Impact if not addressed**: Over-engineered state management in Phase 1-3 wastes time, while under-engineered state in Phase 5+ leads to buggy, hard-to-maintain code requiring refactoring.

### HTTPS requirements for Clipboard/File APIs

**Risk**: File System Access API and Clipboard API require secure contexts (HTTPS or localhost). Production deployment to non-localhost domains without HTTPS will break core functionality.

**Mitigation**: Development uses localhost (works with HTTP), but document clearly that production deployment requires HTTPS. For standalone Docker deployment, provide example configurations for adding Traefik or nginx-proxy-manager as HTTPS termination layer, or document Let's Encrypt certificate integration. Consider self-signed certificates acceptable for single-user standalone deployments.

**Impact if not addressed**: Application appears to work in development but fails in production with cryptic browser security errors. Users may not understand why file save doesn't work, creating support burden and potential data loss if they assume saves succeeded.

---

## Summary and next steps

This project plan provides a production-ready architecture for CloudMask's web frontend using industry-standard technologies and AWS Cloudscape Design System for a polished, accessible UI. The multi-container approach (Docker or Podman) balances security, maintainability, and simplicity appropriate for standalone single-user deployment.

**Critical dependencies before starting implementation:**

1. Obtain CloudMask repository access and analyze actual API surface
2. Confirm CloudMask installation requirements and dependency management
3. Validate performance characteristics with representative data volumes
4. Choose FastAPI vs Flask based on team experience and CloudMask's async requirements
5. **Choose container runtime** (Docker or Podman) based on licensing requirements and organizational constraints

**Container runtime decision guide:**

- **Choose Docker if**: Using macOS/Windows with Docker Desktop license already available, need most mature tooling ecosystem, team already familiar with Docker
- **Choose Podman if**: Need fully open-source solution (especially important on Windows), want rootless containers by default, organization has licensing concerns about Docker Desktop
- **Use both**: Support both runtimes for maximum flexibility - the plan is designed for compatibility

**Recommended immediate actions:**

1. **Install container runtime**: Docker Desktop + Docker Compose OR Podman + Podman Compose
2. Set up development environment with Node.js and Python tooling
3. Create project repository structure with /frontend, /backend, and /docs directories
4. Initialize skeleton React app with Vite and Cloudscape packages
5. Build basic containers and verify multi-container communication with chosen runtime
6. Schedule CloudMask integration sprint once repository access is secured
7. **Test with both runtimes** if supporting both is important for your users

**Agentic development advantages:**

- Agents can test both Docker and Podman automatically during validation steps
- Each objective includes runtime-specific validation commands
- Agents can parallelize development (one tests Docker while another tests Podman)
- Self-healing: agents retry with alternative approach if one runtime fails
- Documentation automatically covers both runtimes throughout

The phased approach enables early risk mitigation through CloudMask integration validation in Objective 7, with subsequent objectives building incrementally on proven foundations. The dual-runtime support ensures maximum flexibility for users while maintaining a single codebase. Budget flexibility of ±2 weeks to accommodate discoveries during CloudMask analysis and dual-runtime testing.
