// backend/tests/rateLimiter.agentRunStatus.test.ts
// Covers the agent-run-status 429 storm fix: apiLimiter must skip
// /agent/runs/:id (a legitimate polling target) while agentRunStatusLimiter
// independently bounds that same path with its own, tighter window.
//
// Each test re-requires the middleware module after jest.resetModules() so
// every limiter starts with a clean in-memory counter — these singletons
// would otherwise leak request counts across test cases in this file.

import express from 'express';
import request from 'supertest';

describe('apiLimiter', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('skips /agent/runs/:id entirely, even past its own 100-req ceiling', async () => {
    const { apiLimiter } = require('../src/middleware/rateLimiter.ts');
    const app = express();
    app.use('/api', apiLimiter);
    app.get('/api/agent/runs/:id', (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 105; i++) {
      const res = await request(app).get('/api/agent/runs/abc-123');
      expect(res.status).toBe(200);
    }
  });

  it('still enforces its 100-req/15min ceiling on an unrelated /api path', async () => {
    const { apiLimiter } = require('../src/middleware/rateLimiter.ts');
    const app = express();
    app.use('/api', apiLimiter);
    app.get('/api/other', (_req, res) => res.json({ ok: true }));

    let sawRateLimited = false;
    for (let i = 0; i < 105; i++) {
      const res = await request(app).get('/api/other');
      if (res.status === 429) {
        sawRateLimited = true;
        expect(res.body.message).toMatch(/API rate limit exceeded/);
        break;
      }
    }
    expect(sawRateLimited).toBe(true);
  });
});

describe('agentRunStatusLimiter', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('throttles a single client after 60 requests within its 60s window', async () => {
    const { agentRunStatusLimiter } = require('../src/middleware/rateLimiter.ts');
    const app = express();
    app.get('/api/agent/runs/:id', agentRunStatusLimiter, (_req, res) => res.json({ ok: true }));

    let rateLimitedResponse: request.Response | null = null;
    for (let i = 0; i < 65; i++) {
      const res = await request(app).get('/api/agent/runs/abc-123');
      if (res.status === 429) {
        rateLimitedResponse = res;
        break;
      }
    }

    expect(rateLimitedResponse).not.toBeNull();
    expect(rateLimitedResponse?.body.message).toMatch(/Agent run status rate limit exceeded/);
    expect(rateLimitedResponse?.body.retryAfterMs).toBe(60_000);
  });
});
