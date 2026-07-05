/**
 * Supabase's PostgrestError (and similar SDK errors) are plain objects, not
 * Error instances — `err instanceof Error ? err.message : String(err)`
 * silently degrades those to "[object Object]". This pulls a real message
 * out of the common { message, code, details, hint } shape before falling
 * back to JSON.stringify.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj['message'] === 'string' && obj['message']) {
      const parts = [obj['message']];
      if (typeof obj['code'] === 'string' && obj['code']) parts.push(`(code: ${obj['code']})`);
      if (typeof obj['details'] === 'string' && obj['details']) parts.push(`- ${obj['details']}`);
      if (typeof obj['hint'] === 'string' && obj['hint']) parts.push(`(hint: ${obj['hint']})`);
      return parts.join(' ');
    }
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }

  return String(err);
}
