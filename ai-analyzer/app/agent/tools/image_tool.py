"""
image_tool.py — direct SDK tool wrapping the existing image_generator.py.

Not an MCP server: no public MCP server exists for OpenAI image generation,
so this is a plain async function wrapped with @tool + create_sdk_mcp_server
(per the real Claude Agent SDK API — see PLAN.md section 2 row 4).

Generates the image via the existing gpt-image-1 service, then uploads it to
the same Supabase Storage bucket ("leadflow-media") the Node backend already
uses for idea images, mirroring ContentIdea.ts's storagePath convention.
"""

import base64
import uuid

from claude_agent_sdk import tool, create_sdk_mcp_server

from app.models.schemas import IdeaImageContext
from app.services.image_generator import generate_idea_image, ImageGenerationError
from app.utils.logger import logger
from app.utils.supabase_client import get_supabase_admin, MEDIA_BUCKET

STORAGE_PREFIX = "agentic-mode"


@tool(
    name="generate_image",
    description="Generate a TikTok poster image for a content idea and return its public URL",
    input_schema={
        "content_title": str,
        "tiktok_caption": str,
        "category": str,
        "style_hint": str,
    },
)
async def generate_image(args: dict) -> dict:
    idea = IdeaImageContext(
        content_title=args["content_title"],
        tiktok_caption=args["tiktok_caption"],
        category=args.get("category") or None,
        style_hint=args.get("style_hint") or None,
    )

    try:
        result = await generate_idea_image(idea)
    except ImageGenerationError as exc:
        logger.warning(f"[agent.image_tool] generation failed: {exc}")
        return {"content": [{"type": "text", "text": f"Image generation failed: {exc}"}], "is_error": True}

    storage_path = f"{STORAGE_PREFIX}/{uuid.uuid4()}.png"
    image_bytes = base64.b64decode(result["image_base64"])

    client = get_supabase_admin()
    client.storage.from_(MEDIA_BUCKET).upload(
        storage_path,
        image_bytes,
        {"content-type": result["mime_type"], "upsert": "true"},
    )
    public_url = client.storage.from_(MEDIA_BUCKET).get_public_url(storage_path)

    return {"content": [{"type": "text", "text": public_url}]}


def build_image_tool_server():
    return create_sdk_mcp_server(name="image", version="1.0.0", tools=[generate_image])
