// backend/tests/mediaController.draftUpload.test.ts
// Covers the media-upload-orphans-draft bug: uploading media to a schedule
// with no scheduled_at must NOT flip its status away from 'draft', or the
// row disappears from both getDraftSchedules (status='draft' only) and
// getSchedulesByMonth (requires a non-null scheduled_at in range).

import express from 'express';
import request from 'supertest';

jest.mock('../src/config/supabase.ts', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.test/file.jpg' } }),
      }),
    },
  },
}));

jest.mock('../src/services/tiktokOAuthService.ts', () => ({
  getConnectedAccountForUser: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/models/ContentAsset.ts', () => ({
  createAsset: jest.fn().mockResolvedValue({ id: 'asset-1', file_url: 'https://example.test/file.jpg' }),
}));

const getScheduleById = jest.fn();
const updateSchedule = jest.fn().mockResolvedValue({});

jest.mock('../src/models/ContentQueueSchedule.ts', () => ({
  getScheduleById: (...args: unknown[]) => getScheduleById(...args),
  updateSchedule: (...args: unknown[]) => updateSchedule(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadMedia } = require('../src/controllers/mediaController.ts');

const buildApp = () => {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).user = { userId: 'user-1' };
    (req as any).files = [{
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake'),
      size: 4,
    }];
    next();
  });
  app.post('/api/media/upload/:scheduleId', uploadMedia);
  return app;
};

describe('uploadMedia — draft status preservation', () => {
  beforeEach(() => {
    getScheduleById.mockReset();
    updateSchedule.mockClear();
  });

  it('does NOT advance status to uploaded when the schedule has no scheduled_at (pure draft)', async () => {
    getScheduleById.mockResolvedValue({ id: 'sched-1', status: 'draft', scheduled_at: null });

    const res = await request(buildApp()).post('/api/media/upload/sched-1');

    expect(res.status).toBe(201);
    expect(updateSchedule).not.toHaveBeenCalled();
    expect(res.body.data.status).toBe('draft');
  });

  it('advances status to uploaded when the schedule already has a scheduled_at', async () => {
    getScheduleById.mockResolvedValue({ id: 'sched-2', status: 'scheduled', scheduled_at: '2026-07-10T03:00:00.000Z' });

    const res = await request(buildApp()).post('/api/media/upload/sched-2');

    expect(res.status).toBe(201);
    expect(updateSchedule).toHaveBeenCalledWith('sched-2', { status: 'uploaded' });
    expect(res.body.data.status).toBe('uploaded');
  });
});
