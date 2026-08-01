import { verifyAccessToken, userFromClaims } from './authApi';
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
 *   response → translate a rejection into a session change (response interceptor)
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
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
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
    throw new UnauthorizedError(
      error?.reason === TOKEN_ERROR.EXPIRED
        ? 'Your session has expired. Sign in again to continue.'
        : 'Your session is no longer valid. Sign in again to continue.',
    );
  }
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
export async function sendRequest({ latencyMs = 0, ...config }, handler) {
  const request = attachAuthorization(config);

  await delay(latencyMs);

  try {
    const claims = await authenticate(request);
    return handler(userFromClaims(claims));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      // Response interceptor. An expired or tampered token will fail every
      // subsequent request too, so it is discarded here rather than left to rot
      // in storage. Refreshing it instead of discarding it is Experiment 3.2.
      tokenStorage.clear();
    }
    throw error;
  }
}
