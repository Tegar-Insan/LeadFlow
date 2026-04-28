// frontend/src/services/commentsService.ts
// Paired with backend /api/comments/*

import axios from 'axios';
import { getAccessToken } from '../utils/tokenHelper';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ScheduleCommentDetail {
  comment_id: string;
  schedule_id: string;
  comment_text: string;
  author_user_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_photo_url: string | null;
  created_at_wib: string;
  updated_at_wib: string;
}

interface ApiSuccess<T> { success: true; data: T; message?: string; }
interface ApiError   { success: false; message: string; }
type ApiResponse<T>  = ApiSuccess<T> | ApiError;

function unwrap<T>(resp: ApiResponse<T>): T {
  if (!resp.success) throw new Error(resp.message);
  return resp.data;
}

export async function listComments(scheduleId: string): Promise<ScheduleCommentDetail[]> {
  const { data } = await axios.get<ApiResponse<{ comments: ScheduleCommentDetail[] }>>(
    `${BASE}/comments/${scheduleId}`,
    { headers: authHeaders() },
  );
  return unwrap(data).comments;
}

export async function createComment(
  schedule_id: string,
  comment_text: string,
): Promise<{ comment_id: string; created_at: string }> {
  const { data } = await axios.post<ApiResponse<{ comment_id: string; created_at: string }>>(
    `${BASE}/comments`,
    { schedule_id, comment_text },
    { headers: authHeaders() },
  );
  return unwrap(data);
}

export async function deleteComment(id: string): Promise<{ id: string }> {
  const { data } = await axios.delete<ApiResponse<{ id: string }>>(
    `${BASE}/comments/${id}`,
    { headers: authHeaders() },
  );
  return unwrap(data);
}
