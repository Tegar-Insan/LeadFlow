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
- Calendar page with weekly time-slot grid 08:00–22:00, day/week/month toggle, drag-drop slots, floating AI Chatbot FAB (`<AIChatbot />` from `components/common/AIChatbot.jsx`)
- Content schedule queue page (dark sidebar Content Library with draggable cards, light main area pink accents)
- Media upload page enforcing PNG/JPG/MP4/MOV and ≤50MB client-side before POST
- Publish status page reading from publish logs
- Interaction inbox page: list, reply box, delete
- Weekly dashboard page restricted to Business Owner role only
- TikTok connect page handles OAuth redirect

## AI Chatbot Component
- **FAB:** Fixed bottom-right (`bottom-6 right-6`), `w-14 h-14` yellow circle (`bg-brand text-black`), AI sparkle SVG icon, gold glow shadow, closes with ×
- **Panel:** `w-[360px] max-h-[520px]` glassmorphism — `bg-[#111111]/95 backdrop-blur-2xl border border-white/[0.08]` — slides up on open
- **Messages:** User bubbles right (`bg-brand text-black`), AI bubbles left (`bg-white/[0.06] border border-white/[0.08]`)
- **Input:** Auto-resize `textarea` (max 100px), `Enter` to send, `Shift+Enter` for newline
- **Suggestions:** 4 quick-prompt chips shown on fresh open (before first user message)
- **Backend:** `POST /api/chatbot/message` — auth-protected; sends last 10 messages as `[{role,content}]` array; uses `chatbotService.js`
- **Context DB:** 9 keyword-mapped chunks in `chatbotController.js` — loaded dynamically per regex match on user messages

## Discipline
- Token read: `localStorage.getItem('token')` — case-sensitive, common bug source
- Mock services via `VITE_DEBUG_AUTH=true` for backendless dev
- Never call backend directly from components — always through `services/`