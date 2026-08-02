import { configureStore } from '@reduxjs/toolkit';
import { setSessionRefreshHandler } from '../services/apiClient';
import { decodeToken } from '../services/jwt';
import authReducer, { sessionRenewed } from './authSlice';
import calendarReducer from './calendarSlice';
import composerReducer from './composerSlice';
import draftsReducer from './draftsSlice';
import filtersReducer from './filtersSlice';
import platformsReducer from './platformsSlice';
import postsReducer from './postsSlice';
import scheduleReducer from './scheduleSlice';

/**
 * One store, composed from domain slices.
 *
 * The split is by domain rather than by screen: `platforms`, `drafts` and
 * `posts` hold data, `composer` holds UI state, `auth` holds the session. A
 * component reads whichever slices it needs directly, which is what removes the
 * prop chains that used to run through ComposerWorkspace.
 *
 * `configureStore` wires up the Redux DevTools extension and, in development,
 * middleware that throws on accidental state mutation or non-serializable
 * values — both are why this is preferred over `createStore` by hand.
 */
export const store = configureStore({
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
});

/**
 * The one place the services layer is allowed to reach the store.
 *
 * A silent token refresh happens inside `apiClient`, far from any component and
 * without a dispatch of its own — but the store is still holding the token that
 * was just replaced. Rather than let `apiClient` import the store (which would
 * make the transport layer depend on Redux, and create an import cycle through
 * the slices), it exposes a handler and this file registers one.
 *
 * The token is decoded rather than re-verified: it was signed seconds ago by the
 * refresh call that produced it, and verification already happened there.
 */
setSessionRefreshHandler(({ accessToken }) => {
  store.dispatch(sessionRenewed({ token: accessToken, claims: decodeToken(accessToken).payload }));
});
