import { Profiler } from 'react';
import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MonthDayCell from './MonthDayCell';
import TimeSlot from './TimeSlot';
import ScheduledPostChip from './ScheduledPostChip';
import { reschedulePost } from '../../store/scheduleSlice';
import { makeScheduledPost, makeTestStore, renderWithStore } from '../../test/renderWithStore';

/**
 * The regression test for Experiment 1.4.2's optimisation.
 *
 * Measured in the browser before the change: moving one event cost **168**
 * `MonthDayCell` renders and **672** `TimeSlot` renders, because every per-day
 * slice of the grouping selector was a new array reference and no cell could
 * bail out. Afterwards the same moves cost 4 and 6.
 *
 * Counting that here needs care. A `<Profiler>` reports *commits of the tree it
 * wraps*, so wrapping the whole grid would report `1` whether one cell re-rendered
 * or all forty-two — React batches them into a single commit. Wrapping **one
 * cell** asks the question precisely: did this component, which is unaffected by
 * the change, render at all? Before the optimisation it did; the expectation
 * here is zero.
 *
 * Correctness tests cannot catch this. The calendar rendered the right thing
 * both before and after — just far too often.
 */
function profileOne(ui, store) {
  let commits = 0;

  const result = renderWithStore(
    <Profiler id="subject" onRender={() => (commits += 1)}>
      {ui}
    </Profiler>,
    { store },
  );

  return { ...result, commits: () => commits, reset: () => (commits = 0) };
}

const watched = makeScheduledPost({ id: 'evt_watched', localTime: '2026-08-05T02:00' });
const elsewhere = makeScheduledPost({ id: 'evt_elsewhere', localTime: '2026-08-12T14:00' });
const sameDayLaterHour = makeScheduledPost({ id: 'evt_later', localTime: '2026-08-05T14:00' });

function move(store, id, adjust) {
  const post = store.getState().schedule.entities[id];
  const next = new Date(post.scheduledFor);
  adjust(next);

  return act(async () => {
    store.dispatch({
      type: reschedulePost.pending.type,
      meta: { arg: { id, scheduledFor: next.toISOString() } },
    });
  });
}

describe('MonthDayCell', () => {
  it('does not re-render when a different day changes', async () => {
    const store = makeTestStore({ scheduledPosts: [watched, elsewhere] });

    const { commits, reset } = profileOne(
      <MonthDayCell dateKey="2026-08-05" isCurrentMonth />,
      store,
    );
    reset();

    await move(store, elsewhere.id, (date) => date.setDate(date.getDate() + 1));

    expect(commits()).toBe(0);
  });

  it('does re-render when its own day changes', async () => {
    const store = makeTestStore({ scheduledPosts: [watched, elsewhere] });

    const { commits, reset } = profileOne(
      <MonthDayCell dateKey="2026-08-05" isCurrentMonth />,
      store,
    );
    reset();

    // Move the watched event off this day — the cell must notice.
    await move(store, watched.id, (date) => date.setDate(date.getDate() + 7));

    expect(commits()).toBeGreaterThan(0);
  });
});

describe('TimeSlot', () => {
  it('does not re-render when another hour of the same day changes', async () => {
    // This is the 672-render case: a week is 168 slots, and every one of them
    // used to re-render because they all read the same day-level array.
    const store = makeTestStore({ scheduledPosts: [watched, sameDayLaterHour] });

    const { commits, reset } = profileOne(<TimeSlot dateKey="2026-08-05" hour={2} />, store);
    reset();

    await move(store, sameDayLaterHour.id, (date) => date.setHours(date.getHours() + 1));

    expect(commits()).toBe(0);
  });

  it('does re-render when an event lands in its own hour', async () => {
    const store = makeTestStore({ scheduledPosts: [watched, sameDayLaterHour] });

    const { commits, reset } = profileOne(<TimeSlot dateKey="2026-08-05" hour={2} />, store);
    reset();

    await move(store, sameDayLaterHour.id, (date) => date.setHours(2));

    expect(commits()).toBeGreaterThan(0);
  });
});

describe('ScheduledPostChip', () => {
  it('does not re-render when a different event moves', async () => {
    const store = makeTestStore({ scheduledPosts: [watched, elsewhere] });

    const { commits, reset } = profileOne(<ScheduledPostChip postId={watched.id} />, store);
    reset();

    await move(store, elsewhere.id, (date) => date.setDate(date.getDate() + 1));

    expect(commits()).toBe(0);
  });

  it('does not re-render when an unrelated part of the UI state changes', async () => {
    const store = makeTestStore({ scheduledPosts: [watched] });

    const { commits, reset } = profileOne(<ScheduledPostChip postId={watched.id} />, store);
    reset();

    // Selecting an event and switching views are pure UI state; a chip reads
    // neither, so neither should cost anything.
    await act(async () => {
      store.dispatch({ type: 'calendar/eventSelected', payload: elsewhere.id });
      store.dispatch({ type: 'calendar/viewChanged', payload: 'week' });
    });

    expect(commits()).toBe(0);
  });
});
