import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventDetailPanel from './EventDetailPanel';
import { ROLE } from '../../config/permissions';
import { makeScheduledPost, makeTestStore, renderWithStore } from '../../test/renderWithStore';

const post = makeScheduledPost({ content: 'Launch week teaser', localTime: '2026-08-05T09:45' });

function setup(role = ROLE.EDITOR) {
  const store = makeTestStore({ role, scheduledPosts: [post] });
  store.dispatch({ type: 'calendar/eventSelected', payload: post.id });

  renderWithStore(<EventDetailPanel />, { store });
  return store;
}

describe('EventDetailPanel', () => {
  it('shows the event and seeds the field with its current time', () => {
    setup();

    expect(screen.getByText('Launch week teaser')).toBeInTheDocument();
    // Local wall-clock, no zone — the format the input actually speaks.
    expect(screen.getByLabelText(/reschedule/i)).toHaveValue('2026-08-05T09:45');
  });

  it('reschedules to a typed time, preserving the minutes a slot drop would round', async () => {
    const user = userEvent.setup();
    const store = setup();

    const field = screen.getByLabelText(/reschedule/i);
    await user.clear(field);
    await user.type(field, '2026-08-06T14:20');
    await user.click(screen.getByRole('button', { name: /move/i }));

    const moved = new Date(store.getState().schedule.entities[post.id].scheduledFor);
    expect(moved.getDate()).toBe(6);
    expect(moved.getHours()).toBe(14);
    expect(moved.getMinutes()).toBe(20);

    // Acting on the event closes the dialog.
    expect(store.getState().calendar.selectedEventId).toBeNull();
  });

  it('unschedules the event', async () => {
    const user = userEvent.setup();
    const store = setup();

    await user.click(screen.getByRole('button', { name: /unschedule/i }));

    expect(store.getState().schedule.pendingIds).toContain(post.id);
  });

  it('closes without changing anything', async () => {
    const user = userEvent.setup();
    const store = setup();
    const before = store.getState().schedule.entities[post.id].scheduledFor;

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(store.getState().calendar.selectedEventId).toBeNull();
    expect(store.getState().schedule.entities[post.id].scheduledFor).toBe(before);
  });

  it('offers a viewer no way to change the schedule, and says why', () => {
    setup(ROLE.VIEWER);

    expect(screen.queryByLabelText(/reschedule/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unschedule/i })).not.toBeInTheDocument();
    expect(screen.getByText(/view the schedule but not change it/i)).toBeInTheDocument();
  });

  it('still shows a viewer the content itself', () => {
    setup(ROLE.VIEWER);
    expect(screen.getByText('Launch week teaser')).toBeInTheDocument();
  });
});
