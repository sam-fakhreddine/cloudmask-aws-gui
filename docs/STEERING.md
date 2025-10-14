# CloudMask GUI - Steering Document

## Vision

Provide a polished, accessible web interface for CloudMask that makes AWS infrastructure anonymization effortless for single users working with LLMs.

## Core Principles

### 1. Simplicity First

- Single-user standalone deployment (not multi-tenant SaaS)
- Minimal configuration required to get started
- Progressive disclosure of advanced features
- No authentication/authorization complexity

### 2. Security by Default

- Mapping files secured with 600 permissions
- Backend validates all inputs
- Regex sandboxing prevents ReDoS attacks
- HTTPS required for production

### 3. Container Runtime Agnostic

- Support both Docker and Podman equally
- Use only OCI-standard features
- Test with both runtimes
- Document both approaches

### 4. Modern Stack

- React + TypeScript for type safety
- AWS Cloudscape for enterprise-grade UI
- Vite for fast development
- Python 3.13+ with latest features

## Architectural Decisions

### Multi-Container Architecture (Chosen)

**Rationale**: Separates concerns, enables independent scaling, follows industry best practices.

**Components**:

- Frontend container (Nginx serving React SPA)
- Backend container (Python API wrapping CloudMask)
- Nginx reverse proxy (routes /api to backend)

**Alternatives Considered**:

- Single container: Simpler but couples frontend/backend, harder to maintain
- Separate deployments: Over-engineered for single-user use case

### AWS Cloudscape Design System (Chosen)

**Rationale**:

- Enterprise-grade accessibility (WCAG 2.1 AA)
- Consistent with AWS console UX
- Comprehensive component library
- Well-documented and maintained

**Alternatives Considered**:

- Material-UI: More generic, less AWS-aligned
- Ant Design: Good but not AWS-focused
- Custom components: Too much effort for polish level needed

### FastAPI vs Flask (TBD)

**Decision Criteria**:

- Team Python experience
- CloudMask async requirements
- API complexity needs

**Recommendation**: Start with Flask for simplicity, migrate to FastAPI if async becomes critical.

### State Management

**Current**: React useState + useContext
**Future**: Add Zustand only if clear pain points emerge (Phase 5+)
**Rationale**: Avoid premature optimization, keep components simple

## Technical Constraints

### Browser APIs

- File System Access API requires HTTPS or localhost
- Clipboard API requires secure context
- Development on localhost works with HTTP
- Production MUST use HTTPS

### Container Networking

- Frontend: Port 7337 (development) or 80/443 (production)
- Backend: Port 5000 (internal only)
- Nginx: Reverse proxy /api → backend:5000

### Python Environment

- Python 3.13+ required (latest features and performance)
- Use `uv` for package management
- Virtual environment in `.venv`

## Risk Mitigation

### CloudMask Integration Unknown

- **Risk**: API surface area unclear
- **Mitigation**: Early integration spike (Objective 7)
- **Fallback**: Wrap CLI if library API insufficient

### Container Networking Complexity

- **Risk**: Users struggle with multi-container setup
- **Mitigation**: Comprehensive networking diagrams, helper scripts
- **Fallback**: Provide single-container option

### Configuration Validation

- **Risk**: Malformed regex crashes app or creates security holes
- **Mitigation**: Backend Pydantic validation, frontend sandboxing
- **Fallback**: Extensive presets to minimize manual regex

### Podman Compatibility

- **Risk**: Subtle differences from Docker cause issues
- **Mitigation**: Test both runtimes, document differences
- **Fallback**: Docker-only if Podman proves too problematic

## Success Metrics

### Functional

- ✅ Anonymize text in <5 seconds for typical input
- ✅ Unanonymize with 100% accuracy
- ✅ Configuration validation catches all invalid patterns
- ✅ Works identically on Docker and Podman

### User Experience

- ✅ First-time setup in <10 minutes
- ✅ Core workflow requires <5 clicks
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Clear error messages with actionable guidance

### Technical

- ✅ <100ms API response time for typical requests
- ✅ Frontend bundle <500KB gzipped
- ✅ Zero security vulnerabilities in dependencies
- ✅ 100% type coverage in TypeScript

## Non-Goals

- ❌ Multi-user support / authentication
- ❌ Cloud deployment / SaaS offering
- ❌ Mobile app (responsive web only)
- ❌ Real-time collaboration
- ❌ Integration with AWS APIs directly
- ❌ Support for non-AWS cloud providers (future consideration)

## Development Phases

### Phase 1: Foundation (Week 1)

Setup, basic UI, container architecture

### Phase 2: Core Features (Week 2-3)

Anonymization workflow, basic configuration

### Phase 3: Configuration (Week 4)

Advanced config management, validation

### Phase 4: Advanced Features (Week 5-6)

Batch processing, clipboard integration

### Phase 5: Polish (Week 7-8)

Error handling, accessibility, documentation

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| TBD | Multi-container architecture | Separation of concerns, maintainability |
| TBD | AWS Cloudscape Design System | Enterprise accessibility, AWS alignment |
| TBD | Support Docker + Podman | Open-source option for Windows users |
| TBD | Python 3.13+ minimum | Latest features and performance improvements |
| TBD | uv for package management | Faster, more reliable than pip |

## Open Questions

1. **FastAPI vs Flask**: Depends on CloudMask async requirements
2. **Single-container option**: Provide as alternative deployment?
3. **Windows testing**: WSL2 + Podman validation needed
4. **HTTPS setup**: Self-signed certs acceptable for standalone?
5. **State management**: When to introduce Zustand?

## References

- [CloudMask Repository](https://github.com/sam-fakhreddine/cloudmask-aws)
- [AWS Cloudscape](https://cloudscape.design/)
- [Podman Documentation](https://docs.podman.io/)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
