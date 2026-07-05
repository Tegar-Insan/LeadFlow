# LeadFlow — Agentic Mode Implementation Plan
**Route:** `/calendar/ideas/agentic-mode`
**Last Updated:** June 2026 (rev. 2 — Python Claude Agent SDK + MCP, Tavily/Supabase only, GCP-hosted)
**Author:** Tegar Insan Tohaga

> **Revision note (rev. 2):** Rev. 1 of this plan moved all agent orchestration into Node.js and
> reused the existing Apify/Bright Data trend pipeline. Per direction, this rev. supersedes that:
> the agent now runs as a **Python Claude Agent SDK** loop inside `ai-analyzer`, using exactly
> **two MCP servers — Tavily and Supabase** — and is deployed to **Google Cloud Run**, triggered on
> a schedule by **Google Cloud Scheduler**. Apify and Bright Data are **deleted outright** — not
> kept as dead code — since the project won't use either again (see §8). Node.js's role shrinks to
> a thin proxy + Socket.IO relay, the same shape it already has for `ai-analyzer` image generation.
>
> ⚠️ This introduces three things not in `CLAUDE.md`'s fixed tech-stack list (§4): MCP, the Claude
> Agent SDK, and Google Cloud Run/Scheduler. That's a deliberate, explicit decision for this
> feature — if adopted, `CLAUDE.md` §4/§26 and `progress.md` should be updated to reflect it so
> future sessions don't flag it as a violation.

---

## 0. Mapping: Rev. 1 → Rev. 2

| Rev. 1 (Node-owned agent) | Rev. 2 (this doc) |
|---|---|
| Agent loop in Node (`AgentRun.ts`, plain `@anthropic-ai/sdk` calls) | Agent loop in **Python**, `ai-analyzer/app/agent/`, using the **Claude Agent SDK** (`claude-agent-sdk` for Python) |
| No MCP anywhere | **Exactly two MCP servers**: `tavily-mcp` (trend search) and the Supabase MCP server (DB read + the calendar-draft write) |
| Trend search via Apify + Bright Data | Apify/Bright Data **deleted outright** (`apify_service.py`, `brightdata_service.py` removed, plus everything in `chatbot.py` that called them). Trend search is a Tavily **web search** MCP tool call for "trending TikTok [niche] pattern" |
| `ContentQueueSchedule.createSchedule()` called from Node | Agent calls the Supabase MCP tool directly from inside the Python tool-use loop to insert into `content_queue_schedules` |
| `node-cron` recurring trigger, in-process | `POST /agent/cron-trigger` on `ai-analyzer` (Cloud Run), fired by **Google Cloud Scheduler**, secured by a shared secret header |
| No cloud deploy needed | `ai-analyzer` deploys to **Google Cloud Run**; Node backend stays where it already runs (unchanged) |
| Live progress via Node's own Socket.IO | Python posts an internal callback to Node (`POST /api/agent/internal/progress`, shared-secret guarded); Node then broadcasts over the existing `notif:${userId}` Socket.IO room — unchanged delivery mechanism, new source |

---

## 1. Overview

Agentic Mode lets `marketing_staff` (+ `admin`) configure an AI agent that autonomously:
1. **Searches for trending TikTok patterns** for the staff's chosen content preference, via the **Tavily** MCP tool (real web search, not a pre-scraped dataset)
2. **Writes copywriting** (title, caption, hashtags) for each idea
3. **Generates a poster image** per idea, matching the staff's image preference
4. **Sets the time and date** for each post (WIB) from the staff's preferred posting times
5. **Places the result as a draft in the calendar / Content Library sidebar**, via the **Supabase** MCP tool — visible immediately, but not publish-eligible until staff completes UC008 media upload

Staff configures this once via a preference form, then either runs it **once** or turns on **daily auto-run** at a chosen WIB time (Google Cloud Scheduler → `ai-analyzer`).

---

## 2. Skills & Tools (Claude Agent SDK, Python)

The agent is a `claude-agent-sdk` session in `ai-analyzer/app/agent/agent_runner.py`. It is given **three Skills** (procedural knowledge, as `SKILL.md` files — the same format Claude Code itself uses) and **two direct tools** (plain Python functions, not MCP, since neither OpenAI image generation nor "write a status row" has a public MCP server).

| # | Skill / Tool | Type | Backed by |
|---|---|---|---|
| 1 | **Copywriting** | Skill | Pure prompt knowledge — title/caption/hashtag rules, brand voice, the same 5 categories already used in `ContentIdea.ts` (`BEHIND-THE-SCENES`, `MENU-SHOWCASE`, `PROMOTION`, `TESTIMONIAL`, `TRENDING`) |
| 2 | **Trend Search** | Skill | Tavily MCP tool (`tavily-search`) — searches the web for "trending TikTok [niche/content-preference] Indonesia [current month/year]" |
| 3 | **Scheduling** | Skill | Pure logic — assign each idea a `(date, time)` from the staff's preferred times + date range, checked against existing rows via the Supabase MCP tool so no slot collides |
| 4 | **Image Generation** | Tool (direct, not MCP) | Wraps the existing `ai-analyzer/app/services/image_generator.py` (OpenAI `gpt-image-1`) — no MCP server exists for this, so it's registered as a plain Python tool function |
| 5 | **Calendar Placement** | Tool (direct call into the Supabase MCP tool) | Inserts the finished draft into `content_queue_schedules` (status=`draft`, `scheduled_at` set) — this is what makes it appear in `ContentLibrarySidebar` immediately |

### `ai-analyzer/app/agent/skills/copywriting/SKILL.md`
```markdown
---
name: copywriting
description: Write TikTok content ideas (title, caption, hashtags) for Krench Chicken
---

Write one TikTok idea at a time: a short title, a caption under 150 characters,
and hashtags. Write in Bahasa Indonesia or an informal Bahasa/English mix.
End every caption with a call to action ("Cobain sekarang!", "Tag temenmu!").
Append the staff's provided hashtags to every caption. Assign exactly one
category: BEHIND-THE-SCENES, MENU-SHOWCASE, PROMOTION, TESTIMONIAL, or TRENDING.
Never repeat a title or hook already present in existing draft schedules
(check via the Supabase tool before finalizing).
```

### `ai-analyzer/app/agent/skills/trend_search/SKILL.md`
```markdown
---
name: trend_search
description: Find current TikTok trending patterns for a content preference using Tavily
---

Before writing any idea, call the Tavily search tool with a query built from
the staff's content preference, e.g. "trending TikTok food content Indonesia
June 2026" or "viral TikTok format [content_preference] 2026". Read the top
results for trending hooks, formats, and sounds. If results are thin, broaden
the query once before continuing. Never invent a trend unsupported by search
results — if nothing useful comes back, fall back to the Copywriting skill's
brand-voice defaults and proceed without a trend hook.
```

### `ai-analyzer/app/agent/skills/scheduling/SKILL.md`
```markdown
---
name: scheduling
description: Assign a WIB date+time to each generated idea from staff preferences
---

Use only the posting times the staff provided (WIB / Asia/Jakarta). Spread
ideas across the staff's date range, earliest free slot first. Before
assigning a slot, query existing content_queue_schedules rows for that date
range via the Supabase tool — never put more than 2 posts on the same day,
never reuse an exact occupied (date, time) pair. Output scheduled_at as ISO
8601 with the +07:00 offset.
```

---

## 3. MCP Servers — Exactly Two

| Server | Purpose | Config (illustrative — verify exact package/version at implementation time) |
|---|---|---|
| **Tavily MCP** | Trend Search skill | `npx -y tavily-mcp`, env `TAVILY_API_KEY` |
| **Supabase MCP** | Read existing schedules/menu context; write the final draft row | Official Supabase MCP server, configured with the project's Supabase URL + a scoped key (read/write on `content_queue_schedules`, `content_assets`, read-only elsewhere) |

```python
# ai-analyzer/app/agent/mcp_config.py
MCP_SERVERS = {
    "tavily": {
        "command": "npx",
        "args": ["-y", "tavily-mcp"],
        "env": {"TAVILY_API_KEY": os.environ["TAVILY_API_KEY"]},
    },
    "supabase": {
        "command": "npx",
        "args": ["-y", "@supabase/mcp-server-supabase"],
        "env": {
            "SUPABASE_URL": os.environ["SUPABASE_URL"],
            "SUPABASE_SERVICE_ROLE_KEY": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        },
    },
}
```

No other MCP servers are added. Apify and Bright Data are **not** MCP tools and are not wired into the agent at all (see §8).

---

## 4. Goals

| Goal | Description |
|---|---|
| Trend-aware ideas | Every idea is grounded in a real Tavily search result, not a static dataset |
| Copywriting | Title + caption + hashtags per idea, brand voice, staff hashtags appended |
| Image generation | One `gpt-image-1` poster per idea matching the staff's image preference |
| Set time and date | Scheduling skill assigns WIB slots from preferred times + date range |
| Put in calendar | Each result is a real `content_queue_schedules` row, status=`draft`, visible in the Content Library sidebar immediately |
| Staff stays in control | `auto_publish=false` + status stays `draft`; nothing publishes until staff reviews and completes UC008 |
| Configurable cadence | Run once, or daily via Google Cloud Scheduler |

## 5. Non-Goals

- Does not publish to TikTok
- Does not touch rows it didn't create
- Does not auto-promote a draft to `scheduled`/`uploaded` — that stays a human action

---

## 6. Tech Stack (this feature)

| Layer | Technology | Status |
|---|---|---|
| Agent runtime | Python, `claude-agent-sdk` | **new** dependency in `ai-analyzer/requirements.txt` |
| MCP servers | Tavily MCP, Supabase MCP | **new** |
| Image generation | OpenAI `gpt-image-1` via existing `image_generator.py` | reused as-is |
| Idea/text generation | Claude (model: `claude-sonnet-4-6` or higher) | same model family already used in `anthropicService.ts`/`ContentIdea.ts`, now called from Python instead of Node for this feature only |
| Database | PostgreSQL via Supabase | reused; new columns/tables, see §10 |
| Recurring trigger | Google Cloud Scheduler → `POST /agent/cron-trigger` | **new** |
| Hosting for the agent | Google Cloud Run (`ai-analyzer`) | **new** for this service; Node backend's hosting is unchanged |
| Real-time push to staff | Existing Socket.IO `notif:${userId}` room, fed by a new Node-side internal callback route | reused delivery, new source |

---

## 7. Architecture

```
Frontend (React, /calendar/ideas/agentic-mode)
    │  POST /api/agent/trigger
    │  POST /api/agent/schedule          (recurring config CRUD)
    │  GET  /api/agent/runs/:runId       (refresh-resume fallback)
    │  Socket.IO: notif:${userId} → "agent:progress" / "agent:done"
    ▼
backend/src/routes/agentRoutes.ts → controllers/agentController.ts   [THIN PROXY ONLY]
    │  authMiddleware + roleMiddleware(['marketing_staff','admin'])
    │  forwards to AI_SERVICE_URL (Cloud Run URL in prod)
    ▼
ai-analyzer (FastAPI, deployed on Google Cloud Run)
    │
    ├─ POST /agent/trigger              → creates agent_runs row, starts agent_runner.run()
    ├─ GET  /agent/runs/:run_id         → status read
    ├─ POST/GET/PATCH/DELETE /agent/schedule[...] → agent_schedules CRUD
    └─ POST /agent/cron-trigger         → called ONLY by Google Cloud Scheduler (X-Cron-Secret header)
            │
            ▼
    app/agent/agent_runner.py — Claude Agent SDK session
        skills: copywriting, trend_search, scheduling   (SKILL.md, §2)
        mcp_servers: tavily, supabase                    (§3)
        direct tools: generate_image()                   (wraps image_generator.py, §2)
            │
            ├─ Tavily MCP   → web search "trending TikTok <preference>"
            ├─ Supabase MCP → read existing content_queue_schedules (avoid slot collisions)
            ├─ generate_image() → OpenAI gpt-image-1 → upload to Supabase Storage "leadflow-media"
            └─ Supabase MCP → INSERT content_queue_schedules (status='draft', scheduled_at set,
                                                               auto_publish=false, agent_run_id=...)
            │
            ▼
    after each idea + at run end: POST {NODE_BACKEND_CALLBACK_URL}/api/agent/internal/progress
        (X-Agent-Callback-Secret header) → Node relays over notif:${userId} Socket.IO room
```

---

## 8. Apify / Bright Data — Deleted, Not Kept as Dead Code

Unlike the inert-table precedent in `deletion_log.md` (tables left in place, unused), Apify and Bright Data are removed outright since the project has no future use for either:

- **Delete** `ai-analyzer/app/services/apify_service.py`
- **Delete** `ai-analyzer/app/services/brightdata_service.py`
- **Clean up** `ai-analyzer/app/routers/chatbot.py` — it currently imports both (`fetch_tiktok_data as apify_fetch`/`brightdata_fetch`, `summarize_posts as apify_summarize`/`brightdata_summarize`) and uses them in `_fetch_posts()`, `_summarize()`, and `_get_tiktok_context()` to give the existing `/chatbot/message` and `/chatbot/analyze-tiktok` endpoints TikTok trend context. Deleting the two service files without touching `chatbot.py` breaks those imports at startup. Remove `_fetch_posts()`, `_summarize()`, `_get_tiktok_context()`, and the trend-context injection in `chatbot_message()`/`analyze_tiktok()` — the regular AI chatbot (UC Chatbot, separate from Agentic Mode) goes back to answering without pre-scraped TikTok context. If trend-aware chat replies are wanted later, that's a follow-up to wire the chatbot onto Tavily too — out of scope here.
- **Remove** `BRIGHTDATA_KEY` / `BRIGHTDATA_DATASET_ID` (and `APIFY_KEY` / `APIFY_DATASET_ID` if still referenced anywhere) from `ai-analyzer/.env.example`
- **Remove** the orphaned `analyzeTikTokData()` function from `backend/src/services/anthropicService.ts` — it was already dead code (no controller called it), and the Python endpoint it pointed at (`/chatbot/analyze-tiktok`) loses its Apify/Bright Data backing per the cleanup above, so there's nothing left for it to usefully call

Trend search for Agentic Mode goes through the Tavily MCP tool only (§3); nothing in this feature depends on Apify or Bright Data.

---

## 9. Why `status='draft'` + `auto_publish=false` Is the Real Safety Gate

The Calendar Placement tool always inserts with:
```python
{
    "status": "draft",          # NOT "scheduled" — shows in Content Library as a draft
    "scheduled_at": <agent-assigned ISO8601 +07:00>,
    "auto_publish": False,
    "agent_run_id": <run_id>,
}
```
Two independent reasons this can't auto-publish itself:
1. `status='draft'` — `ContentLibrarySidebar`/calendar show it as a draft pending review, exactly like a manually-created draft.
2. Even if staff later flips it to `scheduled`, `publishService.getDueSchedules()` only selects `status='uploaded'` rows — and `content_assets` is untouched by the agent, so it cannot reach `'uploaded'` without a human completing UC008.

---

## 10. Database — New Migrations (continuing the numbered sequence, currently at `023`)

UUID PKs, `TIMESTAMPTZ`, snake_case, RLS via `get_caller_user_id()`/`get_caller_role()`, explicit `GRANT`s — same conventions as every other migration in `database/migrations/`.

### `024_create_agent_schedules.sql`
```sql
CREATE TABLE IF NOT EXISTS agent_schedules (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_preference TEXT NOT NULL,            -- "what idea the user mostly wants" (free text)
    hashtags           TEXT[] NOT NULL DEFAULT '{}',
    preferred_times    TEXT[] NOT NULL DEFAULT '{}',   -- ['08:00','19:00'] WIB
    image_style        TEXT NULL,
    ideas_per_day      INTEGER NOT NULL DEFAULT 3,      -- "how many content per day"
    run_time           VARCHAR(5) NOT NULL,             -- 'HH:MM' WIB, when Cloud Scheduler fires
    frequency          VARCHAR(10) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
    active             BOOLEAN NOT NULL DEFAULT true,
    last_run_at        TIMESTAMPTZ NULL,
    next_run_at        TIMESTAMPTZ NULL,
    created_by         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS: owner (created_by) + admin read-all, same pattern as notifications (023)
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_schedules TO authenticated;
```

### `025_create_agent_runs.sql`
```sql
CREATE TABLE IF NOT EXISTS agent_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id     UUID NULL REFERENCES agent_schedules(id) ON DELETE SET NULL,
    trigger_source  VARCHAR(10) NOT NULL CHECK (trigger_source IN ('manual','cron')),
    status          VARCHAR(10) NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running','success','partial','failed')),
    ideas_requested INTEGER NOT NULL DEFAULT 0,
    ideas_created   INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT NULL,
    triggered_by    UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE ON agent_runs TO authenticated;
```

### `026_add_agent_fields_to_content_queue_schedules.sql`
```sql
ALTER TABLE content_queue_schedules
    ADD COLUMN IF NOT EXISTS agent_run_id UUID NULL REFERENCES agent_runs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS preview_image_url TEXT NULL;
```

### `027_extend_notifications_type_for_agent.sql`
```sql
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'publish_success','publish_failed','comment_added','tiktok_disconnected',
    'idea_approved','idea_rejected','agent_run_completed','agent_run_failed'
));
```

### `028_create_agent_run_evaluations.sql` (Phase 3 — see §15)
```sql
CREATE TABLE IF NOT EXISTS agent_run_evaluations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_run_id    UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    judge_model     VARCHAR(40) NOT NULL,         -- e.g. 'claude-opus-4-8' or 'gpt-5.5'
    task_success    BOOLEAN NOT NULL,             -- this judge's TSR vote for the run
    score           NUMERIC(4,2) NULL,            -- 0-100 rubric score, judge-specific
    rationale       TEXT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT ON agent_run_evaluations TO authenticated;
```

---

## 11. `ai-analyzer` (Python) Implementation Plan

### New folder layout
```
ai-analyzer/
  app/
    agent/
      __init__.py
      agent_runner.py        # ClaudeSDKClient session: skills + mcp_servers + tools
      mcp_config.py          # MCP_SERVERS dict (§3)
      skills/
        copywriting/SKILL.md
        trend_search/SKILL.md
        scheduling/SKILL.md
      tools/
        image_tool.py        # generate_image() — wraps services/image_generator.py
      run_store.py           # plain supabase-py admin client — agent_runs/agent_schedules bookkeeping ONLY
    routers/
      agent.py               # /agent/trigger, /agent/runs/:id, /agent/schedule CRUD, /agent/cron-trigger
```

**Important distinction:** the agent's *own* DB reads/writes (existing-slot check, final draft insert) go through the **Supabase MCP tool**, as part of its tool-use loop — that's the point of giving it that MCP server. The FastAPI layer's *own* bookkeeping (flipping `agent_runs.status`, `agent_schedules.last_run_at`) uses a plain `supabase-py` client in `run_store.py`, same role as `supabaseAdmin` in Node — these are two different concerns and shouldn't be conflated.

### `app/agent/agent_runner.py` (sketch)
```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions
from app.agent.mcp_config import MCP_SERVERS
from app.agent.tools.image_tool import generate_image
from app.agent.run_store import update_run_progress, finalize_run

SKILLS_DIR = "app/agent/skills"

async def run_agent(run_id: str, prefs: dict, triggered_by: str | None):
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-6",
        skills_dir=SKILLS_DIR,                 # loads copywriting/trend_search/scheduling
        mcp_servers=MCP_SERVERS,                # tavily + supabase
        tools=[generate_image],                 # direct tool, not MCP
        system_prompt=_build_system_prompt(prefs),
    )
    created = 0
    async with ClaudeSDKClient(options=options) as client:
        for _ in range(prefs["ideas_per_day"]):
            try:
                await client.query(_idea_instruction(prefs))
                async for _ in client.receive_response():
                    pass  # agent uses its skills/tools/MCP calls autonomously per turn
                created += 1
                await update_run_progress(run_id, created)
                await _notify_node_progress(run_id, triggered_by, created)
            except Exception as exc:
                # one failed idea must not abort the run — NFR-002, same rule as image_generator.py
                continue
    await finalize_run(run_id, created, prefs["ideas_per_day"])
```

### `app/agent/tools/image_tool.py`
Wraps the existing `services/image_generator.generate_idea_image()` — no new image logic, just exposed as a tool the agent can call mid-loop, then the same function uploads to the `leadflow-media` Supabase Storage bucket as today.

### `app/routers/agent.py`
| Route | Notes |
|---|---|
| `POST /agent/trigger` | body: prefs; inserts `agent_runs` row via `run_store`, starts `run_agent()` as a background task, returns `{ run_id }` |
| `GET /agent/runs/{run_id}` | reads `agent_runs` |
| `POST/GET/PATCH/PATCH/DELETE /agent/schedule[...]` | CRUD on `agent_schedules` |
| `POST /agent/cron-trigger` | **guarded**: `X-Cron-Secret` header must match `CRON_SECRET` env — this is a public Cloud Run URL once deployed, so this check is mandatory, not optional. Finds `agent_schedules` due at the current WIB `HH:MM`, spawns `run_agent()` per due row with `trigger_source='cron'` |

### `requirements.txt` additions
```
claude-agent-sdk>=0.1.0
supabase>=2.6.0
```

### `ai-analyzer/.env.example` additions
```
TAVILY_API_KEY=your_tavily_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=your_long_random_secret
NODE_BACKEND_CALLBACK_URL=http://127.0.0.1:5000
AGENT_CALLBACK_SECRET=your_long_random_secret
```
(`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` already exist in this file and are reused.)

---

## 12. Node.js Backend — Thin Proxy Only

No business logic in Node for this feature — only auth/role gating and forwarding, the same shape `imageGenerationClient.ts` already uses to reach `ai-analyzer`.

### `backend/src/controllers/agentController.ts` (new)
Each handler does `authMiddleware` → `roleMiddleware(['marketing_staff','admin'])` → `axios` call to `AI_SERVICE_URL` → relay the response through `success()`/`error()` (`responseHelper.ts` — never raw `res.json()`).

### `backend/src/routes/agentRoutes.ts` (new), mounted as `app.use('/api/agent', agentRoutes);` in `app.ts` before the 404 catch-all.

### `backend/src/routes/agentInternalRoutes.ts` (new) — NOT proxied, Node-only
```ts
// POST /api/agent/internal/progress  — called by ai-analyzer, not the browser
// Guarded by X-Agent-Callback-Secret, not authMiddleware (no browser JWT involved)
router.post('/internal/progress', verifyAgentCallbackSecret, (req, res) => {
  const { user_id, run_id, ideas_created, status } = req.body;
  notificationWSService.broadcastAgentProgress(user_id, { run_id, ideas_created, status });
  success(res, { message: 'ok' });
});
```
This is the one new piece of real Node logic: relaying the Python service's progress callback onto the existing `notif:${userId}` Socket.IO room (`notificationWebSocketService.ts`, unchanged otherwise).

### Env additions — `backend/.env.example`
```
AI_SERVICE_URL=http://127.0.0.1:8000          # Cloud Run URL in production
AGENT_CALLBACK_SECRET=your_long_random_secret  # must match ai-analyzer's value
```

---

## 13. Frontend — Agentic Mode View

The preference form surfaces exactly four staff-facing inputs (everything else is internal):

| Field | UI control | Maps to |
|---|---|---|
| **Set time and date** | Time picker(s) for preferred posting times (WIB) + (run-once mode) a date range, or (daily mode) a single "run at HH:MM" | `preferred_times`, `run_time` |
| **Content preferences** | Free-text / chips: "what idea do you mostly want to create for TikTok" | `content_preference` — fed verbatim into the Trend Search + Copywriting skills |
| **Hashtags** | Tag input, multiple | `hashtags` |
| **How many content per day** | Number stepper | `ideas_per_day` |

### Folder layout (TypeScript, matches existing `pages/content/`, `components/content/` convention)
```
frontend/src/pages/content/
  AgenticModePage.tsx           # 3-state machine: Form / Running / Result

frontend/src/components/content/
  AgentPreferenceForm.tsx       # the 4 fields above + run-mode toggle
  AgentScheduleManager.tsx      # view/pause/edit/delete the active agent_schedules row
  AgentRunningPanel.tsx         # Socket.IO-driven progress (notif:${userId} → "agent:progress")
  AgentResultGrid.tsx           # preview cards once done

frontend/src/services/agentService.ts   # axios + getAccessToken, paths `/agent/...` (VITE_API_BASE_URL already ends in /api)
```

Destructive actions on `AgentScheduleManager.tsx` (pause/delete) go through the existing `useConfirm()` hook (`ConfirmContext.tsx`), not `window.confirm()` — standing project convention since Session 15.

---

## 14. Google Cloud Setup — Step by Step

This is the piece that makes "set time and date" actually fire on its own: `ai-analyzer` (with the Python agent) runs on **Cloud Run**, and **Cloud Scheduler** calls its `/agent/cron-trigger` endpoint at the cadence staff configured.

### Step 1 — Install & authenticate `gcloud` CLI
```bash
gcloud --version || echo "not installed — see https://cloud.google.com/sdk/docs/install"
gcloud init
gcloud auth login
```

### Step 2 — Select/confirm the project
```bash
gcloud projects list
gcloud config set project YOUR_PROJECT_ID
gcloud config get-value project
```

### Step 3 — Enable required APIs (check before enabling)
`cloudscheduler.googleapis.com` and `cloudbuild.googleapis.com` are **already enabled** in this `gcloud` CLI/project — only `run.googleapis.com` still needs the check:
```bash
gcloud services list --enabled | grep run.googleapis.com || gcloud services enable run.googleapis.com

# Confirm the other two are already on (should both print a row, no `enable` needed):
gcloud services list --enabled | grep cloudscheduler.googleapis.com
gcloud services list --enabled | grep cloudbuild.googleapis.com
```
If either of the last two prints nothing, the CLI's active project (`gcloud config get-value project`, Step 2) doesn't match the project they were enabled on — re-check that before re-enabling, rather than assuming they need to be turned on again.

### Step 4 — Deploy `ai-analyzer` to Cloud Run
```bash
cd ai-analyzer/

gcloud run deploy leadflow-ai-analyzer \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars ANTHROPIC_API_KEY=xxx,ANTHROPIC_MODEL=claude-sonnet-4-6,IMAGE_GPT_API_KEY=xxx,OPENAI_IMAGE_MODEL=gpt-image-1,TAVILY_API_KEY=xxx,SUPABASE_URL=xxx,SUPABASE_SERVICE_ROLE_KEY=xxx,CRON_SECRET=xxx,NODE_BACKEND_CALLBACK_URL=xxx,AGENT_CALLBACK_SECRET=xxx

gcloud run services describe leadflow-ai-analyzer \
  --region asia-southeast1 \
  --format='value(status.url)'
```
Save the printed URL — set it as `AI_SERVICE_URL` in the Node backend's environment.

> `--allow-unauthenticated` is required because Cloud Scheduler's HTTP target hits this service over the public internet — that's exactly why `/agent/cron-trigger` enforces `X-Cron-Secret` at the application layer (§11). Every other route on this service should additionally require the existing JWT-based auth the Node proxy already enforces before it ever forwards a request.

### Step 5 — Create the Cloud Scheduler job
One job, fired frequently enough to catch every staff-configured `run_time`; the backend itself decides which `agent_schedules` rows are actually due "now" (WIB) when the endpoint fires — same idea as a single hourly Cloud Scheduler job fanning out to many restaurants.
```bash
gcloud scheduler jobs list --location=asia-southeast1   # check first

gcloud scheduler jobs create http leadflow-agent-cron \
  --location=asia-southeast1 \
  --schedule="*/15 * * * *" \
  --uri="https://YOUR_CLOUD_RUN_URL/agent/cron-trigger" \
  --http-method=POST \
  --headers="Content-Type=application/json,X-Cron-Secret=YOUR_CRON_SECRET" \
  --message-body="{}" \
  --time-zone="Asia/Jakarta"
```
`*/15 * * * *` = every 15 minutes — close enough to a staff-chosen `HH:MM` without needing per-restaurant jobs. Tighten to `* * * * *` (every minute) if exact-minute firing matters more than Cloud Scheduler invocation cost.

### Step 6 — Verify
```bash
gcloud run services list --region asia-southeast1
gcloud scheduler jobs list --location=asia-southeast1
gcloud scheduler jobs run leadflow-agent-cron --location=asia-southeast1   # manual fire, check logs
gcloud run services logs read leadflow-ai-analyzer --region asia-southeast1 --limit 50
```
Confirm: a manual job run with no due schedules returns `{ "triggered_runs": [], "count": 0 }`; with one `active=true` row whose `run_time` matches current WIB time, it returns one `run_id` and a corresponding `agent_runs` row appears in Supabase with `status` eventually flipping away from `running`.

### Step 7 — Rotate secrets safely
`CRON_SECRET` and `AGENT_CALLBACK_SECRET` live in two places each (Cloud Run env + the Scheduler job header / Node backend env) — rotate both ends together:
```bash
gcloud run services update leadflow-ai-analyzer --region asia-southeast1 \
  --update-env-vars CRON_SECRET=NEW_SECRET
gcloud scheduler jobs update http leadflow-agent-cron --location=asia-southeast1 \
  --headers="Content-Type=application/json,X-Cron-Secret=NEW_SECRET"
```

---

## 15. Phase 3 — Evaluation Harness (LLM-as-Judge + Task Success Rate)

Not part of Phase 1/2 delivery — scoped here so the schema (`agent_run_evaluations`, §10) lands now and the harness can be added without another migration later.

**Judges:** two independent models score every completed `agent_runs` row:
- **Claude Opus 4.8** (`claude-opus-4-8`)
- **OpenAI's flagship model at evaluation time** (referred to here as "GPT-5.5" per current naming — confirm the actual released model id before wiring this up, since names change)

**What each judge sees:** the original `agent_schedules` preferences (content preference, hashtags, preferred times, ideas/day) + the resulting `content_queue_schedules` rows for that `agent_run_id` (title, caption, hashtags, `scheduled_at`, `preview_image_url`).

**What each judge returns:** a structured verdict written to `agent_run_evaluations`:
- `task_success` (boolean) — did this run satisfy the brief: right number of ideas, on-brand copy, valid non-colliding WIB slots, hashtags present, image plausibly on-style?
- `score` (0–100) — rubric-weighted quality score
- `rationale` — short free-text justification

**Task Success Rate (TSR):**
```
TSR = (# agent_runs where task_success = true, per judge) / (# total evaluated agent_runs)
```
Computed per judge and as agreement-rate between the two judges (a low agreement rate is itself a signal the rubric needs tightening). Surface this as a simple aggregate (e.g. on `AgentScheduleManager.tsx` or a future admin-only panel) — not scoped further here.

**Where this runs:** a separate scheduled job (Cloud Scheduler job #2, or a manual trigger) that, for each `agent_runs` row without an evaluation yet, calls both judge models and inserts two `agent_run_evaluations` rows. Out of scope for Phase 1/2 — listed here only so the data model doesn't need to change when this is picked up.

---

## 16. Implementation Order

### Phase 1 — Core Agent (Python + MCP + GCP)
- [ ] Delete `ai-analyzer/app/services/apify_service.py` and `brightdata_service.py`
- [ ] Clean up `ai-analyzer/app/routers/chatbot.py` (`_fetch_posts`, `_summarize`, `_get_tiktok_context`, and their use in `chatbot_message`/`analyze_tiktok`) so it no longer imports the deleted services
- [ ] Remove `BRIGHTDATA_KEY`/`BRIGHTDATA_DATASET_ID`/`APIFY_KEY`/`APIFY_DATASET_ID` from `ai-analyzer/.env.example`
- [ ] Remove the orphaned `analyzeTikTokData()` from `backend/src/services/anthropicService.ts`
- [ ] Migrations `024`–`027`
- [ ] `ai-analyzer/app/agent/skills/{copywriting,trend_search,scheduling}/SKILL.md`
- [ ] `ai-analyzer/app/agent/mcp_config.py` (Tavily + Supabase only)
- [ ] `ai-analyzer/app/agent/tools/image_tool.py` (wraps existing `image_generator.py`)
- [ ] `ai-analyzer/app/agent/run_store.py` (plain `supabase-py` client, run/schedule bookkeeping)
- [ ] `ai-analyzer/app/agent/agent_runner.py`
- [ ] `ai-analyzer/app/routers/agent.py` + mount in `main.py`, including the `X-Cron-Secret`-guarded `/agent/cron-trigger`
- [ ] `requirements.txt` + `.env.example` additions (§11)
- [ ] `backend/src/controllers/agentController.ts` + `routes/agentRoutes.ts` (thin proxy), mount `/api/agent`
- [ ] `backend/src/routes/agentInternalRoutes.ts` (`/internal/progress`, secret-guarded, relays to Socket.IO)
- [ ] `frontend/src/services/agentService.ts`
- [ ] `frontend/src/pages/content/AgenticModePage.tsx` + the 4 components in §13
- [ ] Route registered in `appRoutes.tsx`; entry point linked from `/calendar/ideas`
- [x] Cloud Scheduler API (`cloudscheduler.googleapis.com`) enabled
- [x] Cloud Build API (`cloudbuild.googleapis.com`) enabled
- [ ] GCP setup per §14 (Cloud Run API check, `ai-analyzer` deploy, Cloud Scheduler job creation, secret rotation drill)
- [ ] Manual verification per §17

### Phase 2 — Later
- [ ] Resume a `partial` run instead of restarting
- [ ] `ai-analyzer` pytest coverage mocking the Claude Agent SDK + both MCP servers (per `testing.md`: never hit real external APIs in tests)
- [ ] Surface `agent_runs` history in `AgentScheduleManager.tsx`

### Phase 3 — Evaluation Harness
- [ ] Migration `028_create_agent_run_evaluations.sql`
- [ ] Judge-calling job (Opus 4.8 + current OpenAI flagship)
- [ ] TSR aggregation view/endpoint

---

## 17. Manual Verification Checklist

1. `POST /agent/trigger` directly against `ai-analyzer` (bypassing Node, for isolation) with valid prefs → `agent_runs` row appears, flips from `running` to `success`/`partial`/`failed`
2. Inspect a created idea's row: `status='draft'`, `auto_publish=false`, `agent_run_id` set, `preview_image_url` populated
3. Confirm it appears in `ContentLibrarySidebar` immediately without any approve step
4. `autoPublishJob` (Node) never touches these rows — still `draft`/`scheduled`, never reaches `uploaded` without UC008
5. Trigger via the real Node proxy (`POST /api/agent/trigger`) with a valid `marketing_staff` JWT → same result, confirms the proxy + role gate work
6. Two browser tabs, same user: trigger a run in tab A → progress updates live in tab B via the bell/notification socket, no refresh needed
7. `curl -i https://YOUR_CLOUD_RUN_URL/agent/cron-trigger` with **no** `X-Cron-Secret` → `403`
8. `gcloud scheduler jobs run leadflow-agent-cron` with one `active=true` `agent_schedules` row due → exactly one `agent_runs` row created, `trigger_source='cron'`
9. Toggle that row to `active=false` → next Scheduler fire produces zero new runs
10. Kill the Tavily MCP server (bad API key) → run still completes using the Copywriting skill's brand-voice fallback, doesn't hard-fail the whole run (per the Trend Search SKILL.md's own fallback instruction)
11. `grep -rn "window.confirm" frontend/src` stays at zero hits after `AgentScheduleManager.tsx` is added

---

*Phase 3 is intentionally light on detail — schema is reserved now (§10, `028`), implementation is deferred.*
