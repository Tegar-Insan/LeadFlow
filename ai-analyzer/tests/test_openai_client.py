"""
test_openai_client.py
Covers get_image_model_id()'s fallback: Docker Compose's ${VAR}
substitution sets an empty-string env var (not an absent one) when the
source .env lacks the key at container-creation time. os.getenv's own
default argument only applies to a truly missing key, so a blank value
was silently passed through as model="" to every images.generate() call
(and showed up as a blank "image_model" in the /health endpoint).
"""

from app.utils.openai_client import get_image_model_id


def test_returns_configured_model_when_set(monkeypatch):
    monkeypatch.setenv("OPENAI_IMAGE_MODEL", "gpt-image-1-mini")
    assert get_image_model_id() == "gpt-image-1-mini"


def test_falls_back_to_default_when_env_var_is_empty_string(monkeypatch):
    # This is the exact shape Docker Compose produces for an unset
    # substitution — present in os.environ, but "".
    monkeypatch.setenv("OPENAI_IMAGE_MODEL", "")
    assert get_image_model_id() == "gpt-image-1"


def test_falls_back_to_default_when_env_var_is_whitespace_only(monkeypatch):
    monkeypatch.setenv("OPENAI_IMAGE_MODEL", "   ")
    assert get_image_model_id() == "gpt-image-1"


def test_falls_back_to_default_when_env_var_is_entirely_absent(monkeypatch):
    monkeypatch.delenv("OPENAI_IMAGE_MODEL", raising=False)
    assert get_image_model_id() == "gpt-image-1"
