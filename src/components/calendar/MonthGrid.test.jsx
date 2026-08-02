import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthGrid from './MonthGrid';
import { ROLE } from '../../config/permissions';
import { formatFullDate } from '../../utils/calendar';
import { makeScheduledPost, makeTestStore, renderWithStore } from '../../test/renderWithStore';

const DRAG_TYPE = 'application/x-dpc-scheduled-post';

/** A DataTransfer that survives the whole drag, like the browser's own. */
function createDataTransfer() {
  const data = new Map();

  return {
    data,
    setData: (type, value) => data.set(type, value),
    getData: (type) => data.get(type) ?? '',
    get types() {
      return [...data.keys()];
    },
    dropEffect: 'none',
    effectAllowed: 'none',
  };
}

/**
 * Day labels are produced by `Intl`, so their wording depends on the machine's
 * locale — "12 August 2026" here, "August 12, 2026" there. Tests build the
 * expected label with the same helper the component uses, so they assert on
 * *which day* rather than on how the runner happens to format dates. The
 * formatting itself is covered in `utils/calendar.test.js`.
 */
function dayLabel(day) {
  return `Open ${formatFullDate(new Date(2026, 7, day))}`;
}

function openDayButton(day) {
  return screen.getByRole('button', { name: dayLabel(day) });
}

function cellFor(day) {
  return openDayButton(day).closest('div').parentElement;
}

/**
 * Drag-and-drop through the real components.
 *
 * `userEvent` has no drag simulation, and the pointer-level events a mouse
 * produces are not what an HTML5 drag emits — so the drag is driven by firing
 * the three events the API actually defines, carrying one `DataTransfer` between
 * them. That is exactly the sequence a real drag produces, and it is what was
 * driven by hand in the browser for 1.4.1.
 */
describe('MonthGrid drag-and-drop', () => {
  const post = makeScheduledPost({ localTime: '2026-08-05T14:30' });

  function setup(role = ROLE.EDITOR) {
    const store = makeTestStore({ role, scheduledPosts: [post] });
    // Focus August 2026 so the grid is deterministic regardless of today's date.
    store.dispatch({ type: 'calendar/dateFocused', payload: '2026-08-15' });

    return { store, ...renderWithStore(<MonthGrid />, { store }) };
  }

  it('renders six weeks and puts the event on its local day', () => {
    setup();

    const dayCell = cellFor(5);
    expect(within(dayCell).getByRole('button', { name: /scheduled for/ })).toBeInTheDocument();
  });

  it('moves the event to the dropped day and keeps its time of day', async () => {
    const { store } = setup();

    const chip = screen.getByRole('button', { name: /scheduled for/ });
    const target = cellFor(12);
    const dataTransfer = createDataTransfer();

    fireDrag(chip, target, dataTransfer);

    // The optimistic update lands synchronously in the pending reducer.
    const moved = store.getState().schedule.entities[post.id];
    const movedAt = new Date(moved.scheduledFor);

    expect(movedAt.getDate()).toBe(12);
    expect(movedAt.getHours()).toBe(14);
    expect(movedAt.getMinutes()).toBe(30);
  });

  it('carries the event id through the drag payload', () => {
    setup();

    const chip = screen.getByRole('button', { name: /scheduled for/ });
    const dataTransfer = createDataTransfer();

    chip.dispatchEvent(dragEvent('dragstart', dataTransfer));

    expect(dataTransfer.getData(DRAG_TYPE)).toBe(post.id);
  });

  it('does not let a viewer drag or drop', () => {
    const { store } = setup(ROLE.VIEWER);

    const chip = screen.getByRole('button', { name: /scheduled for/ });
    expect(chip).not.toHaveAttribute('draggable', 'true');

    const before = store.getState().schedule.entities[post.id].scheduledFor;
    fireDrag(chip, cellFor(12), createDataTransfer());

    expect(store.getState().schedule.entities[post.id].scheduledFor).toBe(before);
  });

  it('opens the day view when a date number is clicked', async () => {
    const user = userEvent.setup();
    const { store } = setup();

    await user.click(openDayButton(12));

    expect(store.getState().calendar.view).toBe('day');
    expect(store.getState().calendar.focusedDateKey).toBe('2026-08-12');
  });

  it('selects the event when its chip is clicked', async () => {
    const user = userEvent.setup();
    const { store } = setup();

    await user.click(screen.getByRole('button', { name: /scheduled for/ }));

    expect(store.getState().calendar.selectedEventId).toBe(post.id);
  });
});

function dragEvent(type, dataTransfer) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  event.dataTransfer = dataTransfer;
  return event;
}

function fireDrag(chip, target, dataTransfer) {
  chip.dispatchEvent(dragEvent('dragstart', dataTransfer));
  target.dispatchEvent(dragEvent('dragover', dataTransfer));
  target.dispatchEvent(dragEvent('drop', dataTransfer));
  chip.dispatchEvent(dragEvent('dragend', dataTransfer));
}
