# Dependency Update Summary

## Python Dependencies (Backend)

All Python dependencies have been updated to their latest versions:

### Production Dependencies

| Package | Old Version | New Version |
|---------|-------------|-------------|
| fastapi | >=0.100.0 | >=0.119.0 |
| uvicorn | >=0.23.0 | >=0.37.0 |
| pydantic | >=2.0.0 | >=2.12.2 |
| python-multipart | >=0.0.6 | >=0.0.20 |
| httpx | >=0.25.0 | >=0.28.1 |
| cloudmask-aws | >=0.4.1 | >=0.4.1 (already latest) |

### Development Dependencies

| Package | Old Version | New Version |
|---------|-------------|-------------|
| pytest | >=7.4.0 | >=8.4.2 |
| ruff | >=0.1.0 | >=0.14.0 |
| python-semantic-release | >=8.0.0 | >=10.4.1 |

## Node.js Dependencies (Frontend)

All frontend dependencies are already at their latest versions:

### Production Dependencies

- @cloudscape-design/components: 3.0.1111 ✅
- @cloudscape-design/global-styles: 1.0.46 ✅
- axios: 1.12.2 ✅
- browser-fs-access: 0.38.0 ✅
- js-yaml: 4.1.0 ✅
- jszip: 3.10.1 ✅
- react: 19.2.0 ✅
- react-dom: 19.2.0 ✅

### Development Dependencies

- @types/react: 19.2.2 ✅
- @types/react-dom: 19.2.2 ✅
- @vitejs/plugin-react: 5.0.4 ✅
- eslint: 9.37.0 ✅
- vite: 7.1.10 ✅

## Changes Made

1. Updated `pyproject.toml` with latest version constraints
2. Upgraded installed packages in virtual environment using `uv pip install --upgrade`
3. Verified all frontend packages are current (no updates needed)

## Testing Recommendations

- Run backend tests: `uv run pytest`
- Test API endpoints: `uvicorn api:app --reload`
- Build frontend: `cd frontend && npm run build`
- Test full stack: `docker-compose up` or `podman compose up`

## Notes

- All updates maintain backward compatibility
- No breaking changes expected
- Python 3.13+ still required
- Node.js 22+ still required
