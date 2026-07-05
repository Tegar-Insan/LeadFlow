"""
main.py — LeadFlow AI Microservice
FastAPI application serving:
  POST /analyze          — TikTok interaction classifier (UC011)
  POST /chatbot/message  — Anthropic Claude-powered marketing assistant
  POST /image/generate   — Gemini Nano Banana 2, chained onto idea generation

Port: 8000 (bind 127.0.0.1 only — proxied by nginx in production)
"""

import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.analyze import router as analyze_router
from app.routers.chatbot import router as chatbot_router
from app.routers.image import router as image_router
from app.routers.agent import router as agent_router
from app.utils.logger import logger
from app.utils.openai_client import is_configured as is_image_client_configured, get_image_model_id


def _get_anthropic_model() -> str:
    # Same "Docker Compose sets ${VAR} to an empty string, not unset"
    # gotcha as get_image_model_id() — os.getenv's default only applies
    # to a truly missing key.
    return os.getenv("ANTHROPIC_MODEL", "").strip() or "claude-sonnet-4-6"

app = FastAPI(
    title="LeadFlow AI Service",
    description="Anthropic Claude classifier + marketing chatbot + Gemini Nano Banana 2 image generation for Krench Chicken",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5000", "http://localhost:5000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(analyze_router)
app.include_router(chatbot_router)
app.include_router(image_router)
app.include_router(agent_router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "LeadFlow AI Microservice",
        "anthropic_model": _get_anthropic_model(),
        "openai_image_configured": is_image_client_configured(),
        "image_model": get_image_model_id(),
    }


@app.on_event("startup")
async def on_startup():
    logger.info("LeadFlow AI Microservice started on port 8000")
    logger.info(f"Anthropic model: {_get_anthropic_model()}")
    logger.info(f"Image model (Nano Banana 2): {get_image_model_id()}")
