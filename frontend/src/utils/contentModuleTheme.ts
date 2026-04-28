// frontend/src/utils/contentModuleTheme.ts
// Session 9 — stakeholder rule #2: only backgrounds change, no component structure.
// Every Content/Schedule/Media page imports LEADFLOW_BG from here instead of
// hard-coding classNames. Centralised so we do NOT touch component internals.

export const LEADFLOW_BG =
  'min-h-screen bg-gradient-to-b from-white via-pink-50 to-white';

// Auth-adjacent pages keep their own charcoal/red theme — do not use LEADFLOW_BG there.
export const LEADFLOW_CARD =
  'bg-white/80 backdrop-blur-sm border border-pink-100 shadow-sm rounded-2xl';

export const LEADFLOW_HEADER_GRADIENT =
  'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white';
