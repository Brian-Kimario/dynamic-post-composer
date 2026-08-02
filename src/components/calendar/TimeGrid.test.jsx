import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import TimeGrid from './TimeGrid';
import { makeScheduledPost, makeTestStore, renderWithStore } from '../../test/renderWithStore';

const post = makeScheduledPost({ localTime: '2026-08-05T14:00' });

function setup(view) {
  const store = makeTestStore({ scheduledPosts: [post] });
  store.dispatch({ type: 'calendar/dateFocused', payload: '2026-08-05' });
  store.dispatch({ type: 'calendar/viewChanged', payload: view });

  return { store, ...renderWithStore(<TimeGrid />, { store }) };
}

/**
 * Day view is the week grid with one column rather than a second component, so
 * these tests exist mainly to hold that equivalence in place: the same grid, the
 * same drop behaviour, a different number of days.
 */
describe('TimeGrid', () => {
  it('renders a full 24 hours, so a post at any time is reachable', () => {
    const { container } = setup('week');

    // One row per hour; each row is a `display: contents` wrapper.
    expect(container.querySelectorAll('.contents')).toHaveLength(24);
  });

  it('shows seven day columns in week view', () => {
    setup('week');
    // Sunday 2 August through Saturday 8 August.
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows a single day column in day view', () => {
    setup('day');

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('8')).not.toBeInTheDocument();
  });

  it('places the event in its own hour and nowhere else', () => {
    setup('day');

    const chips = screen.getAllByRole('button', { name: /scheduled for/ });
    expect(chips).toHaveLength(1);
  });
});
