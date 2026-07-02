"""
supabase_tool.py — direct SDK tools for the agent's own Supabase reads/writes.

Not an MCP server (see mcp_config.py docstring for why). Two tools, built
per-run via build_supabase_tool_server() so run_id/created_by are closed
over from the calling agent_runner — never supplied by the LLM itself,
since the model has no legitimate way to know the real user id and
shouldn't be trusted to invent one.

check_existing_schedules backs the Scheduling skill's collision check.
insert_draft_schedule is the "Calendar Placement" tool from PLAN.md section
2/9 — always inserts status='draft', auto_publish=False; that pairing is
the real safety gate that keeps agent output out of the auto-publish path
until a human reviews it (see PLAN.md section 9).
"""

from typing import Optional

from claude_agent_sdk import tool, create_sdk_mcp_server

from app.utils.supabase_client import get_supabase_admin, MEDIA_BUCKET
from app.utils.logger import logger

CHECK_EXISTING_SCHEDULES_SCHEMA = {
    "type": "object",
    "properties": {
        "date_from": {"type": "string", "description": "ISO date YYYY-MM-DD (WIB)"},
        "date_to": {"type": "string", "description": "ISO date YYYY-MM-DD (WIB), inclusive"},
    },
    "required": ["date_from", "date_to"],
}

INSERT_DRAFT_SCHEDULE_SCHEMA = {
    "type": "object",
    "properties": {
        "caption": {"type": "string", "description": "Full caption text, hashtags appended"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "scheduled_at": {"type": "string", "description": "ISO 8601 timestamp with +07:00 offset"},
        "preview_image_url": {"type": "string", "description": "Public URL from generate_image, omit if unavailable"},
    },
    "required": ["caption", "hashtags", "scheduled_at"],
}


def _parse_storage_path(public_url: str, bucket: str) -> Optional[str]:
    marker = f"/storage/v1/object/public/{bucket}/"
    idx = public_url.find(marker)
    if idx == -1:
        return None
    return public_url[idx + len(marker):]


def _get_storage_object_size_bytes(client, bucket: str, storage_path: str) -> int:
    try:
        last_slash = storage_path.rfind("/")
        directory = storage_path[:last_slash] if last_slash >= 0 else ""
        file_name = storage_path[last_slash + 1:] if last_slash >= 0 else storage_path
        listing = client.storage.from_(bucket).list(directory, {"search": file_name})
        match = next((f for f in listing if f.get("name") == file_name), None)
        return int(((match or {}).get("metadata") or {}).get("size") or 0)
    except Exception:
        return 0


def build_supabase_tool_server(run_id: str, created_by: str):
    client = get_supabase_admin()

    @tool(
        name="check_existing_schedules",
        description="List existing content_queue_schedules rows scheduled in a WIB date range, to avoid slot collisions",
        input_schema=CHECK_EXISTING_SCHEDULES_SCHEMA,
    )
    async def check_existing_schedules(args: dict) -> dict:
        date_from = args["date_from"]
        date_to = args["date_to"]
        resp = (
            client.table("content_queue_schedules")
            .select("scheduled_at,status")
            .gte("scheduled_at", f"{date_from}T00:00:00+07:00")
            .lte("scheduled_at", f"{date_to}T23:59:59+07:00")
            .neq("status", "failed")
            .execute()
        )
        rows = resp.data or []
        occupied = [row["scheduled_at"] for row in rows if row.get("scheduled_at")]
        return {"content": [{"type": "text", "text": str(occupied)}]}

    @tool(
        name="insert_draft_schedule",
        description="Insert the final content idea as a draft row in content_queue_schedules (status=draft, auto_publish=false)",
        input_schema=INSERT_DRAFT_SCHEDULE_SCHEMA,
    )
    async def insert_draft_schedule(args: dict) -> dict:
        payload = {
            "idea_id": None,
            "created_by": created_by,
            "status": "draft",
            "auto_publish": False,
            "custom_caption": args["caption"],
            "custom_hashtags": args.get("hashtags", []),
            "scheduled_at": args["scheduled_at"],
            "agent_run_id": run_id,
            "preview_image_url": args.get("preview_image_url"),
        }
        resp = client.table("content_queue_schedules").insert(payload).execute()
        row = resp.data[0] if resp.data else {}
        schedule_id = row.get("id")

        # Mirrors ContentIdea.ts's approveIdea / chatbotController.ts's
        # approveSchedule: the AI cover image only exists as a bare URL on
        # the schedule until it's turned into a real content_assets row
        # (is_ai_placeholder=true), which is what tiktokPublishService.ts
        # actually reads to publish. Never fatal — a failed asset insert
        # must not undo the schedule that was already created (NFR-002).
        preview_image_url = args.get("preview_image_url")
        if preview_image_url and schedule_id:
            try:
                storage_path = _parse_storage_path(preview_image_url, MEDIA_BUCKET)
                if storage_path:
                    size_bytes = _get_storage_object_size_bytes(client, MEDIA_BUCKET, storage_path)
                    client.table("content_assets").insert({
                        "queue_schedule_id": schedule_id,
                        "uploaded_by": created_by,
                        "content_type": "poster_photo",
                        "file_name": storage_path.rsplit("/", 1)[-1],
                        "file_url": preview_image_url,
                        "storage_path": storage_path,
                        "mime_type": "image/png",
                        "file_size_bytes": size_bytes,
                        "is_ai_placeholder": True,
                    }).execute()
                else:
                    logger.warning(f"[agent.supabase_tool] could not parse storage_path from {preview_image_url}")
            except Exception as exc:
                logger.warning(f"[agent.supabase_tool] failed to create content_assets row for schedule {schedule_id}: {exc}")

        return {"content": [{"type": "text", "text": f"inserted schedule id={schedule_id}"}]}

    return create_sdk_mcp_server(
        name="supabase",
        version="1.0.0",
        tools=[check_existing_schedules, insert_draft_schedule],
    )
