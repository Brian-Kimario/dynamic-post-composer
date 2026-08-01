import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import composerReducer from './composerSlice';
import draftsReducer from './draftsSlice';
import filtersReducer from './filtersSlice';
import platformsReducer from './platformsSlice';
import postsReducer from './postsSlice';

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
    composer: composerReducer,
    filters: filtersReducer,
  },
});
