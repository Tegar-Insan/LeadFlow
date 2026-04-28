## 3. Step-by-Step Implementation

### Step 1 — Audit (30 min, zero code)

Before writing anything:

```bash
# From repo root
grep -n "promptRoutes\|contentIdeaRoutes" backend/src/app.ts
grep -n "generateSchedulesFromBrief\|approveIdea" backend/src/services/contentIdeaService.ts
ls backend/src/controllers/ | grep -iE "idea|prompt|comment"
ls frontend/src/pages/content/
```

Confirm from the output:
- [ ] `contentIdeaRoutes` is NOT mounted (expected).
- [ ] `contentIdeaService.ts` currently returns only text (expected — this is what we're fixing).
- [ ] No `commentsController.ts` exists yet (we'll create it).
- [ ] `GeneratedIdeasPage.tsx` exists as `.tsx` (confirming Session 7 migration).

**Stop gate:** if any of these do not match the expectation, pause and re-read `progress.md`. Do not proceed until the starting state is confirmed.

---

### Step 2 — Database Migration `018_create_schedule_comments.sql`

**Why:** UC015 (Comment Marketing Staff Post) requires a persistent comment store. Rule 4 says draft-only.

**File:** `database/migrations/018_create_schedule_comments.sql`

Contract:
- Table `schedule_comments`: `id UUID PK`, `schedule_id UUID FK → content_queue_schedules(id) ON DELETE CASCADE`, `user_id UUID FK → users(id)`, `comment_text TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
- **CHECK constraint via trigger, not column** — enforce at insert time that the parent schedule's status is `'draft'`. Reject with `RAISE EXCEPTION` otherwise. This is server-side belt and suspenders — even if someone bypasses the API, the DB blocks it.
- Index on `schedule_id` for fast load of comment threads.
- RLS: `marketing_staff` can insert/select; `admin` can select all; `business_owner` no access (they view dashboards, not comment on staff drafts).
- `GRANT` lines included (per lessons-learned in `progress.md`).

Run via Supabase SQL editor or `MASTER_RUN_ALL.sql` amendment.

---

### Step 3 — Mount orphaned route files

**File:** `backend/src/app.ts`

Add (after existing mounts, before 404 handler):
```ts
import contentIdeaRoutes from './routes/contentIdeaRoutes.ts';
import promptRoutes from './routes/promptRoutes.ts';
import commentsRoutes from './routes/commentsRoutes.ts'; // new file from Step 6

app.use('/api/content', contentIdeaRoutes);
app.use('/api/prompt', promptRoutes);
app.use('/api/comments', commentsRoutes);
```

Per lesson-learned: "All routes must be mounted in app.ts before the 404 handler." Do not forget this.

---

### Step 4 — Rewrite `contentIdeaService.ts` as an agent

**File:** `backend/src/services/contentIdeaService.ts`

**This is the core behaviour change.** Current state: returns a text string. Target state: returns an array of 2–3 structured draft objects.

Contract:
```ts
export interface GeneratedScheduleDraft {
  idea_title: string;
  hook: string;
  caption: string;
  hashtags: string[];           // e.g. ['#KrenchChicken', '#BogorFood']
  suggested_music: string;
  estimated_duration: number;   // seconds
  estimated_engagement: 'low' | 'medium' | 'high';
  best_time_to_post_wib: string; // ISO 8601 in WIB, e.g. '2026-05-02T19:00:00+07:00'
  category: string;             // 'BEHIND-THE-SCENES' | 'MENU-SHOWCASE' | 'PROMOTION' | 'TESTIMONIAL'
}

export async function generateScheduleDraftsFromBrief(
  brief: string,
  userId: string,
): Promise<GeneratedScheduleDraft[]>
```

Inside the function:
1. `INSERT INTO prompts(prompt_text, user_id) RETURNING id`.
2. Call `anthropic.messages.create` with **`model: process.env.ANTHROPIC_CONTENT_MODEL ?? 'claude-sonnet-4-6'`** (locked-in decision — Sonnet 4.6 for UC005 schedule generation; Haiku 4.5 stays in the chat-only `AI Chatbot` path).
3. System prompt: instructs the model to return a JSON array of exactly 2–3 objects matching the `GeneratedScheduleDraft` shape, with `best_time_to_post_wib` picked from the Indonesian TikTok peak windows (11:00–13:00, 19:00–21:00 WIB).
4. Parse the JSON. If parse fails, return `[]` and log (do not crash).
5. `slice(0, 3)` to hard-clamp. Never trust the model's count.
6. For each draft: `INSERT INTO content_ideas(prompt_id, created_by, idea_title, hook, caption, hashtags, suggested_music, estimated_duration, status, ai_model_used)` with `status='pending_validation'` and `ai_model_used='claude-sonnet-4-6'` — explicitly overriding the `DEFAULT 'gpt-4o'` left over from migration 005 so the audit trail is accurate.
7. Return the array with the inserted `id` attached to each.

**Env wiring:** add `ANTHROPIC_CONTENT_MODEL=claude-sonnet-4-6` to `backend/.env` and `backend/.env.example`. Keeps the model id configurable; avoids repeating the "GEMINI_MODEL invalid" lesson-learned in `progress.md`.

**Why structured JSON, not free text:** the Figma card UI needs fields. If we force the model to emit structured JSON, we get field-by-field reliability. This is the "AI-agent" behaviour — the model fills a schema, not a paragraph.

**Controller:** `contentIdeaController.ts`

- `POST /api/content/generate` — body `{ brief: string }` → returns the `GeneratedScheduleDraft[]`.
- `POST /api/content/:ideaId/approve` — delegates to `IdeaValidationController.approve`.
- `POST /api/content/:ideaId/reject` — delegates to `IdeaValidationController.reject`.

Protect with `authMiddleware` + `roleMiddleware(['marketing_staff', 'admin'])`. Use `responseHelper`, never raw `res.json()`.

---

### Step 5 — Approve / Reject wiring

**File:** `backend/src/controllers/IdeaValidationController.ts` (file already exists, finish it)

- **Approve:** `UPDATE content_ideas SET status='approved', validated_by=:uid, validated_at=NOW() WHERE id=:id AND status='pending_validation'`. The existing `trg_idea_approved_create_draft` trigger from migration 006 automatically writes a row into `content_queue_schedules` with `status='draft'`. **We do NOT double-insert from application code.** Return the new schedule id by selecting the latest draft for that idea.

- **Reject (SOFT-DELETE — locked-in decision):**
  ```sql
  UPDATE content_ideas
     SET status = 'rejected',
         rejected_reason = :reason,   -- nullable; comes from optional frontend input
         validated_by = :uid,
         validated_at = NOW()
   WHERE id = :id
     AND status = 'pending_validation'
  ```
  Migration 005 already has `rejected_reason`, `validated_by`, `validated_at` columns reserved for exactly this — no schema change needed. The trigger does not fire (it only fires on transition TO `'approved'`), so no ghost drafts.

- **Edge case:** if the idea is already approved and someone double-clicks, return 409 Conflict — the `AND status='pending_validation'` clause on the UPDATE means the row count is 0 in that case; detect and 409. Same guard for rejecting an already-rejected idea.

- **Listing filter (important consequence of soft-delete):** the pending-validation listing endpoint must filter `WHERE status = 'pending_validation'`. Without this, rejected cards re-appear after page refresh because they still exist in the table. Currently the stub controller has no filter — we add it.

- **Known ledger side-effect:** `prompts.ideas_count` is incremented on INSERT and decremented on DELETE by the `trg_prompt_ideas_count_sync` trigger from migration 005. Because we now soft-delete instead of hard-delete, the cached counter represents "all ideas ever generated for this prompt," not "currently pending." That's fine for audit, but **any UI screen that wants a pending count must run `COUNT(*) WHERE status='pending_validation'`** — do not trust the cached counter for pending-state UI. Document this comment next to the column in the controller.

---