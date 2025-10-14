# English to RegEx AI Helper

## Overview

Convert natural language descriptions to regex patterns using Ollama AI (bundled in the stack).

## Quick Start

```bash
# Start CloudMask GUI (includes Ollama)
docker-compose up -d

# Pull the recommended model into the bundled Ollama
docker exec cloudmask-ollama ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Open browser
open http://localhost:7337
```

## Bundled Ollama

CloudMask GUI includes Ollama in the Docker stack:
- **Internal**: `ollama:11434` (container-to-container)
- **External**: `localhost:11435` (host access)
- **Storage**: Persistent volume for models

## Recommended Models

| Model | Size | Speed | Quality | Command |
|-------|------|-------|---------|---------|
| **Qwen2.5-Coder 7B** ⭐ | 4.7GB | Fast | Excellent | `docker exec cloudmask-ollama ollama pull qwen2.5-coder:7b-instruct-q4_K_M` |
| Gemma 2 2B | 1.6GB | Faster | Great | `docker exec cloudmask-ollama ollama pull gemma2:2b` |
| Phi-3 Mini | 2.3GB | Fast | Great | `docker exec cloudmask-ollama ollama pull phi3:mini` |
| Qwen2.5 0.5B | 400MB | Blazing | Good | `docker exec cloudmask-ollama ollama pull qwen2.5:0.5b` |

## Usage

1. Pull a model (see commands above)
2. Open CloudMask GUI → "RegEx Builder" tab
3. Select model from dropdown
4. Enter description: "Match email addresses"
5. Click "Generate RegEx"
6. Test pattern in OpenRegex below

## Examples

| Description | Generated RegEx |
|-------------|----------------|
| Match email addresses | `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` |
| Find AWS account IDs | `\b\d{12}\b` |
| Match IPv4 addresses | `\b(?:\d{1,3}\.){3}\d{1,3}\b` |
| Find VPC IDs | `vpc-[a-f0-9]{8,17}` |

## Managing Models

```bash
# List models
docker exec cloudmask-ollama ollama list

# Pull model
docker exec cloudmask-ollama ollama pull gemma2:2b

# Remove model
docker exec cloudmask-ollama ollama rm gemma2:2b

# Access Ollama from host
curl http://localhost:11435/api/tags
```

## Troubleshooting

### No Models Available

```bash
docker exec cloudmask-ollama ollama pull qwen2.5-coder:7b-instruct-q4_K_M
```

### Slow First Generation

First generation loads the model (~5-10s). Subsequent generations are faster (~1-2s).

### Out of Memory

Use smaller model:
```bash
# Lightweight alternative (400MB)
docker exec cloudmask-ollama ollama pull qwen2.5:0.5b

# Or medium size (1.6GB)
docker exec cloudmask-ollama ollama pull gemma2:2b
```

### Check Ollama Status

```bash
docker logs cloudmask-ollama
docker exec cloudmask-ollama ollama list
```
