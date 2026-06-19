"""
image_generator.py
GPT Image 1 (OpenAI) — generates a TikTok-ready poster image from a
content idea that Claude (Anthropic) already produced upstream
(Node backend's contentIdeaService.ts). Image generation is chained
onto idea generation automatically; it is never a manual trigger and
it never blocks idea generation if it fails (NFR-002).

Image generation is intentionally scoped to OpenAI only — text/idea
generation stays on Anthropic everywhere else in this project.
"""

from app.models.schemas import IdeaImageContext
from app.utils.openai_client import get_client, get_image_generation_semaphore, get_image_model_id
from app.utils.logger import logger
from app.utils.retry_helper import retry_with_backoff

# Brand-locked style layer — hidden from the caller, never user-edited.
_SYSTEM_STYLE = (
    "Photorealistic food photography for Krench Chicken, a fried-chicken "
    "brand in Bogor, Indonesia. Warm, appetizing lighting, shallow depth "
    "of field, no on-image text or logos, vertical 9:16 framing for "
    "TikTok, no visible faces unless showing brand staff in uniform, "
    "color grading leaning warm red/gold."
)

# Category → scene template. Mirrors content_ideas.category values used
# by the Claude idea-generation prompt in contentIdeaService.ts.
_CATEGORY_SCENE = {
    "BEHIND-THE-SCENES": "candid documentary shot of staff preparing chicken in the kitchen",
    "MENU-SHOWCASE": "hero close-up shot of the dish on a rustic wooden table",
    "PROMOTION": "bold promotional food shot with empty space reserved for a caption overlay",
    "TESTIMONIAL": "customer-eye-view shot of the food being enjoyed in a cozy restaurant setting",
    "TRENDING": "dynamic, high-energy framing matching current TikTok food-trend aesthetics",
}

_DEFAULT_SCENE = "appetizing hero shot of the dish, TikTok-ready framing"


class ImageGenerationError(Exception):
    """Raised when GPT Image 1 cannot produce an image for an idea."""


def build_image_prompt(idea: IdeaImageContext) -> str:
    """
    Pure function — no I/O. Combines the brand style layer with a
    category-driven scene template and the idea's own title/caption.
    Kept separate from generate_idea_image() so prompt construction is
    unit-testable without any network call.
    """
    scene = _CATEGORY_SCENE.get((idea.category or "").upper(), _DEFAULT_SCENE)
    prompt = (
        f"{_SYSTEM_STYLE}\n"
        f"Scene: {scene}.\n"
        f"Context: {idea.content_title} — {idea.tiktok_caption}."
    )
    if idea.style_hint:
        prompt += f"\nAdditional direction: {idea.style_hint}"
    return prompt


async def generate_idea_image(idea: IdeaImageContext) -> dict:
    """
    Calls GPT Image 1 and returns:
        { image_base64, mime_type, model, prompt_used }

    Retries on transient 429 (rate limit) / 5xx errors with full-jitter
    exponential backoff (see retry_helper.py) before giving up. Raises
    ImageGenerationError on any OpenAI failure that isn't resolved by
    retrying (rate limit exhausted, content policy, network). Raises
    ValueError if IMAGE_GPT_API_KEY is not configured. Callers (the
    router, and the Node backend that calls this service over HTTP)
    must treat both as non-fatal — idea generation must never break
    because the image failed.
    """
    prompt = build_image_prompt(idea)
    client = get_client()
    model_id = get_image_model_id()

    try:
        # Serialized across requests — gpt-image-1's rate limit is too tight
        # for the concurrent per-draft calls Node fires via Promise.all.
        async with get_image_generation_semaphore():
            response = await retry_with_backoff(
                lambda: client.images.generate(
                    model=model_id,
                    prompt=prompt,
                    size="1024x1536",
                    n=1,
                ),
                label="image_generator",
            )
    except Exception as exc:
        logger.error(f"[image_generator] OpenAI image generation failed: {exc}")
        raise ImageGenerationError(str(exc)) from exc

    data = response.data[0] if response.data else None
    if not data or not getattr(data, "b64_json", None):
        raise ImageGenerationError("OpenAI returned no image data")

    return {
        "image_base64": data.b64_json,
        "mime_type": "image/png",
        "model": model_id,
        "prompt_used": prompt,
    }
