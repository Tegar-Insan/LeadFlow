### Step 6 — Comments on draft schedules (UC015)

**Files:**
- `backend/src/controllers/commentsController.ts` (new)
- `backend/src/routes/commentsRoutes.ts` (new)
- `backend/src/models/ScheduleComment.ts` (new)

Endpoints:
- `POST /api/comments` — body `{ schedule_id, comment_text }`. Controller first queries the schedule: if `status !== 'draft'`, return **403 "Comments are locked after the schedule is published."** The DB trigger is a second line of defense.
- `GET /api/comments/:scheduleId` — list comments for that schedule, joined with `user_profiles` for display name. No draft check (reading old comments on a now-published post is fine, only writing is locked).
- `DELETE /api/comments/:id` — only the comment author or admin can delete.

RBAC: `marketing_staff` + `admin`. Business owner 403.

---

### Step 7 — Shared calendar check (no code if already correct)

**File:** `backend/src/controllers/calendarController.ts`

Re-read the SELECT query. Rule 3 says all marketing staff see one shared calendar. The query must NOT filter by `created_by = :userId` for marketing staff — it should return every schedule. From the progress.md and migration 006 RLS, this is already the case:

```sql
CREATE POLICY rls_cqs_staff_all ON content_queue_schedules
    FOR ALL USING (get_caller_role() = 'marketing_staff');
```

No user_id filter in the policy = shared workspace. **Confirm by running a quick Supabase query as two different staff accounts; both should see the same rows. No code change needed if so.**

If the controller currently filters by `created_by` in JS, remove that filter for role `marketing_staff`. Admin sees all anyway.

---

### Step 8 — Frontend background-only changes

Per rule 2: component structure stays identical, only page backgrounds change.

**Files affected (CSS/className edits only):**
- `frontend/src/pages/content/PromptPage.tsx`
- `frontend/src/pages/content/GeneratedIdeasPage.tsx`
- `frontend/src/pages/content/IdeaValidationPage.tsx`
- `frontend/src/pages/schedule/CalendarPage.tsx`
- `frontend/src/pages/schedule/ContentScheduleQueuePage.tsx`
- `frontend/src/pages/media/MediaUploadPage.tsx`

Change pattern — switch from the current dark/charcoal motif to Buffer's clean light motif:
```tsx
// Before: bg-[#1a1a1a] or bg-gradient-to-br from-slate-900 ...
// After:  bg-gradient-to-b from-white via-pink-50 to-white  (Krench accent)
```

**Do not** touch component imports, hooks, prop shapes, or children. Only the outermost wrapper `className`.

---

### Step 9 — Rebuild `GeneratedIdeasPage.tsx` UX (Figma card approval flow)

**File:** `frontend/src/pages/content/GeneratedIdeasPage.tsx`

The page currently has a UI but a stub backend (per progress.md). Now we point it at the real `/api/content/generate` endpoint and render the response as the Figma cards.

Contract:
1. Top: input textarea with placeholder `"Tell me what kind of TikTok content you want this week..."`.
2. Button `Generate Ideas` → calls `contentService.generateDrafts(brief)` → receives `GeneratedScheduleDraft[]`.
3. While loading: show `KineticLoader` (already exists per Session 3) with text "AI is thinking through your brief...".
4. Render each draft as a card:
   - Gradient header (pink→purple) with category badge + "Idea 1", "Idea 2", "Idea 3".
   - Body: `idea_title` (large), description (from `caption`), suggested caption (boxed, italic), hashtag pills, `estimated_engagement` chip, `best_time_to_post_wib` chip.
   - Footer: green **✓ Approve** button and outlined **✗ Reject** button.
5. Approve click → `POST /api/content/:id/approve` → on success, toast "Added to calendar as draft" + redirect the user to `/calendar` highlighting the new slot.
6. Reject click → opens a small inline prompt "Why reject? (optional)" with a textarea and "Skip & reject" + "Reject with reason" buttons. On confirm → `POST /api/content/:id/reject` with body `{ rejected_reason: string | null }` → fade card out, generate the next one if fewer than 3 remain. Rejected ideas are soft-deleted (status='rejected') server-side, NOT removed from the database — but filtered out of this listing.
7. "Generate More Ideas" button at the bottom = calls generate again with same brief.

**Display timezone:** always WIB (`formatDate.ts` dayjs+tz helper, per user memories).

---

### Step 10 — Calendar comment panel (UC015)

**File:** `frontend/src/components/schedule/ScheduleDetailModal.tsx` (exists as tsx already — per rule 2 do not add new components, only extend existing component's JSX conditionally).

Add a conditional block at the bottom of the modal body:

```tsx
{schedule.status === 'draft' ? (
  <CommentThread scheduleId={schedule.id} canComment={true} />
) : (
  <CommentThread scheduleId={schedule.id} canComment={false} />
)}
```

`CommentThread` is an internal sub-component **in the same file** (not a new component file — rule 2). It:
- Fetches `GET /api/comments/:scheduleId` on mount.
- Renders a list of comments (avatar from `user_profiles.profile_photo_url`, name, timestamp in WIB, body).
- If `canComment`: shows a textarea + "Post comment" button.
- If not: shows a muted banner "Comments are locked — this post has been published."