// src/models/ChatbotSession.ts
// Long-term memory for the AI chat assistant (chatbotController.ts / Anthropic Claude).
// One continuous global thread per user — resumed by the floating AIChatbot FAB,
// /content/prompt, and /content/validate (all share the same session).
// SRS Ref: UC Chatbot (AI Assistant)

import { supabaseAdmin as db } from '../config/supabase.ts';
import logger from '../utils/logger.ts';

export type ChatRole = 'user' | 'assistant';
export type ChatMessageType = 'text' | 'schedule_recommendation';

export interface ChatbotMessageRow {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  message_type: ChatMessageType;
  schedules: Record<string, unknown>[] | null;
  ai_model_used: string | null;
  created_at: string;
}

export interface ChatbotSessionRow {
  id: string;
  user_id: string;
  title: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

const RECENT_MESSAGES_LIMIT = 20;

// ---------------------------------------------------------------------------
// Resume semantics: the caller's single most-recently-active session, or a
// freshly created one if they have never chatted before.
// ---------------------------------------------------------------------------
export async function getOrCreateActiveSession(userId: string): Promise<ChatbotSessionRow> {
  const { data: existing, error: findErr } = await db
    .from('chatbot_sessions')
    .select('id, user_id, title, last_message_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    logger.error('[ChatbotSession.getOrCreateActiveSession] lookup failed', { findErr, userId });
    throw new Error('Failed to resolve chatbot session');
  }
  if (existing) return existing as ChatbotSessionRow;

  const { data: created, error: createErr } = await db
    .from('chatbot_sessions')
    .insert({ user_id: userId })
    .select('id, user_id, title, last_message_at, created_at, updated_at')
    .single();

  if (createErr || !created) {
    logger.error('[ChatbotSession.getOrCreateActiveSession] create failed', { createErr, userId });
    throw new Error('Failed to create chatbot session');
  }
  return created as ChatbotSessionRow;
}

// ---------------------------------------------------------------------------
// Sliding context window — most recent N messages, oldest first (ready to
// feed straight into chatWithAnthropic's messages array).
// ---------------------------------------------------------------------------
export async function getRecentMessages(
  sessionId: string,
  limit: number = RECENT_MESSAGES_LIMIT,
): Promise<ChatbotMessageRow[]> {
  const { data, error } = await db
    .from('chatbot_messages')
    .select('id, session_id, role, content, message_type, schedules, ai_model_used, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('[ChatbotSession.getRecentMessages] failed', { error, sessionId });
    throw new Error('Failed to fetch chat history');
  }

  return ((data ?? []) as ChatbotMessageRow[]).reverse();
}

export async function appendMessage(params: {
  sessionId: string;
  role: ChatRole;
  content: string;
  messageType?: ChatMessageType;
  schedules?: Record<string, unknown>[] | null;
  aiModelUsed?: string | null;
}): Promise<ChatbotMessageRow> {
  const { sessionId, role, content, messageType = 'text', schedules = null, aiModelUsed = null } = params;

  const { data, error } = await db
    .from('chatbot_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      message_type: messageType,
      schedules,
      ai_model_used: aiModelUsed,
    })
    .select('id, session_id, role, content, message_type, schedules, ai_model_used, created_at')
    .single();

  if (error || !data) {
    logger.error('[ChatbotSession.appendMessage] failed', { error, sessionId, role });
    throw new Error('Failed to save chat message');
  }
  return data as ChatbotMessageRow;
}

export async function listSessionsForUser(userId: string): Promise<ChatbotSessionRow[]> {
  const { data, error } = await db
    .from('chatbot_sessions')
    .select('id, user_id, title, last_message_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) {
    logger.error('[ChatbotSession.listSessionsForUser] failed', { error, userId });
    throw new Error('Failed to fetch chat sessions');
  }
  return (data ?? []) as ChatbotSessionRow[];
}

// ---------------------------------------------------------------------------
// Ownership-checked lookup. The backend uses the Supabase service role key
// (bypasses RLS), so cross-user access must be blocked here in app logic —
// the table's RLS policies are defense-in-depth only, not the active gate.
// ---------------------------------------------------------------------------
export async function getOwnedSession(sessionId: string, userId: string): Promise<ChatbotSessionRow> {
  const { data, error } = await db
    .from('chatbot_sessions')
    .select('id, user_id, title, last_message_at, created_at, updated_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('[ChatbotSession.getOwnedSession] lookup failed', { error, sessionId, userId });
    throw new Error('Failed to fetch chat session');
  }
  if (!data) {
    const e: any = new Error('Session not found');
    e.statusCode = 404;
    throw e;
  }
  return data as ChatbotSessionRow;
}

// ---------------------------------------------------------------------------
// Full message history for one session — ownership enforced by filtering on
// the caller's userId via the parent session, not just the sessionId.
// ---------------------------------------------------------------------------
export async function getSessionMessages(sessionId: string, userId: string): Promise<ChatbotMessageRow[]> {
  await getOwnedSession(sessionId, userId);

  const { data, error } = await db
    .from('chatbot_messages')
    .select('id, session_id, role, content, message_type, schedules, ai_model_used, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('[ChatbotSession.getSessionMessages] messages fetch failed', { error, sessionId });
    throw new Error('Failed to fetch chat messages');
  }
  return (data ?? []) as ChatbotMessageRow[];
}
