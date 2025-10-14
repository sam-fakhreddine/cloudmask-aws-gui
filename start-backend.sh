#!/bin/bash
# Start CloudMask GUI Backend

cd "$(dirname "$0")"

# Build frontend if dist doesn't exist
if [ ! -d "backend/dist" ]; then
    echo "Building frontend..."
    cd frontend
    npm run build
    cd ..
    cp -r frontend/dist backend/
fi

# Start backend
cd backend
source ../.venv/bin/activate
uvicorn api:app --host 0.0.0.0 --port 7337 --reload
