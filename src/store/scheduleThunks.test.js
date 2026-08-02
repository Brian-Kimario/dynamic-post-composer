import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The service layer is replaced here rather than the store.
 *
 * The course brief reaches for MSW at this point, and MSW is the right tool when
 * there is a network boundary to intercept. This app has none — its "API" is
 * `services/localCollection.js` over `localStorage`, so there is no HTTP for a
 * service worker to catch. The equivalent seam is the service module itself, and
 * mocking it here gives what MSW would: control over what the "server" returns,
 * including failures that are awkward to produce for real.
 *
 * Everything below the mock — thunk lifecycle, reducers, optimistic update — is
 * the real implementation.
 */
vi.mock('../services/scheduleApi', () => ({
  scheduleApi: {
    fetchAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const { scheduleApi } = await import('../services/scheduleApi');
const { configureStore } = await import('@reduxjs/toolkit');
const scheduleReducer = (await import('./scheduleSlice')).default;
const { fetchScheduledPosts, schedulePost, reschedulePost, unschedulePost } =
  await import('./scheduleSlice');
const { makeScheduledPost } = await import('../test/renderWithStore');

const post = makeScheduledPost({ id: 'evt_1', localTime: '2026-08-05T09:00' });

function makeStore() {
  return configureStore({ reducer: { schedule: scheduleReducer } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchScheduledPosts', () => {
  it('loads the schedule and reports ready', async () => {
    scheduleApi.fetchAll.mockResolvedValue([post]);
    const store = makeStore();

    await store.dispatch(fetchScheduledPosts());

    const state = store.getState().schedule;
    expect(state.status).toBe('ready');
    expect(state.ids).toEqual([post.id]);
  });

  it('surfaces a failure as a blocking error the page can retry from', async () => {
    scheduleApi.fetchAll.mockRejectedValue(new Error('Browser storage is unavailable.'));
    const store = makeStore();

    await store.dispatch(fetchScheduledPosts());

    const state = store.getState().schedule;
    expect(state.status).toBe('error');
    expect(state.error).toMatch(/storage is unavailable/i);
  });
});

describe('schedulePost', () => {
  it('adds the new event and clears the saving flag', async () => {
    scheduleApi.create.mockResolvedValue(post);
    const store = makeStore();

    await store.dispatch(
      schedulePost({ content: post.content, platformId: 'x', scheduledFor: post.scheduledFor }),
    );

    expect(store.getState().schedule.ids).toEqual([post.id]);
    expect(store.getState().schedule.isSaving).toBe(false);
  });

  it('records a refusal without adding anything', async () => {
    const forbidden = new Error('Your role (viewer) does not have permission.');
    forbidden.name = 'ForbiddenError';
    scheduleApi.create.mockRejectedValue(forbidden);
    const store = makeStore();

    await store.dispatch(
      schedulePost({ content: 'x', platformId: 'x', scheduledFor: post.scheduledFor }),
    );

    expect(store.getState().schedule.ids).toHaveLength(0);
    expect(store.getState().schedule.actionError).toMatch(/permission/);
    expect(store.getState().schedule.isSaving).toBe(false);
  });
});

describe('reschedulePost end to end', () => {
  const movedTo = new Date('2026-08-12T09:00').toISOString();

  it('shows the move immediately and keeps it when the write succeeds', async () => {
    scheduleApi.fetchAll.mockResolvedValue([post]);
    scheduleApi.update.mockResolvedValue({ ...post, scheduledFor: movedTo });

    const store = makeStore();
    await store.dispatch(fetchScheduledPosts());

    const inFlight = store.dispatch(reschedulePost({ id: post.id, scheduledFor: movedTo }));
    // Optimistic: the new time is visible before the request resolves.
    expect(store.getState().schedule.entities[post.id].scheduledFor).toBe(movedTo);

    await inFlight;
    expect(store.getState().schedule.entities[post.id].scheduledFor).toBe(movedTo);
    expect(scheduleApi.update).toHaveBeenCalledWith(post.id, { scheduledFor: movedTo });
  });

  it('rolls back to the original instant when the write is refused', async () => {
    scheduleApi.fetchAll.mockResolvedValue([post]);
    const forbidden = new Error('Your role (viewer) does not have permission.');
    forbidden.name = 'ForbiddenError';
    scheduleApi.update.mockRejectedValue(forbidden);

    const store = makeStore();
    await store.dispatch(fetchScheduledPosts());

    await store.dispatch(reschedulePost({ id: post.id, scheduledFor: movedTo }));

    expect(store.getState().schedule.entities[post.id].scheduledFor).toBe(post.scheduledFor);
    expect(store.getState().schedule.actionError).toMatch(/permission/);
  });
});

describe('unschedulePost', () => {
  it('removes the event once the service confirms', async () => {
    scheduleApi.fetchAll.mockResolvedValue([post]);
    scheduleApi.remove.mockResolvedValue(post.id);

    const store = makeStore();
    await store.dispatch(fetchScheduledPosts());
    await store.dispatch(unschedulePost(post.id));

    expect(store.getState().schedule.ids).toHaveLength(0);
  });

  it('leaves the event in place when removal fails', async () => {
    scheduleApi.fetchAll.mockResolvedValue([post]);
    scheduleApi.remove.mockRejectedValue(new Error('That record no longer exists.'));

    const store = makeStore();
    await store.dispatch(fetchScheduledPosts());
    await store.dispatch(unschedulePost(post.id));

    expect(store.getState().schedule.ids).toEqual([post.id]);
    expect(store.getState().schedule.actionError).toMatch(/no longer exists/);
  });
});
