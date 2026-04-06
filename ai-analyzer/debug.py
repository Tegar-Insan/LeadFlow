"""
debug.py — Quick test for ai-analyzer Claude integration
Run: python debug.py
"""

import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── Test 1: Caption + Hashtag Generation ─────────────────────────────────────
def test_caption_generation():
    print("\n=== Test 1: Caption + Hashtag Generation ===")
    post_title = "Weekend Promo Krench Chicken"
    platform   = "TikTok"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        system=(
            "You are a social media copywriter for Krench Chicken, a fried chicken restaurant in Bogor, Indonesia. "
            "Write engaging, casual, and fun Indonesian-style captions for TikTok. "
            "Always respond in JSON with keys: caption (string) and hashtags (array of strings, each starting with #)."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Generate a {platform} caption and relevant hashtags for this post: \"{post_title}\". "
                "Keep the caption under 150 characters. Include 5-8 hashtags."
            ),
        }],
    )

    text = next(b.text for b in response.content if b.type == "text")
    print("Raw response:", text)
    print(f"Tokens used — input: {response.usage.input_tokens}, output: {response.usage.output_tokens}")


# ── Test 2: Sentiment Analysis ────────────────────────────────────────────────
def test_sentiment():
    print("\n=== Test 2: Sentiment Analysis ===")
    caption = "Ayam goreng crispy terenak di Bogor! Jangan sampe kehabisan ya bestie 🍗🔥"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=256,
        system=(
            "You analyze the sentiment and engagement potential of social media captions. "
            "Respond in JSON with keys: sentiment (positive/neutral/negative), "
            "score (0.0–1.0), and reason (one sentence)."
        ),
        messages=[{
            "role": "user",
            "content": f"Analyze this caption: \"{caption}\"",
        }],
    )

    text = next(b.text for b in response.content if b.type == "text")
    print("Raw response:", text)
    print(f"Tokens used — input: {response.usage.input_tokens}, output: {response.usage.output_tokens}")


# ── Test 3: Content Classification ───────────────────────────────────────────
def test_classifier():
    print("\n=== Test 3: Content Classification ===")
    caption = "Tutorial cara bikin ayam kremes ala Krench Chicken di rumah! 🍳"

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=256,
        system=(
            "You classify social media content for a restaurant brand. "
            "Categories: promotional, educational, entertaining, behind_the_scenes, user_generated. "
            "Respond in JSON with keys: category (string) and confidence (0.0–1.0)."
        ),
        messages=[{
            "role": "user",
            "content": f"Classify this post caption: \"{caption}\"",
        }],
    )

    text = next(b.text for b in response.content if b.type == "text")
    print("Raw response:", text)
    print(f"Tokens used — input: {response.usage.input_tokens}, output: {response.usage.output_tokens}")


# ── Test 4: Best Posting Time Suggestion ─────────────────────────────────────
def test_best_time():
    print("\n=== Test 4: Best Posting Time Suggestion ===")
    context = {
        "platform": "TikTok",
        "content_type": "promotional",
        "target_audience": "food lovers in Bogor, Indonesia aged 18-35",
    }

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=256,
        system=(
            "You are a social media strategist. Suggest optimal posting times for Indonesian restaurant brands. "
            "Respond in JSON with keys: suggested_times (array of HH:MM strings in WIB/UTC+7), "
            "best_days (array of day names), and reason (one sentence)."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Suggest the best posting times for a {context['platform']} post. "
                f"Content type: {context['content_type']}. "
                f"Target audience: {context['target_audience']}."
            ),
        }],
    )

    text = next(b.text for b in response.content if b.type == "text")
    print("Raw response:", text)
    print(f"Tokens used — input: {response.usage.input_tokens}, output: {response.usage.output_tokens}")


if __name__ == "__main__":
    test_caption_generation()
    test_sentiment()
    test_classifier()
    test_best_time()
    print("\n✓ All debug tests complete.")
