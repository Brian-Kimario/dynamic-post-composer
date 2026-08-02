import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import authReducer from '../store/authSlice';
import calendarReducer from '../store/calendarSlice';
import composerReducer from '../store/composerSlice';
import draftsReducer from '../store/draftsSlice';
import filtersReducer from '../store/filtersSlice';
import platformsReducer from '../store/platformsSlice';
import postsReducer from '../store/postsSlice';
import scheduleReducer from '../store/scheduleSlice';
import { ROLE } from '../config/permissions';

/**
 * Builds a real store from the real reducers, with only the *state* faked.
 *
 * The alternative — a mock store that records dispatched actions — would let a
 * test pass while the reducers were broken, because nothing would ever run them.
 * Here a test asserts on what the user ends up seeing, which is the point of
 * Testing Library and the reason these tests survive refactors.
 */
export function makeTestStore({ role = ROLE.EDITOR, scheduledPosts = [] } = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      platforms: platformsReducer,
      drafts: draftsReducer,
      posts: postsReducer,
      schedule: scheduleReducer,
      composer: composerReducer,
      filters: filtersReducer,
      calendar: calendarReducer,
    },
    preloadedState: {
      auth: {
        status: 'authenticated',
        user: { id: 'usr_test', name: 'Test User', email: 'test@dpc.dev', role },
        token: null,
        claims: null,
        error: null,
        notice: null,
        renewalCount: 0,
      },
      schedule: {
        ids: scheduledPosts.map((post) => post.id),
        entities: Object.fromEntries(scheduledPosts.map((post) => [post.id, post])),
        status: 'ready',
        error: null,
        actionError: null,
        isSaving: false,
        pendingIds: [],
        rollback: null,
      },
    },
  });

  return store;
}

/** Renders a component inside the providers it expects, and hands back the store. */
export function renderWithStore(ui, options = {}) {
  const store = options.store ?? makeTestStore(options);

  const result = render(
    <Provider store={store}>
      {/* Chips and panels navigate, so a router has to be present. */}
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );

  return { ...result, store };
}

/** A scheduled post at a given local time, with sane defaults. */
export function makeScheduledPost({
  id = 'evt_1',
  content = 'A scheduled post',
  platformId = 'x',
  localTime = '2026-08-05T09:00',
} = {}) {
  return {
    id,
    content,
    platformId,
    // `new Date('…T09:00')` parses as local time, which is what the calendar means.
    scheduledFor: new Date(localTime).toISOString(),
    authorId: 'usr_test',
    authorName: 'Test User',
    createdAt: new Date('2026-08-01T10:00').toISOString(),
    updatedAt: new Date('2026-08-01T10:00').toISOString(),
  };
}
