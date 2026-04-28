// frontend/src/pages/content/_session9_background_patch.md
//
// PATCH GUIDE — APPLY MANUALLY TO EACH PAGE FILE
// Session 9 — stakeholder rule #2: ONLY background className changes.
// Do NOT add/remove/rename any component, hook, prop, import, or child.
//
// For each of the six files listed in section 8 of the plan, do this:
//
// 1. Add at the top of the file:
//      import { LEADFLOW_BG } from '../../utils/contentModuleTheme.ts';
//    (adjust relative path if your page is nested differently)
//
// 2. Find the outermost wrapper div of the page's JSX return, e.g.:
//      <div className="min-h-screen bg-[#1a1a1a]">
//    or:
//      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black">
//
// 3. Replace ONLY its className with:
//      <div className={LEADFLOW_BG}>
//
// That's it. No other change in the file.
//
// Files to patch:
//   frontend/src/pages/content/PromptPage.tsx
//   frontend/src/pages/content/GeneratedIdeasPage.tsx          (Step 9 rewrites this anyway)
//   frontend/src/pages/content/IdeaValidationPage.tsx
//   frontend/src/pages/schedule/CalendarPage.tsx
//   frontend/src/pages/schedule/ContentScheduleQueuePage.tsx
//   frontend/src/pages/media/MediaUploadPage.tsx
//
// Auth pages (LoginPage, RegisterPage, OTPPage) DO NOT use LEADFLOW_BG — they
// keep their dark charcoal/red theme per user memories.
