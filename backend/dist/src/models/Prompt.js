// src/models/Prompt.ts
// SRS UC004 Input Prompt Idea — business logic moved from promptController.ts direct queries.
import { supabaseAdmin as db } from "../config/supabase.js";
import logger from "../utils/logger.js";
export async function create({ promptText, userId }) {
    const { data, error } = await db
        .from('prompts')
        .insert({ prompt_text: promptText.trim(), user_id: userId })
        .select('id')
        .single();
    if (error || !data) {
        logger.error('[Prompt.create] failed to insert prompt', { error });
        throw new Error('Failed to save prompt');
    }
    return data;
}
export async function findById(promptId, userId) {
    const { data, error } = await db
        .from('prompts')
        .select('*')
        .eq('id', promptId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error || !data)
        return null;
    return data;
}
export async function listByUser(userId) {
    const { data, error } = await db
        .from('prompts')
        .select('id, prompt_text, target_audience, content_theme, ideas_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) {
        logger.error('[Prompt.listByUser]', { error });
        throw new Error('Failed to fetch prompts');
    }
    return data ?? [];
}
//# sourceMappingURL=Prompt.js.map