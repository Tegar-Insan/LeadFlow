# Frontend Implementation — LeadFlow
Stack: React 18 + Vite + Tailwind CSS. Port 5173.

## Folder
`frontend/src/{assets,components,pages,hooks,context,services,utils,routes}`
- `components/{common,auth,content,schedule,media,interaction,publish,dashboard}`
- `pages/{auth,profile,content,schedule,media,publish,interaction,dashboard,tiktok}`
- `services/` = API call layer (authService, contentService, scheduleService, mediaService, interactionService, publishService, dashboardService, tiktokService)
- `hooks/` = useAuth, useContentIdeas, useSchedule, useInteraction, usePublishStatus, useDashboard
- `utils/` = formatDate, tokenHelper, roleGuard, constants
- `routes/AppRoutes.jsx` wraps protected paths in `<ProtectedRoute>` + role guard

## Required Pages & Behavior
- Auth flow: register form → OTP verification screen → login → JWT stored in localStorage. Toast on duplicate email/phone.
- Profile page showing email, role, phone
- Prompt input page → generated ideas list → idea validation panel (approve / reject buttons)
- Calendar page with weekly time-slot grid 08:00–22:00, day/week/month toggle, drag-drop slots
- Content schedule queue page (dark sidebar Content Library with draggable cards, light main area pink accents)
- Media upload page enforcing PNG/JPG/MP4/MOV and ≤50MB client-side before POST
- Publish status page reading from publish logs
- Interaction inbox page: list, reply box, delete
- Weekly dashboard page restricted to Business Owner role only
- TikTok connect page handles OAuth redirect

## Discipline
- Token read: `localStorage.getItem('token')` — case-sensitive, common bug source
- Mock services via `VITE_DEBUG_AUTH=true` for backendless dev
- Never call backend directly from components — always through `services/`