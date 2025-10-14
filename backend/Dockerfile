FROM python:3.13-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy project files
COPY pyproject.toml uv.lock ./
COPY backend/ ./backend/

# Install dependencies
RUN uv pip install --system -e ".[dev]"

WORKDIR /app/backend

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5337

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "5337"]
