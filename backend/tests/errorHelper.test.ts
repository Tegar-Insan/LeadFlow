// backend/tests/errorHelper.test.ts
// getErrorMessage must pull a real message out of non-Error throwables
// (e.g. Supabase's PostgrestError, a plain { message, code, details, hint }
// object) instead of degrading to "[object Object]" — the bug that hid the
// real cause of an [autoPublishJob] failure.

import { getErrorMessage } from '../src/utils/errorHelper.ts';

describe('getErrorMessage', () => {
  it('returns the message from a real Error instance', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('formats a Supabase-style PostgrestError object', () => {
    const pgError = {
      message: 'column "status" does not exist',
      code: '42703',
      details: 'Perhaps you meant to reference the column "content_status".',
      hint: null,
    };
    expect(getErrorMessage(pgError)).toBe(
      'column "status" does not exist (code: 42703) - Perhaps you meant to reference the column "content_status".',
    );
  });

  it('falls back to JSON.stringify for a plain object with no message field', () => {
    expect(getErrorMessage({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });

  it('stringifies primitives directly', () => {
    expect(getErrorMessage('plain string reason')).toBe('plain string reason');
    expect(getErrorMessage(42)).toBe('42');
  });

  it('never returns the useless "[object Object]" for a plain object', () => {
    expect(getErrorMessage({ message: 'real reason' })).not.toBe('[object Object]');
    expect(getErrorMessage({})).not.toBe('[object Object]');
  });
});
