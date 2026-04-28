### Step 11 — Tests

**Backend (Supertest + Jest):**

- `tests/contentIdea.test.ts`:
  - POST `/api/content/generate` with a brief returns `Array<GeneratedScheduleDraft>` of length 2–3.
  - Every generated idea has `ai_model_used = 'claude-sonnet-4-6'` in the DB (not `'gpt-4o'`).
  - Approve writes exactly one row to `content_queue_schedules` (trigger works once).
  - Double-approve returns 409.
  - Reject sets `status='rejected'`, `validated_by = :uid`, `validated_at IS NOT NULL`, and `rejected_reason` matches the payload (or is NULL when omitted). Row still exists in `content_ideas` — do NOT assert row-count change.
  - Rejected ideas do not appear in the pending-validation listing endpoint.
  - Double-reject returns 409.
- `tests/comments.test.ts`:
  - POST comment on `draft` schedule → 201.
  - POST comment on `published` schedule → 403.
  - Business owner POST → 403.
  - GET comments by schedule id returns joined user name.

**Frontend (Vitest):**

- `tests/pages/GeneratedIdeasPage.test.tsx`:
  - Mock `/api/content/generate` returning 3 drafts → expect 3 cards in DOM.
  - Click Approve on card 1 → expect `approveIdea` service to be called with that id.
  - Click Reject on card 2 → expect card 2 to fade out (class `opacity-0`) within 300ms.
- `tests/components/CommentThread.test.tsx`:
  - `canComment=false` → textarea not in DOM, banner text visible.
  - `canComment=true` → textarea in DOM, typing enables Post button.

Target: all 43 existing tests still pass + at least 10 new tests added.

---

### Step 12 — Update `progress.md` with Session 9 entry

Append at the bottom:

```md
## Session 9 Update (YYYY-MM-DD) — Content Management Module Rebuild

### What Was Done
- Mounted `contentIdeaRoutes` and `promptRoutes` in `app.ts` (previously orphaned).
- Added new migration 018 `schedule_comments` with draft-only insert trigger + RLS.
- Rewrote `contentIdeaService.ts`: text-chat → structured schedule-agent emitting JSON.
- Finished `IdeaValidationController.ts`: approve triggers DB-level draft creation via existing migration 006 trigger.
- Added `commentsController.ts` + `commentsRoutes.ts` + `ScheduleComment` model.
- Frontend: backgrounds only updated on content/schedule/media pages (no component file changes per stakeholder rule).
- `GeneratedIdeasPage.tsx` now renders the Figma card-approval flow for 2–3 AI drafts.
- Calendar slot modal now embeds conditional `CommentThread` block (draft-only writeable).

### Files Modified
(list)

### Known Open Items
- (populate after testing)
```

---

## 4. Out-of-Scope Reminders

Per the stakeholder rules, these are NOT part of this plan:
- User Management Module changes
- Interaction Message Module (UC010–UC012)
- Weekly Dashboard Module (UC013)
- Any reply to public TikTok comments (that's Interaction module)
- Any change to authentication, OTP, profile, admin pages
- Any new UI component file — existing component files keep their structure

## 5. Acceptance Checklist

Before marking this plan complete, verify:

- [ ] `POST /api/content/generate` returns structured JSON, never plain text.
- [ ] Every newly-generated idea row has `ai_model_used = 'claude-sonnet-4-6'` (NOT `'gpt-4o'`).
- [ ] `ANTHROPIC_CONTENT_MODEL` env var is set; the chatbot module is unaffected and still uses `claude-haiku-4-5-20251001`.
- [ ] Approving an idea creates exactly one draft row via the existing DB trigger — not via duplicate application code.
- [ ] Rejecting an idea sets `status='rejected'` with `validated_by` and `validated_at` populated; the row is NOT deleted.
- [ ] Rejected ideas never create a calendar draft (trigger only fires on approval transition).
- [ ] Rejected ideas are filtered out of the pending-validation listing.
- [ ] Two different marketing_staff accounts see the same calendar rows (shared workspace).
- [ ] Posting a comment on a `draft` schedule succeeds.
- [ ] Posting a comment on a `published` schedule returns 403 — both from the controller check and (as fallback) the DB trigger.
- [ ] Business owner cannot post comments (403).
- [ ] Every timestamp displayed to the user is WIB (Asia/Jakarta, UTC+7).
- [ ] Every response uses `responseHelper`, not raw `res.json()`.
- [ ] Every new route is mounted in `app.ts` before the 404 handler.
- [ ] All 43 existing frontend tests still pass.
- [ ] At least 10 new tests (backend + frontend) added.

---

**End of plan.** This document is the source of truth for the Content Management Module sprint. Any drift from these contracts should be flagged against `progress.md` Session 9 before coding.