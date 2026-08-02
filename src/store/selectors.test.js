import { describe, expect, it } from 'vitest';
import {
  makeSelectScheduledPostIdsForDay,
  makeSelectScheduledPostsForSlot,
  selectScheduledPostsByDay,
} from './selectors';
import { makeScheduledPost } from '../test/renderWithStore';

function stateWith(posts) {
  return {
    schedule: {
      ids: posts.map((post) => post.id),
      entities: Object.fromEntries(posts.map((post) => [post.id, post])),
    },
  };
}

const earlyMorning = makeScheduledPost({ id: 'evt_2am', localTime: '2026-08-05T02:00' });
const afternoon = makeScheduledPost({ id: 'evt_2pm', localTime: '2026-08-05T14:00' });
const otherDay = makeScheduledPost({ id: 'evt_other', localTime: '2026-08-12T14:00' });

describe('selectScheduledPostsByDay', () => {
  it('groups by the local day, not the UTC day', () => {
    // The regression this guards: in any zone ahead of UTC, a 2am post's ISO
    // string carries the previous date, and grouping on it files the post a day
    // early.
    const byDay = selectScheduledPostsByDay(stateWith([earlyMorning]));

    expect(Object.keys(byDay)).toEqual(['2026-08-05']);
    expect(byDay['2026-08-05']).toHaveLength(1);
  });

  it('collects several posts under the same day', () => {
    const byDay = selectScheduledPostsByDay(stateWith([earlyMorning, afternoon, otherDay]));

    expect(byDay['2026-08-05'].map((post) => post.id)).toEqual(['evt_2am', 'evt_2pm']);
    expect(byDay['2026-08-12'].map((post) => post.id)).toEqual(['evt_other']);
  });
});

/**
 * These are the tests that pin the optimisation in place.
 *
 * They assert on *reference identity*, because that is precisely what `memo`
 * compares. A future change that makes these selectors return a fresh array each
 * time would still render correctly and would silently restore the 168-render
 * behaviour this experiment removed — these tests fail instead.
 */
describe('makeSelectScheduledPostIdsForDay', () => {
  it('returns the same array reference when an unrelated day changes', () => {
    const selectIds = makeSelectScheduledPostIdsForDay();
    const before = stateWith([earlyMorning, otherDay]);

    const first = selectIds(before, '2026-08-05');

    // Move the *other* day's post. Nothing about 5 August changed.
    const after = stateWith([
      earlyMorning,
      { ...otherDay, scheduledFor: new Date('2026-08-13T14:00').toISOString() },
    ]);
    const second = selectIds(after, '2026-08-05');

    expect(second).toBe(first);
  });

  it('returns a new reference when its own day changes', () => {
    const selectIds = makeSelectScheduledPostIdsForDay();
    const first = selectIds(stateWith([earlyMorning]), '2026-08-05');
    const second = selectIds(stateWith([earlyMorning, afternoon]), '2026-08-05');

    expect(second).not.toBe(first);
    expect(second).toEqual(['evt_2am', 'evt_2pm']);
  });

  it('gives every empty day the same shared empty array', () => {
    const selectIds = makeSelectScheduledPostIdsForDay();
    const state = stateWith([earlyMorning]);

    expect(selectIds(state, '2026-09-01')).toBe(selectIds(state, '2026-09-02'));
  });
});

describe('makeSelectScheduledPostsForSlot', () => {
  it('returns only the posts in its own hour', () => {
    const selectSlot = makeSelectScheduledPostsForSlot();
    const state = stateWith([earlyMorning, afternoon]);

    expect(selectSlot(state, '2026-08-05', 2).map((p) => p.id)).toEqual(['evt_2am']);
    expect(selectSlot(state, '2026-08-05', 14).map((p) => p.id)).toEqual(['evt_2pm']);
    expect(selectSlot(state, '2026-08-05', 9)).toHaveLength(0);
  });

  it('keeps its reference when a different hour of the same day changes', () => {
    // The week grid renders 168 of these. Without this, moving one event
    // re-rendered all of them.
    const selectSlot = makeSelectScheduledPostsForSlot();
    const before = stateWith([earlyMorning, afternoon]);

    const first = selectSlot(before, '2026-08-05', 2);

    const after = stateWith([
      earlyMorning,
      { ...afternoon, scheduledFor: new Date('2026-08-05T16:00').toISOString() },
    ]);
    const second = selectSlot(after, '2026-08-05', 2);

    expect(second).toBe(first);
  });
});
