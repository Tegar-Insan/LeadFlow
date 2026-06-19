"""
test_image_generation.py
Covers GPT Image 1 (OpenAI) image generation, chained onto Claude idea
generation.

- build_image_prompt: pure function, no network — tested directly.
- generate_idea_image: OpenAI response-parsing + retry logic, with the
  SDK client mocked out (no real network call).
- POST /image/generate: router behavior with generate_idea_image mocked.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import IdeaImageContext
import app.services.image_generator as image_generator
from app.services.image_generator import build_image_prompt, ImageGenerationError
import app.routers.image as image_router

client = TestClient(app)


async def _no_op_sleep(_seconds):
    """Replaces asyncio.sleep in retry tests so backoff delays don't slow tests down."""
    return None


# ── Fakes for the OpenAI Images API response shape ─────────────────
# Duck-typed to match openai.types.images_response.ImagesResponse:
# response.data[0].b64_json
class _FakeImageData:
    def __init__(self, b64_json=None):
        self.b64_json = b64_json


class _FakeImagesResponse:
    def __init__(self, data):
        self.data = data


class _FakeAPIError(Exception):
    """Duck-types openai's APIStatusError family — carries an HTTP .status_code."""

    def __init__(self, status_code: int, message: str = "boom"):
        super().__init__(message)
        self.status_code = status_code


def _fake_openai_client(response):
    class _FakeImages:
        async def generate(self, **kwargs):
            return response

    class _FakeClient:
        images = _FakeImages()

    return _FakeClient()


def _fake_openai_client_with_call_sequence(*results):
    """
    Each entry in `results` is consumed in order on successive
    images.generate() calls. An exception instance raises; anything
    else is returned as the response.
    """
    calls = {"count": 0}

    class _FakeImages:
        async def generate(self, **kwargs):
            result = results[calls["count"]]
            calls["count"] += 1
            if isinstance(result, Exception):
                raise result
            return result

    class _FakeClient:
        images = _FakeImages()

    return _FakeClient(), calls


# ── build_image_prompt (pure, no I/O) ──────────────────────────────
def test_build_image_prompt_uses_category_scene_template():
    idea = IdeaImageContext(
        content_title="Crispy Chicken Drop",
        tiktok_caption="New menu launch this week!",
        category="MENU-SHOWCASE",
    )
    prompt = build_image_prompt(idea)

    assert "hero close-up shot of the dish" in prompt
    assert "Crispy Chicken Drop" in prompt
    assert "New menu launch this week!" in prompt


def test_build_image_prompt_falls_back_when_category_unknown():
    idea = IdeaImageContext(
        content_title="Random Idea",
        tiktok_caption="Some caption",
        category=None,
    )
    prompt = build_image_prompt(idea)

    assert "appetizing hero shot of the dish" in prompt


def test_build_image_prompt_appends_style_hint():
    idea = IdeaImageContext(
        content_title="Title",
        tiktok_caption="Caption",
        category="PROMOTION",
        style_hint="make it look festive for Ramadan",
    )
    prompt = build_image_prompt(idea)

    assert "Additional direction: make it look festive for Ramadan" in prompt


# ── generate_idea_image (OpenAI SDK client mocked, no network) ────
@pytest.mark.asyncio
async def test_generate_idea_image_extracts_b64_json(monkeypatch):
    fake_response = _FakeImagesResponse(data=[_FakeImageData(b64_json="ZmFrZS1pbWFnZS1iYXNlNjQ=")])

    monkeypatch.setattr(image_generator, "get_client", lambda: _fake_openai_client(fake_response))
    monkeypatch.setattr(image_generator, "get_image_model_id", lambda: "gpt-image-1")

    idea = IdeaImageContext(content_title="Title", tiktok_caption="Caption", category="PROMOTION")
    result = await image_generator.generate_idea_image(idea)

    assert result["image_base64"] == "ZmFrZS1pbWFnZS1iYXNlNjQ="
    assert result["mime_type"] == "image/png"
    assert result["model"] == "gpt-image-1"


@pytest.mark.asyncio
async def test_generate_idea_image_raises_when_no_image_data(monkeypatch):
    fake_response = _FakeImagesResponse(data=[])

    monkeypatch.setattr(image_generator, "get_client", lambda: _fake_openai_client(fake_response))
    monkeypatch.setattr(image_generator, "get_image_model_id", lambda: "gpt-image-1")

    idea = IdeaImageContext(content_title="Title", tiktok_caption="Caption", category="PROMOTION")
    with pytest.raises(ImageGenerationError):
        await image_generator.generate_idea_image(idea)


# ── retry_with_backoff (429 rate-limit handling) ───────────────────
@pytest.mark.asyncio
async def test_generate_idea_image_retries_429_then_succeeds(monkeypatch):
    # asyncio.sleep is mocked so the backoff delay doesn't slow the test down.
    monkeypatch.setattr("app.utils.retry_helper.asyncio.sleep", _no_op_sleep)

    success_response = _FakeImagesResponse(data=[_FakeImageData(b64_json="ZmFrZS1pbWFnZS1iYXNlNjQ=")])

    fake_client, calls = _fake_openai_client_with_call_sequence(
        _FakeAPIError(429, "rate_limit_exceeded"),
        _FakeAPIError(429, "rate_limit_exceeded"),
        success_response,
    )

    monkeypatch.setattr(image_generator, "get_client", lambda: fake_client)
    monkeypatch.setattr(image_generator, "get_image_model_id", lambda: "gpt-image-1")

    idea = IdeaImageContext(content_title="Title", tiktok_caption="Caption", category="PROMOTION")
    result = await image_generator.generate_idea_image(idea)

    assert result["image_base64"] == "ZmFrZS1pbWFnZS1iYXNlNjQ="
    assert calls["count"] == 3  # 2 failed attempts + 1 success


@pytest.mark.asyncio
async def test_generate_idea_image_raises_after_retries_exhausted(monkeypatch):
    monkeypatch.setattr("app.utils.retry_helper.asyncio.sleep", _no_op_sleep)

    fake_client, calls = _fake_openai_client_with_call_sequence(
        _FakeAPIError(429, "rate_limit_exceeded"),
        _FakeAPIError(429, "rate_limit_exceeded"),
        _FakeAPIError(429, "rate_limit_exceeded"),
        _FakeAPIError(429, "rate_limit_exceeded"),
    )

    monkeypatch.setattr(image_generator, "get_client", lambda: fake_client)
    monkeypatch.setattr(image_generator, "get_image_model_id", lambda: "gpt-image-1")

    idea = IdeaImageContext(content_title="Title", tiktok_caption="Caption", category="PROMOTION")
    with pytest.raises(ImageGenerationError):
        await image_generator.generate_idea_image(idea)

    assert calls["count"] == 4  # default max_retries=3 → 4 total attempts


@pytest.mark.asyncio
async def test_generate_idea_image_does_not_retry_non_transient_error(monkeypatch):
    monkeypatch.setattr("app.utils.retry_helper.asyncio.sleep", _no_op_sleep)

    fake_client, calls = _fake_openai_client_with_call_sequence(
        _FakeAPIError(400, "content_policy_violation"),
    )

    monkeypatch.setattr(image_generator, "get_client", lambda: fake_client)
    monkeypatch.setattr(image_generator, "get_image_model_id", lambda: "gpt-image-1")

    idea = IdeaImageContext(content_title="Title", tiktok_caption="Caption", category="PROMOTION")
    with pytest.raises(ImageGenerationError):
        await image_generator.generate_idea_image(idea)

    assert calls["count"] == 1  # no retry on a non-retryable status


# ── POST /image/generate ────────────────────────────────────────────
def _valid_payload():
    return {
        "idea": {
            "content_title": "Crispy Chicken Drop",
            "tiktok_caption": "New menu launch this week!",
            "category": "MENU-SHOWCASE",
        }
    }


def test_generate_image_happy_path(monkeypatch):
    async def _fake_generate(idea):
        return {
            "image_base64": "ZmFrZS1pbWFnZS1iYXNlNjQ=",
            "mime_type": "image/png",
            "model": "gpt-image-1",
            "prompt_used": "fake prompt",
        }

    monkeypatch.setattr(image_router, "generate_idea_image", _fake_generate)

    response = client.post("/image/generate", json=_valid_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["image_base64"] == "ZmFrZS1pbWFnZS1iYXNlNjQ="
    assert body["model"] == "gpt-image-1"


def test_generate_image_returns_502_on_generation_failure(monkeypatch):
    async def _fake_generate(idea):
        raise ImageGenerationError("content_policy_violation")

    monkeypatch.setattr(image_router, "generate_idea_image", _fake_generate)

    response = client.post("/image/generate", json=_valid_payload())

    assert response.status_code == 502
    assert "content_policy_violation" in response.json()["detail"]


def test_generate_image_returns_503_when_api_key_missing(monkeypatch):
    async def _fake_generate(idea):
        raise ValueError("IMAGE_GPT_API_KEY is not set.")

    monkeypatch.setattr(image_router, "generate_idea_image", _fake_generate)

    response = client.post("/image/generate", json=_valid_payload())

    assert response.status_code == 503


def test_generate_image_rejects_missing_required_fields():
    response = client.post("/image/generate", json={"idea": {"content_title": "Only title"}})

    assert response.status_code == 422
