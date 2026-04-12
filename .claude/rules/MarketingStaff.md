# Marketing Staff — Role Rules & Context for LeadFlow

**Source of truth:** SRS §2.1.3, SDS §5.4/§5.8, STD TC004–TC012, migrations `004`–`011`
**Last updated:** 2026-04-12
**Role key in DB:** `marketing_staff` (enum `user_role_enum`)

---

## 1. Who the Marketing Staff Is

The Marketing Staff is the **primary daily operator** of LeadFlow. Per SRS §2.1.3:

- **Role:** Primary system operator responsible for content creation, scheduling, publishing, and interaction handling.
- **Position Level:** Operational — daily management of TikTok content marketing activities.
- **Technical Skill Level:** Basic to intermediate digital skills. Familiar with TikTok, comfortable with web dashboards, uploading media, managing calendars.
- **Usage cadence:** Multiple times daily.
- **Count:** Two people in the Marketing Division at Krench Chicken (per client brief).
- **Characteristic:** Needs clear intuitive UI, visual calendar-based scheduling, automation to reduce manual posting, real-time feedback on publish status and interactions, quick access to content generation + calendar + interaction features.

**Implication for UI/UX:** Marketing Staff screens must be action-first — drag-and-drop calendar, inline media preview, one-click approve/reject, fast inbox triage, visible publish-status badges.

---

## 2. Use Cases the Marketing Staff Participates In

From SRS Table 2.1 and Functional Requirements Table 4-1:

| UC | Name | Marketing Staff's Role |
|----|------|------------------------|
| UC001 | Register Account | Self-registers with OTP email verification |
| UC002 | Authenticate User | Login/logout with OTP and JWT |
| UC004 | Input Prompt Idea | **Owner** — submits content prompts to the AI |
| UC005 | Generate Content Idea | **Owner** — triggers GPT-4o generation |
| UC006 | Validate AI Content Ideas | **Owner** (shared with Business Owner per SRS) — approve/reject AI ideas |
| UC007 | Manage Content Schedule Queue | **Exclusive** — full CRUD, drag-and-drop, priority, filter |
| UC008 | Upload Content Feed in Calendar | **Exclusive** — upload poster photos or short videos |
| UC009 | Notify Publish Status | **Recipient** of publish success/failure notifications |
| UC010 | Fetch Data Interaction | **Owner** — triggers/receives TikTok inbox sync |
| UC011 | Classify Interaction Type | Consumer — AI classifies automatically; staff sees results |
| UC012 | Manage Interaction Message | **Exclusive** — view, filter, reply, archive, delete |

**Explicitly NOT permitted for Marketing Staff:**
- UC003 Manage Account → **Admin only** (SRS v3.0 revision)
- UC013 View Weekly Dashboard → **Business Owner only** (intentional per SDS; RLS blocks it at DB level)

---

## 3. Canonical Use Case Flows (Text Conversion of SDS Diagrams)

### 3.1 UC004 Input Prompt Idea (SRS §2.3.4)

**Preconditions:** Logged in; has access to AI content generation; has prompt details.
**Postconditions:** Prompt saved with status `Draft`; available for generation.

**Normal Flow:**
1. Navigate to AI content generation idea page.
2. System displays the Prompt Input form.
3. Enter prompt details (topic, target audience, tone, etc.).
4. Click **Submit**.
5. System validates input.
6. System saves the prompt to `prompts` table.
7. System shows submission confirmation.

**Alternative Flow AF1 — Use Template:** Select predefined template → system auto-fills fields → staff reviews and submits.

**Exception Flows:**
- EF1 Incomplete data → error, submission blocked.
- EF2 System failure → error, prompt not stored.

---

### 3.2 UC005 Generate Content Idea (SRS §2.3.5)

**Preconditions:** Logged in; valid prompt exists; OpenAI API available.
**Postconditions:** Ideas stored with status `pending_validation`; linked to prompt.

**Normal Flow:**
1. Staff types prompt idea (or reuses existing).
2. Clicks **Generate Content Idea**.
3. System retrieves prompt from DB.
4. System sends prompt to OpenAI (GPT-4o).
5. AI returns up to **3 ideas** (SDS UC006 constraint).
6. System stores in `content_ideas` table with `status = pending_validation`.
7. System displays ideas to user.

**Alternative Flow AF1 — Regenerate:** Staff clicks Regenerate → resend to AI → replace or append results.

**Exception Flows:**
- EF1 AI unavailable → error, stop.
- EF2 Invalid prompt data → abort, notify.

---

### 3.3 UC006 Validate AI Content Ideas (SRS §2.3.6)

**Preconditions:** Logged in; ideas with status `pending_validation` exist.
**Postconditions:** Approved ideas → auto-create draft in `content_queue_schedules` (initially unscheduled). Rejected → status `rejected`, never enters calendar.

**Normal Flow:**
1. Login.
2. System displays list of AI-generated ideas.
3. Staff selects an idea to review.
4. System shows idea details (title, hook, caption, hashtags, suggested music, duration).
5. Staff clicks **Approve**.
6. System updates status → `approved`.
7. **Trigger** (migration 006) auto-creates a draft row in `content_queue_schedules`.
8. System displays draft in calendar view.
9. Confirmation shown.

**Alternative Flow AF1 — Reject:**
1. Click Reject → prompt for reason → submit → status → `rejected` → NOT added to calendar.

**Exception Flows:**
- EF1 Idea not found → error.
- EF2 Update failure → error notification.
- EF3 Draft creation failure after approval → error; idea stays in `approved` state for retry.

---

### 3.4 UC007 Manage Content Schedule Queue (SRS §2.3.7 / Thesis Table 4-2)

**Preconditions:** Logged in; ideas approved; draft schedules auto-created.
**Postconditions:** Content stored with schedule info; auto-published at specified time; publish status recorded.

**Normal Flow (Activity Diagram Figure 2.16 / Figure 4-3 converted):**
1. Navigate to **Manage Content Queue** page.
2. System loads existing calendar + drafts.
3. System displays approved AI content as **Draft** entries in the calendar.
4. Staff selects a draft.
5. Staff can **edit, update, or delete** the draft.
6. Staff sets preferred publish date + time (**GMT+7 / WIB**).
7. System validates schedule time.
8. System saves and updates status → `Scheduled`.
9. System monitors scheduled time automatically (cron / `autoPublishJob.js`).
10. At scheduled time → system triggers auto-publish to TikTok (TikTok Business API).
11. System updates publish status, stores result in `publish_status_logs`.
12. System notifies Marketing Staff of publish status (and Business Owner per UC009).
13. Staff can **drag and drop** scheduled content to a new time/date.
14. Staff can **filter** by daily / weekly / monthly.

**Alternative Flows:**
- AF1 Update scheduled content — select, update time/priority, save.
- AF2 Remove draft or scheduled content — select, delete, queue list updates.

**Exception Flows:**
- EF1 Invalid schedule time → error + correction prompt.
- EF2 Auto-publish failure → status `Failed` + failure notification.

**Sequence Diagram Text (SD007–SD010 consolidated):**
```
MarketingStaff → CalendarPage : open /calendar
CalendarPage → CalendarController : GET /api/calendar
CalendarController → CalendarService : fetchWeek(user_id, start_of_week_WIB)
CalendarService → ContentQueueSchedules (Model) : SELECT WHERE status IN ('draft','scheduled')
Model → CalendarService : rows
CalendarService → CalendarController : { week_grid }
CalendarController → CalendarPage : 200 OK
CalendarPage → MarketingStaff : render 7×15 time-slot grid (08:00–22:00 WIB)

MarketingStaff → CalendarPage : drag item to new slot
CalendarPage → CalendarController : PUT /api/calendar/:id { scheduled_at }
CalendarController → CalendarService : reschedule(id, new_time_utc)
CalendarService → Model : UPDATE content_queue_schedules SET scheduled_at = ?
Model → CalendarService : OK
CalendarService → CalendarController : updated row
CalendarController → CalendarPage : 200 OK
CalendarPage → MarketingStaff : animate card to new slot
```

---

### 3.5 UC008 Upload Content Feed in Calendar (SRS §2.3.8)

**Preconditions:** Logged in; approved idea exists; scheduled slot exists; file meets format + size rules.
**Postconditions:** Media stored in `content_assets` + Supabase Storage (`leadflow-media` bucket); linked to schedule; status → `Uploaded for Publishing`.

**Normal Flow:**
1. Navigate to Content Calendar.
2. System displays staff's scheduled slots.
3. Staff selects a slot.
4. System shows upload option.
5. Staff selects content type — **`poster_photo`** or **`short_video`** (enum values, not generic names).
6. Staff selects media file(s).
7. System validates format + size.
8. System stores media + links to slot via `queue_schedule_id`.
9. System updates status → `Uploaded for Publishing`.
10. Success confirmation shown.

**File constraints (from existing backend + SRS):**
- PNG / JPG / JPEG for photos
- MP4 / MOV for videos
- Max **50 MB** per file
- For `poster_photo` carousels: multiple files allowed, linked via FK `queue_schedule_id` on `content_assets`

**Alternative Flow AF1 — Replace:** Select slot that already has media → upload replacement → old file soft-deleted or replaced.

---

### 3.6 UC010 Fetch Data Interaction (SRS §2.3.10)

**Preconditions:** Logged in; TikTok Business API configured.
**Postconditions:** Interactions stored with `classification_status = 'unclassified'`.

**Normal Flow:**
1. Navigate to Interaction Message Module.
2. Click **Fetch Data Interaction** (or triggered by cron `fetchInteractionJob.js`).
3. System sends request to TikTok Business API.
4. API returns comments + DMs.
5. System stores in `interaction_messages`; `tiktok_message_id` UNIQUE prevents dupes.
6. System displays interaction metrics.

**Exception Flows:**
- EF1 API unavailable → error, stop.
- EF2 No data → empty state.

---

### 3.7 UC011 Classify Interaction Type (SRS §2.3.11) — Automatic

**Preconditions:** Logged in; unclassified interactions exist; OpenAI API available.
**Postconditions:** Each eligible interaction gets classification → status flipped to `classified` → visible in inbox.

**Normal Flow:**
1. System retrieves unclassified interactions.
2. System prepares classification inputs (text, channel_type).
3. System sends data to AI classification engine (FastAPI `/analyze`).
4. AI analyzes content (sentiment + priority + `sales_lead` flag).
5. AI returns classification.
6. System validates AI response format.
7. System stores result in `classify_type_messages`.
8. System updates interaction `classification_status = 'classified'`.
9. Inbox view refreshes with labels.

**Exception Flows:**
- EF1 AI failure → status stays `unclassified`.
- EF2 Invalid/corrupted data → skip + log.

**Output labels (from `classify_type_messages`):**
- `sentiment_type`: positive / neutral / negative
- `priority_level`: high / medium / low
- Special tag: **`sales_lead`** — used for Weekly Dashboard `leads_count`

---

### 3.8 UC012 Manage Interaction Message (SRS §2.3.12)

**Preconditions:** Logged in; TikTok connected; interactions fetched + classified.
**Postconditions:** Status updates saved; sales-related stay prioritized; archived removed from active inbox; dashboard counters updated.

**Normal Flow:**
1. Staff opens interaction inbox.
2. System auto-fetches comments + DMs from TikTok (if triggered).
3. System stores them.
4. Inbox displayed **sorted by priority**.
5. Filter by comments or DMs.
6. Select an interaction.
7. System shows interaction detail + classification.
8. Staff updates interaction status (responded / archived / escalated).
9. System saves.
10. List + counters refresh.

**Alternative Flows:**
- AF1 Sales-related → system highlights → staff sends sales reply → status updated.
- AF2 Filter by label / channel.

**Exception Flows:**
- EF1 Interaction not found → error.
- EF2 Update failure → error notification.
- EF3 TikTok API failure during reply-push → fetch error shown.

---

## 4. Access Control Rules

### Database — RLS summary for Marketing Staff

| Table | Marketing Staff Access |
|---|---|
| `prompts` | CRUD on own rows (`user_id = get_caller_user_id()`) |
| `content_ideas` | Read + update (for UC006 approve/reject on own prompts) |
| `content_queue_schedules` | Full CRUD |
| `content_assets` | Full CRUD on assets linked to own schedules |
| `publish_status_logs` | Read |
| `interaction_messages` | Read + update (status, response) |
| `classify_type_messages` | Read |
| `tiktok_accounts` | Read (needed for posting) |
| `weekly_dashboard_reports` | **NO ACCESS** — RLS blocks (SDS design intent) |
| `users`, `roles` | **NO ACCESS** — admin only |

### Backend — Middleware Stacks

```js
// Content pipeline — marketing_staff only
roleMiddleware(['marketing_staff'])

// UC006 shared with business_owner
roleMiddleware(['marketing_staff', 'business_owner'])

// UC009 publish-status notifications
roleMiddleware(['marketing_staff', 'business_owner'])
```

### Frontend — Navigation

On login, `marketing_staff` redirects to `/calendar` (their daily landing).

**Navbar for Marketing Staff includes:**
- Calendar (`/calendar`) — primary
- Content Prompt (`/content/prompt`)
- Generated Ideas (`/content/ideas`)
- Validate Ideas (`/content/validate`)
- Content Schedule Queue (`/schedule`)
- Media Upload (`/media`)
- Publish Status (`/publish`)
- Interaction Inbox (`/interaction`)
- TikTok Connect (`/tiktok/connect`)
- Profile (`/profile`)
- Logout

**Navbar MUST hide:** Weekly Dashboard, Admin Dashboard.

---

## 5. Test Cases to Honor (STD)

- TC004 Input Prompt Idea
- TC005 Generate Content Idea (happy path + regeneration)
- TC006 Validate Idea (approve → draft appears; reject → no calendar row)
- TC007 Manage Content Schedule Queue (drag-drop, edit, delete, filter daily/weekly/monthly)
- TC008 Upload Content (photo, carousel, short video — 50MB cap)
- TC009 Publish Notification (success + failure paths)
- TC010 Fetch Interaction (comments + DMs)
- TC011_01 Classify DM sales lead / TC011_02 Classify comments sales lead
- TC012_01 View Interaction / TC012_02 Send DM reply / TC012_03 Delete DM

---

## 6. Rules for Claude Code When Implementing Marketing Staff Features

1. **Calendar grid is fixed:** 7 days × time slots 08:00–22:00 WIB. Drag-and-drop rescheduling must respect WIB; convert to UTC for storage.
2. **All timestamps:** store UTC via `jakartaTime.js`; display WIB via `formatDate.js` (dayjs + timezone plugin). Never let raw UTC leak into the UI.
3. **Enum values are frozen** — do not rename:
   - `content_idea_status_enum`: `pending_validation`, `approved`, `rejected`
   - Content type: `poster_photo`, `short_video` (never "photo" / "video")
   - `channel_type_enum`: `comment`, `dm`
   - `interaction_status_enum`: `unclassified`, `classified`
4. **Auto-approve → draft trigger** lives in migration 006 — do not reimplement in the controller. Controller just updates `status = 'approved'`; the DB trigger creates the draft row.
5. **Regenerate (UC005 AF1)** must reuse the same `prompt_id`; do not create a new prompt on regen.
6. **Upload validation** must happen **server-side** (`multer` + MIME sniff + size cap). Never trust client MIME.
7. **Interaction reply must push to TikTok** via Business API; store `response_status = 'sent'` only on confirmed success. Queue + retry on transient failure.
8. **AI classification** is a **Python FastAPI** service — backend forwards unclassified rows to `/analyze`. Do not call OpenAI directly from Node for classification; that violates the architecture (SDS §5.2.2 separates AI service).
9. **Drag-and-drop conflict rule:** if another schedule occupies the target slot within ±15 min, block with EF1 "Invalid Schedule Time."
10. **No `auth.uid()`** in any new RLS policy — always `get_caller_user_id()` and `get_caller_role()` (per migration 001 + `progress.md` lessons learned).
11. **Do not create new frontend frameworks or routing libraries.** Stack is fixed: React 18 + Vite + Tailwind + React Router + Axios + dayjs.
12. **Do not switch backend language.** Node.js + Express.js for main API; Python FastAPI **only** for the AI classifier service. No Flask, no Django, no Next.js API routes.

---

## 7. Cross-References

- SRS §2.1.3 — Marketing Staff characteristics
- SRS §2.3.4 – §2.3.12 — Full user stories US004–US012
- SDS §5.4 — Class definitions (Prompt, ContentIdea, ContentQueueSchedule, ContentAsset, InteractionMessage)
- SDS §5.8 — Sequence diagrams SD004–SD016
- Thesis §4.2 Table 4-2 — UC007 full specification (canonical)
- Thesis Figure 4-3 — UC007 Activity Diagram
- Migrations 004–011 — Schema
- STD §TC004–TC012 — Test cases
- `progress.md` Phase 1–3 — Implementation priority
- `security.md` — RBAC, encryption, input sanitization
- `.claude/rules/backend/implementba*.md` — Backend implementation pattern
- `.claude/rules/frontend/codestyle.md`, `implementfr*.md` — Frontend patterns