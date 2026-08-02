import { describe, expect, it } from 'vitest';
import reducer, { reschedulePost, unschedulePost } from './scheduleSlice';
import { makeScheduledPost } from '../test/renderWithStore';

const post = makeScheduledPost({ id: 'evt_1', localTime: '2026-08-05T09:00' });

const readyState = {
  ids: [post.id],
  entities: { [post.id]: post },
  status: 'ready',
  error: null,
  actionError: null,
  isSaving: false,
  pendingIds: [],
  rollback: null,
};

const movedTo = new Date('2026-08-12T09:00').toISOString();

/**
 * Reducers are pure functions of (state, action), so they are tested by calling
 * them — no store, no components, no async. These run in single-digit
 * milliseconds and cover the branch that is hardest to reach through the UI.
 */
describe('reschedulePost', () => {
  it('moves the event optimistically while the request is still in flight', () => {
    const next = reducer(readyState, {
      type: reschedulePost.pending.type,
      meta: { arg: { id: post.id, scheduledFor: movedTo } },
    });

    expect(next.entities[post.id].scheduledFor).toBe(movedTo);
    expect(next.pendingIds).toContain(post.id);
  });

  it('keeps the server record once the request settles', () => {
    const pending = reducer(readyState, {
      type: reschedulePost.pending.type,
      meta: { arg: { id: post.id, scheduledFor: movedTo } },
    });

    const settled = reducer(pending, {
      type: reschedulePost.fulfilled.type,
      payload: { ...post, scheduledFor: movedTo, updatedAt: '2026-08-02T12:00:00.000Z' },
    });

    expect(settled.entities[post.id].scheduledFor).toBe(movedTo);
    expect(settled.entities[post.id].updatedAt).toBe('2026-08-02T12:00:00.000Z');
    expect(settled.pendingIds).toHaveLength(0);
    expect(settled.rollback).toBeNull();
  });

  it('puts the event back exactly where it was when the request is refused', () => {
    const pending = reducer(readyState, {
      type: reschedulePost.pending.type,
      meta: { arg: { id: post.id, scheduledFor: movedTo } },
    });

    const rejected = reducer(pending, {
      type: reschedulePost.rejected.type,
      meta: { arg: { id: post.id, scheduledFor: movedTo } },
      error: { name: 'ForbiddenError', message: 'Your role (viewer) does not have permission.' },
    });

    expect(rejected.entities[post.id].scheduledFor).toBe(post.scheduledFor);
    expect(rejected.actionError).toMatch(/permission/);
    expect(rejected.pendingIds).toHaveLength(0);
    expect(rejected.rollback).toBeNull();
  });

  it('re-sorts so the ids stay in chronological order after a move', () => {
    const earlier = makeScheduledPost({ id: 'evt_early', localTime: '2026-08-03T08:00' });
    const withTwo = {
      ...readyState,
      ids: [earlier.id, post.id],
      entities: { [earlier.id]: earlier, [post.id]: post },
    };

    // Move the later event to before the earlier one.
    const moved = new Date('2026-08-01T07:00').toISOString();
    const next = reducer(withTwo, {
      type: reschedulePost.fulfilled.type,
      payload: { ...post, scheduledFor: moved },
    });

    expect(next.ids).toEqual([post.id, earlier.id]);
  });
});

describe('unschedulePost', () => {
  it('removes the event and clears its pending flag', () => {
    const pending = reducer(readyState, {
      type: unschedulePost.pending.type,
      meta: { arg: post.id },
    });
    expect(pending.pendingIds).toContain(post.id);

    const done = reducer(pending, { type: unschedulePost.fulfilled.type, payload: post.id });

    expect(done.ids).toHaveLength(0);
    expect(done.pendingIds).toHaveLength(0);
  });
});

describe('session end', () => {
  it('drops everything so the next user never sees the previous plan', () => {
    const next = reducer(readyState, { type: 'auth/logOut/fulfilled' });

    expect(next.ids).toHaveLength(0);
    // Back to `loading`, not `ready` — an empty list is not a fact we have yet.
    expect(next.status).toBe('loading');
  });
});
