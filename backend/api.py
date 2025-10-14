"""CloudMask GUI Backend API."""

import json
import logging
import re
import time
from pathlib import Path

import httpx
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from cloudmask import CloudMask, CloudUnmask, Config
from cloudmask.config.config import CustomPattern

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CloudMask GUI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "CloudMask GUI API", "docs": "/docs"}


class MaskRequest(BaseModel):
    text: str
    config: dict = {}


class MaskResponse(BaseModel):
    masked_text: str
    items_masked: int
    processing_time_ms: float


@app.post("/api/mask", response_model=MaskResponse)
def mask_text_endpoint(request: MaskRequest):
    """Mask sensitive data in text."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    start_time = time.perf_counter()
    
    try:
        cfg = request.config
        config = Config(
            company_names=cfg.get('company_names', []),
            preserve_prefixes=cfg.get('preserve_prefixes', True),
            anonymize_ips=cfg.get('anonymize_ips', True),
            anonymize_domains=cfg.get('anonymize_domains', False),
            seed=cfg.get('seed', None)
        )
        
        # Add custom patterns if provided
        if cfg.get('custom_patterns'):
            config.custom_patterns = [
                CustomPattern(name=p['name'], pattern=p['pattern'])
                for p in cfg['custom_patterns']
            ]
        
        mask = CloudMask(config=config)
        masked_text = mask.anonymize(request.text)
        items_masked = len(mask.mapping)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        
        return MaskResponse(
            masked_text=masked_text,
            items_masked=items_masked,
            processing_time_ms=processing_time
        )
    except Exception as e:
        logger.error(f"Masking failed: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Masking failed: {str(e)}")


class RegexTestRequest(BaseModel):
    pattern: str
    text: str


class RegexTestResponse(BaseModel):
    matches: list[str]
    is_valid: bool


@app.post("/api/test-regex", response_model=RegexTestResponse)
def test_regex_endpoint(request: RegexTestRequest):
    """Test regex pattern against sample text."""
    try:
        pattern = re.compile(request.pattern, re.IGNORECASE)
        matches = pattern.findall(request.text)
        return RegexTestResponse(
            matches=matches if isinstance(matches, list) else [matches],
            is_valid=True
        )
    except re.error as e:
        logger.error(f"Invalid regex pattern: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid regex: {str(e)}")


class ConfigValidationRequest(BaseModel):
    company_names: list[str] = []
    custom_patterns: list[dict] = []
    preserve_prefixes: bool = True
    anonymize_ips: bool = True
    anonymize_domains: bool = False
    seed: str = ""


@app.post("/api/validate-config")
def validate_config_endpoint(request: ConfigValidationRequest):
    """Validate configuration."""
    for pattern in request.custom_patterns:
        if "pattern" not in pattern or "name" not in pattern:
            raise HTTPException(status_code=400, detail="Pattern must have 'name' and 'pattern' fields")
        try:
            re.compile(pattern["pattern"])
        except re.error as e:
            logger.error(f"Invalid regex in pattern '{pattern['name']}': {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid regex in pattern '{pattern['name']}': {str(e)}")
    
    return {"status": "valid", "message": "Configuration is valid"}


@app.get("/api/configs")
def list_configs():
    """List saved configurations."""
    config_dir = Path.home() / ".cloudmask" / "configs"
    if not config_dir.exists():
        return {"configs": []}
    
    configs = []
    for config_file in config_dir.glob("*.yaml"):
        configs.append(config_file.stem)
    
    return {"configs": sorted(configs)}


class SaveConfigRequest(BaseModel):
    name: str
    config: dict


@app.post("/api/configs")
def save_config(request: SaveConfigRequest):
    """Save configuration as YAML."""
    config_dir = Path.home() / ".cloudmask" / "configs"
    config_dir.mkdir(parents=True, exist_ok=True)
    
    config_file = config_dir / f"{request.name}.yaml"
    
    try:
        with config_file.open("w") as f:
            yaml.dump(request.config, f, default_flow_style=False)
        return {"status": "saved", "name": request.name}
    except Exception as e:
        logger.error(f"Failed to save config: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")


@app.get("/api/configs/{name}")
def get_config(name: str):
    """Load configuration from YAML."""
    config_dir = Path.home() / ".cloudmask" / "configs"
    config_file = config_dir / f"{name}.yaml"
    
    if not config_file.exists():
        raise HTTPException(status_code=404, detail=f"Config '{name}' not found")
    
    try:
        with config_file.open("r") as f:
            config = yaml.safe_load(f)
        return {"name": name, "config": config}
    except Exception as e:
        logger.error(f"Failed to load config: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load config: {str(e)}")


@app.delete("/api/configs/{name}")
def delete_config(name: str):
    """Delete configuration."""
    config_dir = Path.home() / ".cloudmask" / "configs"
    config_file = config_dir / f"{name}.yaml"
    
    if not config_file.exists():
        raise HTTPException(status_code=404, detail=f"Config '{name}' not found")
    
    try:
        config_file.unlink()
        return {"status": "deleted", "name": name}
    except Exception as e:
        logger.error(f"Failed to delete config: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete config: {str(e)}")


class UnmaskRequest(BaseModel):
    text: str
    mapping: dict


class UnmaskResponse(BaseModel):
    unmasked_text: str
    items_unmasked: int
    processing_time_ms: float


@app.post("/api/unmask", response_model=UnmaskResponse)
def unmask_text_endpoint(request: UnmaskRequest):
    """Unmask data using mapping."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if not request.mapping:
        raise HTTPException(status_code=400, detail="Mapping is required")
    
    start_time = time.perf_counter()
    
    try:
        unmask = CloudUnmask(mapping=request.mapping)
        unmasked_text = unmask.unanonymize(request.text)
        items_unmasked = len(request.mapping)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        
        return UnmaskResponse(
            unmasked_text=unmasked_text,
            items_unmasked=items_unmasked,
            processing_time_ms=processing_time
        )
    except Exception as e:
        logger.error(f"Unmasking failed: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unmasking failed: {str(e)}")


class PullModelRequest(BaseModel):
    model: str
    ollama_url: str = "http://ollama:11434"


class EnglishToRegexRequest(BaseModel):
    description: str
    ollama_url: str = "http://ollama:11434"
    model: str = "gemma2:2b"


class EnglishToRegexResponse(BaseModel):
    regex: str
    explanation: str


@app.post("/api/english-to-regex", response_model=EnglishToRegexResponse)
async def english_to_regex_endpoint(request: EnglishToRegexRequest):
    """Convert English description to regex using Ollama."""
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")
    
    prompt = f"""You are a regex generator. Generate a regular expression that matches the following pattern.

Respond with ONLY two lines:
Line 1: The regex pattern (no markdown, no backticks, no code blocks)
Line 2: One sentence explanation

Examples:

Pattern: Match email addresses
[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{{2,}}
Matches standard email addresses

Pattern: Find AWS account IDs
\\b\\d{{12}}\\b
Matches 12-digit AWS account numbers

Pattern: Match IPv4 addresses
\\b(?:\\d{{1,3}}\\.){{3}}\\d{{1,3}}\\b
Matches IPv4 addresses like 192.168.1.1

Pattern: Find VPC IDs
vpc-[a-f0-9]{{8,17}}
Matches AWS VPC identifiers

Pattern: {request.description}"""
    
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{request.ollama_url}/api/generate",
                json={
                    "model": request.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "top_p": 0.9,
                        "top_k": 40,
                        "repeat_penalty": 1.1
                    }
                }
            )
            response.raise_for_status()
            result = response.json()
            
            output = result.get("response", "").strip()
            lines = [line.strip() for line in output.split("\n") if line.strip()]
            
            if not lines:
                logger.error(f"Empty response from Ollama. Full output: {output}")
                raise HTTPException(status_code=500, detail="Empty response from Ollama")
            
            regex_pattern = lines[0].strip("`").strip()
            if regex_pattern.startswith("```"):
                regex_pattern = regex_pattern.split("\n")[1] if "\n" in regex_pattern else regex_pattern[3:]
            regex_pattern = regex_pattern.rstrip("`")
            
            explanation = lines[1] if len(lines) > 1 else "Regex pattern generated"
            
            try:
                re.compile(regex_pattern)
            except re.error as e:
                logger.warning(f"Invalid regex from Ollama: {regex_pattern}")
                raise HTTPException(status_code=500, detail=f"Generated invalid regex: {str(e)}")
            
            return EnglishToRegexResponse(
                regex=regex_pattern,
                explanation=explanation
            )
            
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Ensure Ollama is running."
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out. Try a smaller model.")
    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama HTTP error: {e.response.status_code}")
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.response.status_code}")
    except Exception as e:
        logger.error(f"English to regex failed: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ollama/status")
async def ollama_status(ollama_url: str = "http://ollama:11434"):
    """Check if Ollama is available and has recommended models."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{ollama_url}/api/tags")
            response.raise_for_status()
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            
            recommended = ["gemma2", "phi3", "qwen2.5", "deepseek-coder", "codellama"]
            has_model = any(any(rec in name for rec in recommended) for name in model_names)
            
            return {
                "available": True,
                "has_model": has_model,
                "models": model_names,
                "recommended": recommended
            }
    except Exception:
        return {"available": False, "has_model": False, "models": [], "recommended": []}


@app.post("/api/ollama/pull")
async def pull_model(request: PullModelRequest):
    """Pull a model from Ollama registry with streaming progress."""
    async def stream_pull():
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                async with client.stream(
                    "POST",
                    f"{request.ollama_url}/api/pull",
                    json={"name": request.model, "stream": True}
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.strip():
                            yield f"data: {line}\n\n"
        except Exception as e:
            logger.error(f"Failed to pull model: {type(e).__name__}: {str(e)}")
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
    
    return StreamingResponse(stream_pull(), media_type="text/event-stream")


# Mount static files (React build)
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve React SPA for all non-API routes."""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404)
    
    file_path = Path("dist") / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    return FileResponse("dist/index.html")
