import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '../tokenStorage';
import { createPostsApi, createScheduleApi, statsApi } from './collections';

const claims = btoa(JSON.stringify({ sub: 'u1', name: 'Noah Reyes', exp: 9999999999 }));
const token = `e30.${claims}.sig`;

function ok(data) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data }) });
}

describe('live collections', () => {
  beforeEach(() => {
    tokenStorage.save({ accessToken: token, refreshToken: 'http-only-cookie' }, { persistent: false });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('lists published posts from the paged endpoint', async () => {
    fetch.mockReturnValueOnce(ok({ items: [{ id: 'p1', authorName: 'Ava' }] }));

    const posts = await createPostsApi().fetchAll();

    expect(fetch.mock.calls[0][0]).toBe('/api/v1/posts?status=PUBLISHED&size=100');
    expect(posts).toEqual([{ id: 'p1', authorName: 'Ava', authorId: 'Ava' }]);
  });

  it('publishes as the signed-in user, never as a name the caller supplies', async () => {
    fetch.mockReturnValueOnce(ok({ id: 'p2', authorName: 'Noah Reyes' }));

    await createPostsApi().create({ content: 'hi', platformId: 'x', authorName: 'Someone Else' });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ authorName: 'Noah Reyes', status: 'PUBLISHED', content: 'hi' });
  });

  it('schedules, reschedules and unschedules through /schedule', async () => {
    const api = createScheduleApi();
    fetch.mockReturnValue(ok({ id: 's1', scheduledFor: '2030-01-01T10:00:00Z' }));

    await api.create({ content: 'c', platformId: 'x', scheduledFor: '2030-01-01T10:00:00Z' });
    await api.update('s1', { scheduledFor: '2030-01-02T10:00:00Z' });
    await expect(api.remove('s1')).resolves.toBe('s1');

    expect(fetch.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      'POST /api/v1/schedule',
      'PATCH /api/v1/schedule/s1',
      'DELETE /api/v1/schedule/s1',
    ]);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ scheduledFor: '2030-01-02T10:00:00Z' });
  });

  it('fetches analytics', async () => {
    fetch.mockReturnValueOnce(ok({ byPlatformAndStatus: [], topAuthors: [], topPosts: [] }));

    await expect(statsApi.overview()).resolves.toHaveProperty('topAuthors');
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/stats?topAuthors=5&topPosts=5');
  });
});
