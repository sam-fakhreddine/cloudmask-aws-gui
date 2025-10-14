"""CloudMask GUI Backend API."""

import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cloudmask import CloudMask

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
    patterns: list[str] = []


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
        mask = CloudMask()
        masked_text = mask.anonymize(request.text)
        items_masked = len(mask.mapping)
        
        processing_time = (time.perf_counter() - start_time) * 1000
        
        return MaskResponse(
            masked_text=masked_text,
            items_masked=items_masked,
            processing_time_ms=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Masking failed: {str(e)}")
