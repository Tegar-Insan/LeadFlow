"""
main.py — LeadFlow AI Microservice
FastAPI application serving:
  POST /analyze          — TikTok interaction classifier (UC011)
  POST /chatbot/message  — Anthropic Claude-powered marketing assistant
  POST /chatbot/analyze-tiktok — on-demand Bright Data + Claude analysis

Port: 8000 (bind 127.0.0.1 only — proxied by nginx in production)
"""

import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.analyze import router as analyze_router
from app.routers.chatbot import router as chatbot_router
from app.utils.logger import logger

app = FastAPI(
    title="LeadFlow AI Service",
    description="Anthropic Claude classifier + marketing chatbot for Krench Chicken",
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


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "LeadFlow AI Microservice",
        "anthropic_model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        "brightdata_configured": bool(os.getenv("BRIGHTDATA_DATASET_ID", "").strip()),
    }


@app.on_event("startup")
async def on_startup():
    logger.info("LeadFlow AI Microservice started on port 8000")
    logger.info(f"Anthropic model: {os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-6')}")
    logger.info(f"Bright Data dataset: {os.getenv('BRIGHTDATA_DATASET_ID', 'NOT SET')}")
