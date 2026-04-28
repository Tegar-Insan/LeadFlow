# LeadFlow — UC005 Generate Schedule: Design Q&A

**Session:** 2026-04-25
**Scope:** Content Management Module (UC004–UC009)
**Participants:** Tegar Insan Tohaga + Claude Code

---

## Q1 — UC005 Input Contract

**Question:** When a marketing staff member triggers "Generate Content Idea," what exactly do they type or submit? Free-text prompt or structured template fields (topic, tone, audience)?

**Answer:** Free-text prompt typed by the user based on their own preference for the content they want to create with AI.

**Decision:** Single `prompt_text` textarea. Maps directly to `prompts.prompt_text` column. No template assembly.

---

## Q2 — The Schedule Card Data Contract

**Question:** When the AI generates a draft schedule, what fields must each card contain?

**Answer:** Focus on AI that generates schedules directly — not text summaries. AI should fill all schedule-relevant fields.

**Decision — fields AI fills per card:**

| Field | Source |
|---|---|
| `hook` / title | `content_ideas.hook` — card headline |
| `custom_caption` | AI-written TikTok caption |
| `custom_hashtags` | AI-picked hashtag array |
| `scheduled_at` | AI-suggested WIB datetime |
| `music_type` | AI-suggested vibe |
| `content_type` | photo or video badge |

`auto_publish` defaults to `false`. `tiktok_account_id` pulled from connected `tiktok_accounts` row.

---

## Q3 — Where Does UC005 Live in the UI?

**Question:** Where does the marketing staff trigger "Generate Schedule with AI" — and where do the 2–3 approval cards appear?

Options:
- A: Separate page `/content/ideas`
- B: Slide-in panel inside `/schedule` queue page
- C: Inside `/calendar` page

**Answer:** Option A — separate page, has more functions.

**Decision:** Dedicated page for the full AI generation and approval experience.

---

## Q4 — Flow Between Prompt Page and Ideas Page

**Question:** How does the user get from the prompt to the cards?

Options:
- A1: Navigate to ideas page immediately, AI generates in background with loading state
- A2: Stay on prompt page until generation completes, then navigate
- A3: Single page — user types prompt and cards appear on the same page (like chatbot)

**Answer:** Like the chatbot — user writes prompt and AI generates schedule on the same page. Named `/generateidea`.

**Decision:** Single page `/generateidea`. Prompt input at the top/bottom, cards render inline below. No navigation between pages. `GeneratedIdeasPage.tsx` rewritten to back this route. `/content/prompt` page is not needed.

---

## Q5 — Card Anatomy

**Question:** What information should each generated card display for the user to make an Approve/Reject decision?

**Answer:** No estimated engagement — no real-time TikTok API data available to back it up.

**Decision — final card fields:**
- Hook / title (headline)
- Caption (`custom_caption`)
- Hashtags (`custom_hashtags`) as pills
- Suggested date + time (`scheduled_at` WIB) — "Best time to post"
- Music type (`music_type`)
- Content type badge (`poster_photo` / `short_video`)
- Approve ✅ / Reject ❌ buttons

**Excluded:** Estimated engagement (no real-time data).

---

## Q6 — Approve Interaction

**Question:** After the user clicks Approve on a card, what does the UI do?

Options:
- A: Card disappears / collapses with a success animation — user stays on `/generateidea` for remaining cards
- B: Card flips to "✅ Added to Calendar" confirmed state — stays visible but locked
- C: After all cards decided, redirect to `/schedule`

**Answer:** Option A — card disappears with success animation.

**Decision:** Approved card collapses and disappears. User stays on `/generateidea` to handle the remaining cards. No forced redirect.

---

## Full Decision Summary

| # | Decision |
|---|---|
| D1 | UC005 input = free-text prompt by user |
| D2 | AI generates schedules directly — not idea text |
| D3 | Single page: `/generateidea` — prompt input + cards on same page |
| D4 | No estimated engagement — only DB-mapped fields on cards |
| D5 | Card fields: hook, caption, hashtags, scheduled_at (WIB), music_type, content_type badge, Approve/Reject |
| D6 | Approve → card disappears with success animation, user stays on page |
| D7 | Reject → soft-delete (`status='rejected'`) |
| D8 | DB write flow: AI generates → `content_ideas` (pending_validation) → approve → DB trigger (migration 006) auto-creates draft in `content_queue_schedules` |
