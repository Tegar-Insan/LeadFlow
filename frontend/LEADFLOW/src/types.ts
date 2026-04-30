// ─────────────────────────────────────────────
// types.ts
// Shared TypeScript types for the Login page
// ─────────────────────────────────────────────

import type { ReactNode } from "react";

export interface FeatureItem {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface Dot {
  ox: number;
  oy: number;
  x: number;
  y: number;
  phase: number;
}

export interface LoginFormState {
  email: string;
  password: string;
  showPassword: boolean;
}
