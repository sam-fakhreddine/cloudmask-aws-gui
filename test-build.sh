#!/bin/bash
# Test script for single container build

set -e

echo "🧪 Testing CloudMask GUI Single Container Build"
echo ""

# Check if Docker or Podman is available
if command -v docker &> /dev/null; then
    RUNTIME="docker"
    COMPOSE="docker-compose"
elif command -v podman &> /dev/null; then
    RUNTIME="podman"
    COMPOSE="podman compose"
else
    echo "❌ Neither Docker nor Podman found"
    exit 1
fi

echo "✓ Using $RUNTIME"
echo ""

# Build the container
echo "📦 Building container..."
$COMPOSE build

echo ""
echo "✓ Build successful!"
echo ""

# Start services
echo "🚀 Starting services..."
$COMPOSE up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:7337/health > /dev/null 2>&1; then
    echo "✓ Health check passed"
else
    echo "❌ Health check failed"
    $COMPOSE logs app
    exit 1
fi

# Test static file serving
echo "🌐 Testing static file serving..."
if curl -f http://localhost:7337/ > /dev/null 2>&1; then
    echo "✓ Static files served"
else
    echo "❌ Static file serving failed"
    $COMPOSE logs app
    exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "🌐 Open http://localhost:7337 in your browser"
echo ""
echo "To stop: $COMPOSE down"
