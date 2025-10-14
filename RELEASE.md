# Release Workflow

## CloudMask CLI (cloudmask-aws repo)

### Version Bump & Release Process

1. **Create feature branch**

   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and commit**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Bump version in feature branch**

   ```bash
   # Use semantic versioning based on changes:
   # - MAJOR: Breaking changes (feat! or BREAKING CHANGE:)
   # - MINOR: New features (feat:)
   # - PATCH: Bug fixes (fix:)
   
   # Manual version bump in pyproject.toml
   # Or use script if available
   ```

4. **Push feature branch**

   ```bash
   git push -u origin feature/your-feature
   ```

5. **Create Pull Request**
   - Open PR on GitHub
   - Wait for CI checks to pass
   - Get approval from reviewers

6. **Merge PR**
   - Merge to master/main

7. **Tag the release**

   ```bash
   git checkout master
   git pull
   git tag -a v0.x.x -m "Release v0.x.x"
   git push --tags
   ```

8. **Publish to PyPI**
   - GitHub Actions should auto-publish on tag
   - Or manually: `python -m build && twine upload dist/*`

## CloudMask GUI (cloudmask-aws-gui repo)

### After CLI Release

1. **Update dependency**

   ```bash
   cd cloudmask-gui
   uv pip install --upgrade cloudmask-aws
   uv lock
   ```

2. **Test changes**

   ```bash
   uv run python -c "from backend.api import app; print('OK')"
   ```

3. **Commit and push**

   ```bash
   git add pyproject.toml uv.lock
   git commit -m "chore: update cloudmask-aws to v0.x.x"
   git push
   ```

4. **Rebuild containers**

   ```bash
   docker-compose build
   # or
   podman compose build
   ```

## Version Numbering

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

## Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature → MINOR bump
- `fix`: Bug fix → PATCH bump
- `feat!`: Breaking change → MAJOR bump
- `chore`: Maintenance → No bump
- `docs`: Documentation → No bump
- `refactor`: Code restructuring → No bump
