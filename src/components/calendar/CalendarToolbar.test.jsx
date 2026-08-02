import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarToolbar from './CalendarToolbar';
import { makeTestStore, renderWithStore } from '../../test/renderWithStore';

/**
 * Paging is view-aware, and the rule lives in the reducer so all three buttons
 * can be identical. These tests are the reason that matters: the same click
 * produces a month, a week or a day step depending only on state.
 */
describe('CalendarToolbar paging', () => {
  function setup(view) {
    const store = makeTestStore();
    store.dispatch({ type: 'calendar/dateFocused', payload: '2026-08-15' });
    store.dispatch({ type: 'calendar/viewChanged', payload: view });

    renderWithStore(<CalendarToolbar />, { store });
    return store;
  }

  it('steps a month at a time in month view', async () => {
    const user = userEvent.setup();
    const store = setup('month');

    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(store.getState().calendar.focusedDateKey).toBe('2026-09-15');

    await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(store.getState().calendar.focusedDateKey).toBe('2026-08-15');
  });

  it('steps a week at a time in week view', async () => {
    const user = userEvent.setup();
    const store = setup('week');

    await user.click(screen.getByRole('button', { name: /next week/i }));
    expect(store.getState().calendar.focusedDateKey).toBe('2026-08-22');
  });

  it('steps a day at a time in day view', async () => {
    const user = userEvent.setup();
    const store = setup('day');

    await user.click(screen.getByRole('button', { name: /next day/i }));
    expect(store.getState().calendar.focusedDateKey).toBe('2026-08-16');
  });

  it('clamps the day when a month step would overflow', async () => {
    const user = userEvent.setup();
    const store = makeTestStore();
    store.dispatch({ type: 'calendar/dateFocused', payload: '2026-01-31' });
    renderWithStore(<CalendarToolbar />, { store });

    await user.click(screen.getByRole('button', { name: /next month/i }));

    // Not 3 March, which is where naive month arithmetic lands.
    expect(store.getState().calendar.focusedDateKey).toBe('2026-02-28');
  });

  it('returns to today', async () => {
    const user = userEvent.setup();
    const store = setup('month');

    await user.click(screen.getByRole('button', { name: /today/i }));

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(store.getState().calendar.focusedDateKey).toBe(expected);
  });

  it('marks the active view for assistive technology', async () => {
    const user = userEvent.setup();
    const store = setup('month');

    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Week' }));

    expect(store.getState().calendar.view).toBe('week');
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
  });
});
