import { createAsyncThunk, createSelector, createSlice, isRejected } from '@reduxjs/toolkit';
import { login, refreshTokens, userFromClaims, verifyAccessToken } from '../services/authApi';
import { permissionsForRole, roleHasPermission } from '../config/permissions';
import { decodeToken } from '../services/jwt';
import { tokenStorage } from '../services/tokenStorage';

/**
 * Four states, not an `isLoading` flag and an `isLoggedIn` flag.
 *
 * Two booleans would allow combinations that cannot happen and, worse, would not
 * distinguish "we have not looked at storage yet" from "there is no session".
 * That distinction is the entire reason the app does not flash the login screen
 * on every reload before deciding the user is already signed in.
 */
export const AUTH_STATUS = {
  /** Startup: a stored token is being verified. Render nothing decisive yet. */
  RESTORING: 'restoring',
  ANONYMOUS: 'anonymous',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
};

/**
 * Rehydrates the session from the stored token on startup.
 *
 * This is the stateless model paying off. There is no `/me` call and nothing to
 * ask the server, because the token *is* the session record — verifying its
 * signature and expiry locally is enough to know who the user is and that the
 * claim was not edited. What survives a reload is one string.
 */
export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const token = tokenStorage.read();

  if (!token) return null;

  try {
    const claims = await verifyAccessToken(token);
    return { token, claims };
  } catch {
    // The access token is expired or unusable — but with a two-minute lifetime
    // that is the *normal* state of any tab left open, so it is not by itself a
    // reason to sign anyone out. The refresh token decides.
    return restoreByRefreshing();
  }
});

/**
 * Last chance before the session is declared over: trade the refresh token for a
 * new pair. This is what makes a short access lifetime tolerable — a user who
 * comes back to the tab after lunch is renewed silently instead of being asked
 * to sign in again.
 */
async function restoreByRefreshing() {
  const refreshToken = tokenStorage.readRefreshToken();

  if (!refreshToken) {
    tokenStorage.clear();
    return null;
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    tokenStorage.replace(tokens);
    return { token: tokens.accessToken, claims: decodeToken(tokens.accessToken).payload };
  } catch {
    // The refresh token is expired or invalid too, so the session really is
    // over. Drop it silently: the user did not just try to do anything, so
    // there is no failure to report — they are simply signed out.
    tokenStorage.clear();
    return null;
  }
}

export const logIn = createAsyncThunk('auth/logIn', async ({ email, password, rememberMe }) => {
  const tokens = await login({ email, password });

  // Persist before the reducer runs, so a reload one tick later still finds it.
  tokenStorage.save(tokens, { persistent: rememberMe });

  // Safe to decode without re-verifying: this token was signed moments ago by
  // the call above, and `verifyToken` already ran inside it.
  return { token: tokens.accessToken, claims: decodeToken(tokens.accessToken).payload };
});

export const logOut = createAsyncThunk('auth/logOut', async () => {
  tokenStorage.clear();
});

/**
 * A request failed because the token is gone, expired or invalid.
 *
 * Any thunk in the app can trigger this — the API client throws the same error
 * type from a single place — so matching on it centrally is what keeps expiry
 * handling out of every feature slice. `apiClient` has already cleared storage
 * by the time this runs; this is the state half of the same event.
 */
const isUnauthorizedRejection = (action) =>
  isRejected(action) && action.error?.name === 'UnauthorizedError';

/**
 * Every way a session can end: signing out, or a request being refused.
 *
 * The data slices match on this to drop what they are holding. Without it, the
 * drafts loaded for one user would still be in memory when the next one signs in
 * on the same browser, and would render for a frame before the refetch replaced
 * them. Exported from here so "what ends a session" is defined once.
 */
export const isSessionEnded = (action) =>
  logOut.fulfilled.match(action) || isUnauthorizedRejection(action);

const signedOutState = {
  status: AUTH_STATUS.ANONYMOUS,
  user: null,
  token: null,
  claims: null,
  error: null,
  renewalCount: 0,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    ...signedOutState,
    status: AUTH_STATUS.RESTORING,
    /** Explains an unexpected sign-out, e.g. "your session expired". */
    notice: null,
    /** How many silent renewals this session has had. Shown in the session panel. */
    renewalCount: 0,
  },
  reducers: {
    noticeDismissed(state) {
      state.notice = null;
    },

    /**
     * The session was renewed underneath the UI, without the user doing
     * anything. Dispatched by the API client through the handler registered in
     * `store/index.js` — the services layer does not know Redux exists.
     *
     * Deliberately narrow: it swaps the token and the claims and touches nothing
     * else. Status stays `authenticated` because the user never stopped being
     * signed in, and identity is re-read from the new token rather than assumed
     * unchanged, so a role changed between renewals takes effect here.
     */
    sessionRenewed(state, action) {
      const claims = action.payload.claims;

      state.token = action.payload.token;
      state.claims = claims;
      state.user = userFromClaims(claims);
      state.renewalCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (!action.payload) {
          Object.assign(state, signedOutState);
          return;
        }
        applySession(state, action.payload);
      })
      .addCase(restoreSession.rejected, (state) => {
        Object.assign(state, signedOutState);
      })

      .addCase(logIn.pending, (state) => {
        state.status = AUTH_STATUS.AUTHENTICATING;
        state.error = null;
        state.notice = null;
      })
      .addCase(logIn.fulfilled, (state, action) => {
        applySession(state, action.payload);
      })
      .addCase(logIn.rejected, (state, action) => {
        Object.assign(state, signedOutState);
        state.error = action.error.message;
      })

      .addCase(logOut.fulfilled, (state) => {
        Object.assign(state, signedOutState);
      })

      .addMatcher(isUnauthorizedRejection, (state, action) => {
        // Ignore it if we are already signed out, so a stray failed request
        // cannot overwrite a login error the user still needs to read.
        if (state.status !== AUTH_STATUS.AUTHENTICATED) return;

        Object.assign(state, signedOutState);
        state.notice = action.error.message;
      });
  },
});

function applySession(state, { token, claims }) {
  state.status = AUTH_STATUS.AUTHENTICATED;
  state.user = userFromClaims(claims);
  state.token = token;
  state.claims = claims;
  state.error = null;
}

export const { noticeDismissed, sessionRenewed } = authSlice.actions;

export const selectAuthStatus = (state) => state.auth.status;
export const selectIsAuthenticated = (state) => state.auth.status === AUTH_STATUS.AUTHENTICATED;
export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthNotice = (state) => state.auth.notice;
/**
 * The raw token, kept in the store only so the session panel can show its
 * structure. Requests do not read it from here — `apiClient` takes it from
 * storage, which is the copy that outlives a reload.
 */
export const selectAccessToken = (state) => state.auth.token;
export const selectTokenClaims = (state) => state.auth.claims;
export const selectRenewalCount = (state) => state.auth.renewalCount;

/* -------------------------------------------------------------------------- */
/* Authorization                                                               */
/* -------------------------------------------------------------------------- */

export const selectCurrentRole = (state) => state.auth.user?.role ?? null;

/**
 * The permissions the signed-in role holds, memoized so the array keeps a stable
 * identity between renders. Without `createSelector` this would return a new
 * array every time and re-render every component reading it on every dispatch.
 */
export const selectPermissions = createSelector([selectCurrentRole], (role) =>
  role ? permissionsForRole(role) : [],
);

/**
 * The check components actually use, expressed as a curried selector so it can
 * be passed straight to `useSelector`:
 *
 *   const canPublish = useSelector(selectHasPermission(PERMISSION.POST_PUBLISH));
 *
 * The role comes from the store, which is populated from verified token claims —
 * so a user cannot grant themselves anything by editing local state. Nothing
 * outside this file and `permissions.js` ever compares a role by name.
 */
export const selectHasPermission = (permission) => (state) =>
  roleHasPermission(selectCurrentRole(state), permission);

export default authSlice.reducer;
