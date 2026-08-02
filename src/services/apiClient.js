import { refreshTokens, verifyAccessToken, userFromClaims } from './authApi';
import { roleHasPermission } from '../config/permissions';
import { TOKEN_ERROR } from './jwt';
import { tokenStorage } from './tokenStorage';

/**
 * The centralized request layer every data call goes through.
 *
 * There is no HTTP here — the "network" is localStorage — but the *shape* is the
 * shape Axios interceptors give you, and the shape is the transferable part:
 *
 *   request  → attach the Authorization header  (request interceptor)
 *   transit  → simulated latency
 *   server   → verify the token, derive identity (stateless authentication)
 *            → check the caller's role against the required permission (RBAC)
 *   response → on expiry, refresh once and retry; otherwise end the session
 *              (response interceptor)
 *
 * Doing this centrally rather than per call site is the whole argument for
 * interceptors: no feature module can forget the header, and there is exactly
 * one place that decides what a 401 means. Swapping in `axios.create()` later
 * replaces this file's internals and nothing else, because callers only ever see
 * `sendRequest`.
 */

/**
 * Distinguished from an ordinary Error so the auth slice can recognise "this
 * request failed because the session is gone" without matching on message text.
 * Redux Toolkit's default error serialization preserves `name`, which is what
 * makes the matcher in `authSlice.js` possible.
 */
export class UnauthorizedError extends Error {
  constructor(message, { isExpired = false } = {}) {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
    /** Whether a refresh could plausibly fix this. Expiry can; tampering cannot. */
    this.isExpired = isExpired;
  }
}

/**
 * 403, not 401 — and the difference is the whole authentication/authorization
 * distinction in one status code. 401 means "I do not know who you are", and the
 * fix is to sign in again. 403 means "I know exactly who you are, and the answer
 * is still no". Conflating them would sign a user out for asking to do something
 * their role simply does not allow, which is both wrong and infuriating.
 */
export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Request interceptor. Reads the token from storage rather than from the Redux
 * store on purpose: storage is the copy that survives a reload, so this stays
 * correct during the moment at startup when the store has not been rehydrated
 * yet, and it keeps the transport layer independent of the state library.
 */
function attachAuthorization(config) {
  const token = tokenStorage.read();

  if (!token) return config;

  return {
    ...config,
    headers: { ...config.headers, Authorization: `Bearer ${token}` },
  };
}

/**
 * The server side of the exchange: no session lookup, just "does this bearer
 * token verify against the secret, and is it still in date".
 */
async function authenticate(request) {
  const header = request.headers?.Authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('You are signed out. Sign in to continue.');
  }

  try {
    return await verifyAccessToken(header.slice('Bearer '.length));
  } catch (error) {
    const isExpired = error?.reason === TOKEN_ERROR.EXPIRED;

    throw new UnauthorizedError(
      isExpired
        ? 'Your session has expired. Sign in again to continue.'
        : 'Your session is no longer valid. Sign in again to continue.',
      // Only an *expired* token is worth refreshing. A tampered or malformed one
      // is not going to be fixed by asking for a new pair, and retrying it would
      // turn a clear rejection into a slow one.
      { isExpired },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Token refresh                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The in-flight refresh, if there is one.
 *
 * This is the part of a refresh mechanism that is easy to get wrong. The page
 * loads, three panels fetch at once, and all three get a 401 within a few
 * milliseconds of each other. Without this, each starts its own refresh: three
 * renewals, three new token pairs, and — with rotation — two of them
 * immediately invalidated by the third. The classic symptom is a user being
 * logged out at random on a slow connection.
 *
 * A module-level promise makes the refresh single-flight: the first caller
 * starts it, every other caller awaits the same promise, and all of them
 * continue with the same new token.
 */
let refreshInFlight = null;

/**
 * Notifies the store that the session was renewed. The services layer cannot
 * dispatch — it does not know Redux exists, and should not — so `store/index.js`
 * registers a callback here at startup. Without it the panel would keep
 * displaying the token that was replaced two minutes ago.
 */
let onSessionRefreshed = null;

export function setSessionRefreshHandler(handler) {
  onSessionRefreshed = handler;
}

async function refreshSession() {
  const refreshToken = tokenStorage.readRefreshToken();

  if (!refreshToken) {
    throw new UnauthorizedError('Your session has expired. Sign in again to continue.');
  }

  const tokens = await refreshTokens(refreshToken);

  // Written to storage before anything else observes the result, so a reload
  // mid-refresh finds the new pair rather than the pair that just expired.
  tokenStorage.replace(tokens);
  onSessionRefreshed?.(tokens);

  return tokens.accessToken;
}

/**
 * Starts a refresh, or joins the one already running.
 *
 * The `finally` clearing `refreshInFlight` is what makes this reusable rather
 * than once-only: after the promise settles, the next expiry starts a fresh
 * attempt instead of awaiting a promise that resolved twenty minutes ago.
 */
function refreshOnce() {
  refreshInFlight ??= refreshSession().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * The authorization check, run after identity is established and before any
 * handler executes.
 *
 * The role is read from the *verified* token, never from anything the caller
 * passed in, so a component cannot ask for more than its user was granted. This
 * is the check that actually protects data — the hidden buttons and guarded
 * routes in the UI are convenience, and a user with the console open is not
 * bound by either.
 */
function authorize(user, permission) {
  if (!permission || roleHasPermission(user.role, permission)) return;

  throw new ForbiddenError(
    `Your role (${user.role}) does not have permission to perform this action.`,
  );
}

/**
 * Sends a request through the pipeline and hands the verified claims to the
 * handler, which stands in for the endpoint's own logic.
 *
 * The handler receives the *user derived from the token*, never a user id the
 * caller supplied. That is the practical benefit of the pattern: a component
 * cannot write a record as somebody else, because it never gets to say who it
 * is — the token does.
 */
export async function sendRequest({ latencyMs = 0, permission, ...config }, handler) {
  await delay(latencyMs);

  return attempt(config, permission, handler, { allowRefresh: true });
}

/**
 * One pass through the pipeline, with the response interceptor's decision at the
 * end: refresh and retry, or give up and end the session.
 *
 * The retry re-runs `attachAuthorization`, so the second attempt picks up the
 * token the refresh just wrote. Reusing the original request object instead
 * would resend the expired header and fail identically — a common bug in
 * hand-rolled interceptors.
 *
 * `allowRefresh` is false on the retry, which bounds the recursion at exactly
 * one extra attempt. If the request fails again after a successful refresh, the
 * problem is not the token, and looping would only turn a failure into a hang.
 */
async function attempt(config, permission, handler, { allowRefresh }) {
  const request = attachAuthorization(config);

  try {
    const claims = await authenticate(request);
    const user = userFromClaims(claims);

    // Deliberately outside the refresh path below: a 403 is not a token
    // problem, and renewing a token cannot grant a permission the role lacks.
    authorize(user, permission);

    return handler(user);
  } catch (error) {
    const canRefresh = allowRefresh && error instanceof UnauthorizedError && error.isExpired;

    if (canRefresh) {
      try {
        await refreshOnce();
        return await attempt(config, permission, handler, { allowRefresh: false });
      } catch {
        // The refresh token is gone or expired too, so the session is genuinely
        // over. Fall through to the sign-out below with the original message.
      }
    }

    if (error instanceof UnauthorizedError) {
      // A token that could not be renewed will fail every subsequent request, so
      // it is discarded here rather than left to rot in storage.
      tokenStorage.clear();
    }

    throw error;
  }
}
