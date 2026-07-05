"""
test_agent_scheduling_window.py
Covers the fix for: Agentic Mode was scheduling posts for "today at the
current time" instead of properly planning ahead. _build_system_prompt must
tell the model the real current WIB date/time and a scheduling window that
never starts today or earlier — even when the staff's requested date_from/
date_to is today (the daily cron trigger always passes today_wib for both).
"""

from datetime import datetime, timezone, timedelta

import app.agent.agent_runner as agent_runner

JAKARTA_TZ = timezone(timedelta(hours=7))


def _prefs(date_from: str, date_to: str) -> dict:
    return {
        "content_preference": "food photography",
        "hashtags": ["KrenchChicken"],
        "preferred_times": ["10:00", "19:00"],
        "image_style": None,
        "ideas_per_day": 3,
        "date_from": date_from,
        "date_to": date_to,
    }


def test_prompt_shifts_window_to_tomorrow_when_date_range_is_today(monkeypatch):
    fixed_now = datetime(2026, 7, 6, 5, 33, tzinfo=JAKARTA_TZ)
    monkeypatch.setattr(agent_runner, "_now_wib", lambda: fixed_now)

    prompt = agent_runner._build_system_prompt(_prefs("2026-07-06", "2026-07-06"))

    assert "2026-07-07 to 2026-07-07" in prompt
    assert "2026-07-06" not in prompt.split("Scheduling window")[1].split("\n")[0]
    assert "never" in prompt.lower() and "today" in prompt.lower()


def test_prompt_keeps_future_window_untouched(monkeypatch):
    fixed_now = datetime(2026, 7, 6, 5, 33, tzinfo=JAKARTA_TZ)
    monkeypatch.setattr(agent_runner, "_now_wib", lambda: fixed_now)

    prompt = agent_runner._build_system_prompt(_prefs("2026-07-10", "2026-07-15"))

    assert "2026-07-10 to 2026-07-15" in prompt


def test_prompt_extends_date_to_forward_if_it_would_precede_effective_from(monkeypatch):
    fixed_now = datetime(2026, 7, 6, 23, 0, tzinfo=JAKARTA_TZ)
    monkeypatch.setattr(agent_runner, "_now_wib", lambda: fixed_now)

    # date_to is tomorrow already (still <= today would be the buggy case);
    # here date_from is today and date_to is today too, both must shift.
    prompt = agent_runner._build_system_prompt(_prefs("2026-07-06", "2026-07-06"))

    assert "2026-07-07 to 2026-07-07" in prompt


def test_prompt_includes_current_wib_datetime(monkeypatch):
    fixed_now = datetime(2026, 7, 6, 5, 33, tzinfo=JAKARTA_TZ)
    monkeypatch.setattr(agent_runner, "_now_wib", lambda: fixed_now)

    prompt = agent_runner._build_system_prompt(_prefs("2026-07-08", "2026-07-09"))

    assert "2026-07-06 05:33" in prompt
