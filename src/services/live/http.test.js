import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '../tokenStorage';
import { ApiError, ForbiddenError, UnauthorizedError, request } from './http';

const envelope = (data, extra = {}) => ({ success: true, message: 'ok', data, ...extra });

function respond(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body)),
  });
}

describe('live http client', () => {
  beforeEach(() => {
    tokenStorage.clear();
    tokenStorage.save({ accessToken: 'old', refreshToken: 'http-only-cookie' }, { persistent: false });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('unwraps the envelope, sends the bearer token and builds the query string', async () => {
    fetch.mockReturnValueOnce(respond(200, envelope({ items: [1] })));

    const data = await request({ path: '/api/v1/posts', query: { status: 'PUBLISHED', size: 5, x: '' } });

    expect(data).toEqual({ items: [1] });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/v1/posts?status=PUBLISHED&size=5');
    expect(init.headers.Authorization).toBe('Bearer old');
    expect(init.credentials).toBe('include');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    fetch
      .mockReturnValueOnce(respond(401, { message: 'expired' }))
      .mockReturnValueOnce(respond(200, envelope({ accessToken: 'new' })))
      .mockReturnValueOnce(respond(200, envelope('done')));

    await expect(request({ path: '/api/v1/posts' })).resolves.toBe('done');

    expect(fetch.mock.calls[1][0]).toBe('/api/v1/auth/refresh');
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer new');
    expect(tokenStorage.read()).toBe('new');
  });

  it('shares one refresh between parallel 401s', async () => {
    fetch.mockImplementation((url) => {
      if (url === '/api/v1/auth/refresh') return respond(200, envelope({ accessToken: 'new' }));
      return fetch.mock.calls.filter(([u]) => u === url).length <= 1
        ? respond(401, { message: 'expired' })
        : respond(200, envelope('ok'));
    });

    await Promise.all([request({ path: '/a' }), request({ path: '/b' })]);

    expect(fetch.mock.calls.filter(([u]) => u === '/api/v1/auth/refresh')).toHaveLength(1);
  });

  it('ends the session when the refresh itself is rejected', async () => {
    fetch
      .mockReturnValueOnce(respond(401, { message: 'expired' }))
      .mockReturnValueOnce(respond(401, { message: 'refresh revoked' }));

    await expect(request({ path: '/api/v1/posts' })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(tokenStorage.read()).toBeNull();
  });

  it('maps 403 to ForbiddenError without touching the session', async () => {
    fetch.mockReturnValueOnce(respond(403, { message: 'Access denied' }));

    await expect(request({ path: '/api/v1/stats' })).rejects.toBeInstanceOf(ForbiddenError);
    expect(tokenStorage.read()).toBe('old');
  });

  it('surfaces validation field errors and the correlation id', async () => {
    fetch.mockReturnValueOnce(
      respond(400, {
        message: 'Validation failed',
        correlationId: 'abc-123',
        data: { content: 'Content is required' },
      }),
    );

    const error = await request({ method: 'POST', path: '/api/v1/posts', body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('Validation failed: Content is required');
    expect(error.fieldErrors).toEqual({ content: 'Content is required' });
    expect(error.correlationId).toBe('abc-123');
  });

  it('reports a business-rule 422 with the server message', async () => {
    fetch.mockReturnValueOnce(respond(422, { message: 'Scheduled posts need a future time' }));

    await expect(request({ path: '/x' })).rejects.toMatchObject({
      status: 422,
      message: 'Scheduled posts need a future time',
    });
  });

  it('turns a network failure into a readable error', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(request({ path: '/x' })).rejects.toThrow(/Cannot reach the server/);
  });

  it('copes with a non-JSON error body from a gateway', async () => {
    fetch.mockReturnValueOnce(respond(502, undefined));

    await expect(request({ path: '/x' })).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502).',
    });
  });
});
