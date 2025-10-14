"""CloudMask GUI Backend API."""

import logging
import re
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    # For now, return empty list - configs stored in browser localStorage
    return {"configs": []}


class SaveConfigRequest(BaseModel):
    name: str
    config: ConfigValidationRequest


@app.post("/api/configs")
def save_config(request: SaveConfigRequest):
    """Save configuration (placeholder - stored in browser)."""
    return {"status": "saved", "name": request.name}


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
