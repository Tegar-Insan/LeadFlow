"""
gemini_chatbot.py — DEPRECATED, redirects to anthropic_chatbot.py
"""
from app.services.anthropic_chatbot import chat, analyze_tiktok_data, clear_analysis_cache

__all__ = ["chat", "analyze_tiktok_data", "clear_analysis_cache"]
