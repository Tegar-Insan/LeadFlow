// frontend/src/services/contentService.ts
// Session 9 — paired with backend /api/content/* endpoints.
// Reminder from progress.md: VITE_API_BASE_URL already includes /api — do NOT prefix again.

import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Shared types — must match backend contentIdeaService
// ---------------------------------------------------------------------------
export interface GeneratedScheduleDraft {
  id: string;
  prompt_id: string;
  content_title: string;
  tiktok_caption: string;
  hashtag: string[];
  suggested_music: string;
  estimated_duration: number;
  estimated_engagement: 'low' | 'medium' | 'high';
  best_time_to_post_wib: string;
  category:
    | 'BEHIND-THE-SCENES'
    | 'MENU-SHOWCASE'
    | 'PROMOTION'
    | 'TESTIMONIAL'
    | 'TRENDING';
  status: 'pending_validation';
  ai_model_used: string;
  generated_image_url: string | null;
}

export interface GenerationStep {
  stepNumber: number;
  title: string;
  status: 'completed';
  details: string;
  timestamp: string;
}

export interface GenerationWithSteps {
  steps: GenerationStep[];
  drafts: GeneratedScheduleDraft[];
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}
interface ApiError {
  success: false;
  error: string;
}
type ApiResponse<T> = ApiSuccess<T> | ApiError;

function unwrap<T>(resp: ApiResponse<T>): T {
  if (!resp.success) throw new Error((resp as ApiError).error);
  return (resp as ApiSuccess<T>).data;
}

// ---------------------------------------------------------------------------
// POST /content/generate
// ---------------------------------------------------------------------------
export async function generateDrafts(brief: string): Promise<GeneratedScheduleDraft[]> {
  const { data } = await axios.post<ApiResponse<{ drafts: GeneratedScheduleDraft[] }>>(
    `${BASE}/content/generate`,
    { brief },
    { headers: authHeaders() },
  );
  return unwrap(data).drafts;
}

// ---------------------------------------------------------------------------
// POST /content/:id/approve
// ---------------------------------------------------------------------------
export interface ApproveIdeaResult {
  idea_id: string;
  schedule_id: string | null;
  schedule_status: string | null;
  content_title: string | null;
  tiktok_caption: string | null;
  hashtag: string[];
  category: string | null;
  estimated_engagement: 'low' | 'medium' | 'high' | null;
  suggested_music: string | null;
  estimated_duration: number | null;
  best_time_to_post_wib: string | null;
}

export async function approveIdea(ideaId: string): Promise<ApproveIdeaResult> {
  const { data } = await axios.post<ApiResponse<ApproveIdeaResult>>(
    `${BASE}/content/${ideaId}/approve`,
    {},
    { headers: authHeaders() },
  );
  return unwrap(data);
}

// ---------------------------------------------------------------------------
// POST /content/:id/reject
// ---------------------------------------------------------------------------
export async function rejectIdea(
  ideaId: string,
  rejected_reason: string | null,
): Promise<{ idea_id: string }> {
  const { data } = await axios.post<ApiResponse<{ idea_id: string }>>(
    `${BASE}/content/${ideaId}/reject`,
    { rejected_reason },
    { headers: authHeaders() },
  );
  return unwrap(data);
}

// ---------------------------------------------------------------------------
// GET /content/pending — for the IdeaValidationPage (historic list)
// ---------------------------------------------------------------------------
export async function listPendingIdeas(): Promise<GeneratedScheduleDraft[]> {
  const { data } = await axios.get<ApiResponse<{ ideas: GeneratedScheduleDraft[] }>>(
    `${BASE}/content/pending`,
    { headers: authHeaders() },
  );
  return unwrap(data).ideas;
}
