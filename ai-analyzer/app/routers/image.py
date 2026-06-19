"""
image.py — POST /image/generate
GPT Image 1 image generation. Called automatically by the Node backend
right after Claude (Anthropic) produces a content idea — this endpoint is
chained onto idea generation, not a standalone manual feature.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ImageGenerationRequest, ImageGenerationResponse
from app.services.image_generator import generate_idea_image, ImageGenerationError
from app.utils.logger import logger

router = APIRouter(prefix="/image")


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(req: ImageGenerationRequest):
    """
    Body: { idea: { content_title, tiktok_caption, category?, style_hint? } }
    Returns: { image_base64, mime_type, model, prompt_used }
    """
    try:
        result = await generate_idea_image(req.idea)
    except ImageGenerationError as exc:
        logger.warning(f"[image] generation failed: {exc}")
        raise HTTPException(status_code=502, detail=f"Image generation failed: {exc}")
    except ValueError as exc:
        # IMAGE_GPT_API_KEY not configured
        raise HTTPException(status_code=503, detail=str(exc))

    return ImageGenerationResponse(**result)
