LeadFlow — Content Management Module Enhancement Plan

**Module Scope:** Content Management ONLY (UC004 – UC009)
**Author:** Tegar Insan Tohaga (A22EC4043)
**Client:** Krench Chicken, Bogor, West Java, Indonesia
**Continuation from:** `progress.md` Session 8 (2026-04-24)
**Constraint:** No changes to User Management, Interaction Message, or Weekly Dashboard modules

---

## Decisions Log (locked-in by stakeholder)

| # | Question | Decision | Consequence |
|---|---|---|---|
| D1 | Model for UC005 schedule generation | `claude-sonnet-4-6` | Wired via `ANTHROPIC_CONTENT_MODEL` env. Haiku 4.5 stays in the existing chat-only chatbot path. `content_ideas.ai_model_used` is explicitly written as `'claude-sonnet-4-6'` per insert, overriding the leftover `DEFAULT 'gpt-4o'` from migration 005. |
| D2 | Reject idea: hard- or soft-delete? | **Soft-delete** | Reject becomes an UPDATE to `status='rejected'` with `rejected_reason`, `validated_by`, `validated_at`. No schema change — migration 005 already reserves those columns. Listing endpoints must filter `WHERE status='pending_validation'`. The `prompts.ideas_count` cached counter now represents total-ever, not pending — any pending UI must use a COUNT query instead of the cached value. |

---

## 0. Pre-Flight Analysis (What Progress.md Tells Us)

Before writing a single line of code, I read `progress.md` from top to bottom and aligned each decision below to what already exists. Breaking any of these assumptions would break what already works.

### 0.1 What is already done (DO NOT rebuild)
- Full backend migration to **strict TypeScript ESM** (`.ts`, `NodeNext`, `strict: true`) — Session 7 locked this in.
- Frontend migration from `.jsx` to `.tsx` — components already exist as TypeScript React.
- Anthropic SDK client is live at `backend/src/config/anthropic.ts`. OpenAI was already removed.
- Calendar page `/calendar` is working end-to-end (CRUD, drag-drop, weekly view, draft management).
- Chatbot endpoints exist at `/api/chatbot/message`, `/api/chatbot/approve-schedule`, `/api/chatbot/reject-schedule` — they return **text only** right now, which is exactly what the client complained about.
- Route files `promptRoutes.ts` and `contentIdeaRoutes.ts` exist on disk but **are not mounted in `app.ts`**.
- Auto-publish cron job `autoPublishJob.ts` is wired, locked to 2026 / 08:00–22:00 WIB.
- TikTok OAuth is fully working with PKCE hex challenge.

### 0.2 What the stakeholder wants now (the 5 rules)
1. **No component file changes** — we moved jsx → tsx. Only backgrounds of pages are allowed to change.
2. **Content Management Module is the only module in scope for this plan.** User Management, Interaction Message, and Weekly Dashboard are frozen.
3. **One shared calendar dashboard for all marketing staff.** Every staff account — regardless of which admin created it — writes to and reads from the same `content_queue_schedules` rows. Admin manages the accounts; schedules are shared.
4. **Calendar comment rule:** if a slot is `draft` → comments allowed. If `published` → comments locked.
5. **Generation Content Idea (UC004/UC005) must go from "text-only chatbot" → "AI-agent that drafts real schedules"** with the 2–3 card approve/reject UI from the Figma reference, matching the Buffer-style composer.

### 0.3 Distinction that drives the whole plan
- `AI Chatbot (UC004 Consult)` = conversational, generates **text** only (existing behaviour — unchanged).
- `Generate Content Idea (UC005)` = agent-style, generates **2–3 structured draft schedules** → user approves → system writes to `content_queue_schedules` with `status='draft'`. **This is the new behaviour.**

These must never share code paths or endpoints. They are two different features that happen to both use Claude under the hood.

---

## 1. Competitive Reference — What I Pull from Buffer & Figma Mock

### 1.1 Buffer (`buffer.com`)
Based on the screenshots you uploaded and Buffer's public site:

- **Queue / Calendar / List** three-tab switching at the top right. We already have Calendar and List. We keep this pattern.
- **Composer modal** with post title, caption, hashtags, media drag-drop, and publish date/time picker — this is the pattern I'll mirror for the "Manage Content Queue" modal (screenshot 6 is already very close).
- **Left sidebar with channels** — for LeadFlow we show only the Krench Chicken TikTok channel (single outlet), so we keep the left pane but strip the multi-channel chooser.
- **Community tab** shows comments on published posts. We will **not** copy this for UC015 — our comment feature is for **draft** schedules (internal team review), not public TikTok comments. Those belong in the Interaction module (out of scope).
- **"Welcome to your Queue / Recommended Times"** empty state — nice touch, we will mirror this for the empty calendar state.

### 1.2 Figma TikTok Content Calendar reference (screenshot 2)
- **AI Content Assistant** page: gradient pink→purple header card, "BEHIND-THE-SCENES" category badge, idea title, description, suggested caption in a boxed input, hashtag pill cluster, green Approve / outlined Reject buttons, and a "Generate More Ideas" button.
- Each idea card shows **Estimated Engagement** + **Best Time to Post** — we already have fields on `content_ideas` (hook, suggested_music, estimated_duration) to back similar metadata.
- Chat input pinned at the bottom: "Press Enter to send, Shift+Enter for new line".

**Summary of what I'm adopting:** Buffer's composer/queue/calendar information architecture + Figma's card-based AI idea approval UX. I will **not** adopt Buffer's multi-channel chooser (Krench is single-channel) or its Community tab (comments in Interaction module, not Content module).

---

## 2. Chain of Thought — Task Breakdown

<task1> Audit existing files and confirm contract before coding. </task1>
<task2> Database — add one migration: `comments` table for UC015 draft-only comments. </task2>
<task3> Backend — mount `promptRoutes` and `contentIdeaRoutes` in `app.ts` (they exist but are unreachable). </task3>
<task4> Backend — rewrite `contentIdeaService.ts` so UC005 returns 2–3 structured schedule drafts (not a chat string). </task4>
<task5> Backend — implement `IdeaValidationController.ts` approve → writes draft schedule; reject → deletes idea. </task5>
<task6> Backend — add `commentsController.ts` + `commentsRoutes.ts` enforcing draft-only rule. </task6>
<task7> Backend — confirm shared-calendar behaviour by re-reading the `/api/calendar` RLS policies (no code change if already correct). </task7>
<task8> Frontend — change only the backgrounds of content-module pages as per rule 2; leave all other components untouched. </task8>
<task9> Frontend — upgrade `GeneratedIdeasPage.tsx` to render 2–3 approve/reject cards in the Figma style, calling the new endpoints. </task9>
<task10> Frontend — add a comment panel inside the calendar slot detail modal, visible only when `status='draft'`. </task10>
<task11> Testing — Vitest for frontend, Supertest for backend; specifically cover the draft-only comment rule, approve→calendar-write, reject→delete. </task11>
<task12> Update `progress.md` with Session 9 entry. </task12>

### Few-shot reasoning examples

<example1>
What if the stakeholder later asks us to let business owners comment too? → The comments table already has `user_id` FK to `users`, so adding a role to the allowlist in `commentsController.ts` is a one-line change. We design for that now without building it now.
</example1>

<example2>
What if Claude returns 5 ideas instead of 3? → The service layer hard-clamps `ideas.slice(0, 3)` before inserting. The system prompt asks for 2–3, but we never trust a model to count.
</example2>

<example3>
What if a marketing staff user deletes another staff's draft? → RLS policy on `content_queue_schedules` already uses `get_caller_role() = 'marketing_staff'` with NO owner check (per rule 3: "all accounts direct to one calendar dashboard"). This is intentional — shared workspace. Admin-only restore is out of scope for now.
</example3>

<example4>
What if the user publishes the schedule while a comment thread is open? → The PUT `/api/calendar/:id` that flips `status` to `scheduled`→`uploaded`→`published` must trigger a server-side check: when `status='published'`, the `POST /api/comments` endpoint returns 403. The frontend hides the comment input box. UI and API both enforce — never trust one side.
</example4>

---