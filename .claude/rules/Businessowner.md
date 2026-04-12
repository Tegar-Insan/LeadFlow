# Business Owner — Role Rules & Context for LeadFlow

**Source of truth:** SRS §2.1.2, SDS §5.4/§5.8, STD TC013, migration `012_create_weekly_dashboard_report.sql`
**Last updated:** 2026-04-12
**Role key in DB:** `business_owner` (enum `user_role_enum`)

---

## 1. Who the Business Owner Is

The Business Owner is the **wealthiest stakeholder of Krench Chicken** — the person who hired LeadFlow to fix the 5-month sales stagnation. Per SRS §2.1.2:

- **Role:** Decision Maker — oversees marketing performance and strategic outcomes.
- **Position Level:** Managerial. Strategic oversight of marketing activities and business goal alignment.
- **Technical Skill Level:** Basic computer literacy only. **Not** involved in daily content operations. Comfortable reading dashboards and reports, but not uploading media or scheduling posts.
- **Usage cadence:** Weekly or as-needed — **not daily**.
- **Characteristic:** Prefers summary-level information over operational detail. Values visual reporting, clear KPIs (total posts, engagement, response rate), and a reliable low-maintenance system.

**Implication for UI/UX:** Business Owner screens must be read-first, chart-heavy, with large numeric KPI cards. No drag-and-drop. No file uploads. Minimal text input.

---

## 2. Use Cases the Business Owner Participates In

From SRS Table 2.1 and Functional Requirements Table 4-1:

| UC | Name | Business Owner's Role |
|----|------|------------------------|
| UC001 | Register Account | Can self-register (OTP email verification) — SRS Table 2.1 explicitly includes Business Owner alongside Marketing Division |
| UC002 | Authenticate User | Login/logout with OTP and JWT |
| UC006 | Validate AI Content Ideas | **Shared with Marketing Staff** per SRS UC006: *"The system shall allow the Marketing Staff and Business Owner to review and validate AI-generated content ideas."* Approval authority for strategic content oversight. |
| UC009 | Notify Publish Status | **Recipient** of publish-status notifications (success/failure) alongside Marketing Division — SRS Table 2.1 UC009. |
| UC013 | View Weekly Dashboard | **Exclusive** — this is the Business Owner's primary feature. |

**Explicitly NOT permitted for Business Owner:**
- UC004 Input Prompt Idea → Marketing Division only
- UC005 Generate Content Idea → Marketing Division only
- UC007 Manage Content Schedule Queue → Marketing Staff only (SRS: *"shall allow Marketing Staff to manage…"*)
- UC008 Upload Content Feed in Calendar → Marketing Staff only
- UC010 Fetch Data Interaction → Marketing Division operational task
- UC011 Classify Interaction (automatic, but inbox access is Marketing Division)
- UC012 Manage Interaction Message → Marketing Division only
- UC003 Manage Account → **Admin only** (per SRS v3.0 revision)

---

## 3. UC013 View Weekly Dashboard — Canonical Flow

Converted to text from the SRS Activity Diagram (Figure 2.28) and Sequence Diagram (Figure 2.27):

### Preconditions
1. Business Owner is logged in.
2. Dashboard data exists in `weekly_dashboard_reports` (populated by the cron job every Monday 00:00 WIB).

### Postconditions
1. The weekly metrics dashboard is displayed for the selected date range.

### Normal Flow (NF)
1. The Business Owner logs in to LeadFlow.
2. The Business Owner navigates to the **Weekly Dashboard Module** (`/dashboard`).
3. The system retrieves weekly performance data from `weekly_dashboard_reports` via the `v_weekly_dashboard_summary` view.
4. The system displays dashboard metrics in both graphical and numerical form.
5. The Business Owner filters weekly performance metrics by `week_label` — one of: `this_week`, `last_week`, `two_weeks_ago`.

### Alternative Flow
*None defined in SRS.*

### Exception Flow
- **EF1 No Data Available:** If no data exists for the selected week, display an empty-dashboard message.
- **EF2 Invalid Interaction Data:** If retrieval fails, display an error notification.

### Sequence Diagram Text (SD020 — View Weekly Dashboard)
```
BusinessOwner → DashboardPage : open /dashboard
DashboardPage → DashboardController : GET /api/dashboard/weekly?week=this_week
DashboardController → DashboardService : getWeeklyReport(week_label, tiktok_account_id)
DashboardService → WeeklyDashboardReport (Model) : SELECT from v_weekly_dashboard_current WHERE week_label = ?
WeeklyDashboardReport → DashboardService : return aggregated row
DashboardService → DashboardController : return { posts, interactions, follower_growth, consistency_pct, response_rate_pct, leads_count }
DashboardController → DashboardPage : 200 OK (JSON)
DashboardPage → BusinessOwner : render KPI cards + charts
```

### Sequence Diagram Text (SD017 — Filter Week)
```
BusinessOwner → DashboardPage : click filter (last_week)
DashboardPage → DashboardController : GET /api/dashboard/weekly?week=last_week
DashboardController → WeeklyDashboardReport : SELECT row for last_week
WeeklyDashboardReport → DashboardController : return row
DashboardController → DashboardPage : 200 OK
DashboardPage → BusinessOwner : re-render metrics for the selected week
```

### Activity Diagram Text (Figure 2.28)
```
[Start] → Login as Business Owner → Navigate to Weekly Dashboard
       → System fetches weekly_dashboard_reports (current WIB week by default)
       → Decision: data exists?
            NO  → Display empty-state message → [End]
            YES → Render KPI cards + charts
                → Decision: user changes filter?
                       YES → Fetch selected week → Re-render → loop
                       NO  → [End]
```

---

## 4. KPI Metrics the Business Owner Must See

From migration `012_create_weekly_dashboard_report.sql` + view `v_weekly_dashboard_summary`:

| Metric | Column | Meaning |
|---|---|---|
| Posts this week | `this_week_posts` | Count of successfully published posts this WIB week |
| Posts delta | `posts_delta` | This week − last week |
| Interactions this week | `this_week_interactions` | Comments + DMs fetched |
| Last week interactions | `last_week_interactions` | For comparison |
| Follower growth | `this_week_follower_growth` | `follower_count_end - follower_count_start` |
| Posting consistency % | `consistency_pct` | `published / scheduled * 100` — target ≥ 80% for Krench Chicken |
| Response rate % | `response_rate_pct` | `responses_sent / total_interactions * 100` |
| Leads count | `this_week_leads` | Interactions classified as `sales_lead` by AI (UC011) |

**Week boundary:** Monday 00:00 WIB (Asia/Jakarta). All date comparisons MUST use `NOW() AT TIME ZONE 'Asia/Jakarta'`.

---

## 5. Access Control Rules (RLS + Backend + Frontend)

### Database — Row Level Security (migration 012)
```sql
ALTER TABLE weekly_dashboard_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_wdr_owner_read ON weekly_dashboard_reports
    FOR SELECT USING (get_caller_role() = 'business_owner');

CREATE POLICY rls_wdr_admin_all ON weekly_dashboard_reports
    FOR ALL USING (get_caller_role() = 'admin');

-- Marketing Staff: NO policy → blocked by RLS (SDS design intent).
```

Additional RLS policies affecting Business Owner:
- `prompts` → **NO access** (content creation is staff-only)
- `content_ideas` → read-only access for UC006 validation (must be added in migration if not present)
- `interaction_messages` → **NO access**
- `content_queue_schedules` → **NO access** (cannot edit calendar)

### Backend — Middleware Enforcement
Every protected route must stack:
```js
router.get('/api/dashboard/weekly',
  authMiddleware,                         // JWT valid
  roleMiddleware(['business_owner']),     // role gate
  dashboardController.getWeekly
);
```

For UC006 shared with Marketing Staff:
```js
roleMiddleware(['marketing_staff', 'business_owner'])
```

For UC009 notifications (both roles receive):
```js
roleMiddleware(['marketing_staff', 'business_owner'])
```

### Frontend — Route Guard
`ProtectedRoute` in `appRoutes.jsx` must gate `/dashboard` to `business_owner` only. On login, a `business_owner` is auto-redirected to `/dashboard` (not `/calendar`).

**Navbar for Business Owner must show only:**
- Dashboard (`/dashboard`)
- Validate Content Ideas (`/content/validate`) — shared with Marketing Staff
- Profile (`/profile`)
- Logout

**Navbar MUST hide:** Calendar, Content Schedule Queue, Prompt Input, Generated Ideas, Media Upload, Interaction Inbox, Publish Status, Admin Dashboard, TikTok Connect.

---

## 6. Test Cases to Honor (STD)

- **TC013_01 View Performance Metric** — login as BO, open dashboard, verify KPIs render.
- **TC013_02 Filter Performance** — switch filter to `last_week` / `two_weeks_ago`, verify re-render with correct numbers.

Cron job trigger must also be covered by backend test: `autoPublishJob` Monday 00:00 WIB aggregation writes one row per TikTok account per week.

---

## 7. Rules for Claude Code When Implementing Business Owner Features

1. **Never** add write capability to Business Owner for content, calendar, or interaction tables. UC013 is read-only. UC006 is the **only** write path (approve/reject ideas).
2. **Always** filter dashboard data by the Business Owner's accessible `tiktok_account_id(s)` — currently one (Krench Chicken), but code for N.
3. **All displayed times must be WIB.** Use `formatDate.js` (dayjs + timezone plugin) on the frontend. Backend stores UTC; the view `v_weekly_dashboard_current` already converts.
4. **No drag-and-drop, no file upload, no inline rich-text composer** on Business Owner pages.
5. **Notifications (UC009):** Push publish-status events to Business Owner via the same notification channel as Marketing Staff, but surface only summary counters ("3 posts published this week, 1 failed") — not per-post detail.
6. **UC006 validation UI for Business Owner** must look identical to Marketing Staff's view; the role check lives in the backend route, not in duplicated components.
7. **Empty state first.** Fresh BO accounts with no data should see a friendly "No data yet — dashboard populates every Monday 00:00 WIB" rather than broken charts.
8. **Do not** introduce new frameworks. Stick to React 18 + Vite + Tailwind on the frontend; Express.js + Supabase on the backend. No charting library outside what is already in `package.json` — confirm before adding Recharts, Chart.js, etc.

---

## 8. Cross-References

- SRS §2.1.2 — Business Owner characteristics
- SRS §2.3.13 — US013 View Weekly Dashboard full user story
- SDS §5.4 — `WeeklyDashboardReport` class definition
- SDS §5.8 SD017, SD020 — Sequence diagrams
- Migration 012 — Table, views, RLS
- STD §TC013 — Test cases
- `progress.md` Phase 4 — Dashboard + Admin implementation priority
- `security.md` — RBAC enforcement details
- `.claude/rules/backend/implementba*.md` — Backend implementation pattern