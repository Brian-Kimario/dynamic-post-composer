const ACCESS_KEY = 'dpc.auth.token.v1';
const REFRESH_KEY = 'dpc.auth.refresh.v1';

const KEYS = [ACCESS_KEY, REFRESH_KEY];

/**
 * Where the tokens live on the client.
 *
 * The choice is a genuine trade-off rather than a detail:
 *
 * - `localStorage`  — survives a browser restart. Readable by any script on the
 *                     origin, so an XSS bug is a token theft.
 * - `sessionStorage`— cleared when the tab closes, which caps how long a stolen
 *                     token stays useful. Still readable by injected script.
 * - HTTP-only cookie— not reachable from JavaScript at all, so XSS cannot read
 *                     it. Requires a backend to set it, and brings CSRF along
 *                     as the problem to solve instead.
 *
 * With no backend, the cookie option is not available here, so the default is
 * `sessionStorage`: the narrower blast radius, and it makes "close the tab" a
 * real sign-out. "Keep me signed in" opts into `localStorage`, which is the
 * honest way to present the trade — the persistence the user wants is precisely
 * the persistence an attacker would inherit.
 *
 * Both tokens are kept in the same store, which is worth stating plainly: the
 * refresh token is the more valuable of the two, and putting it where script can
 * read it undoes much of the benefit of a short access lifetime. A real system
 * puts the refresh token in an HTTP-only, `SameSite` cookie scoped to the
 * refresh endpoint and leaves only the access token to JavaScript. That split
 * needs a server, so it is documented rather than pretended.
 *
 * Isolating all of this behind one module means the storage decision is one file
 * to revisit, and the interceptor in `apiClient.js` does not care which backend
 * won. Every access is wrapped: storage throws rather than returning null in
 * Safari private mode, with site data disabled, and over quota.
 */
export const tokenStorage = {
  /**
   * Writes to one store and clears the other, so switching "keep me signed in"
   * between sessions can never leave a second, longer-lived copy behind.
   *
   * Both tokens are written together. A pair that got out of step — a fresh
   * access token beside a stale refresh token — would produce a session that
   * works until the moment it silently cannot renew.
   */
  save({ accessToken, refreshToken }, { persistent }) {
    const [target, other] = persistent
      ? [window.localStorage, window.sessionStorage]
      : [window.sessionStorage, window.localStorage];

    try {
      KEYS.forEach((key) => other.removeItem(key));
      target.setItem(ACCESS_KEY, accessToken);
      target.setItem(REFRESH_KEY, refreshToken);
    } catch {
      throw new Error('Browser storage is unavailable, so the session could not be saved.');
    }
  },

  /**
   * Replaces the tokens after a refresh, in whichever store the session already
   * lives — so renewing never quietly promotes a tab-scoped session to a
   * permanent one, or demotes a persistent one.
   */
  replace({ accessToken, refreshToken }) {
    this.save({ accessToken, refreshToken }, { persistent: this.isPersistent() });
  },

  /**
   * Returns the token or `null`. A storage failure here is deliberately not
   * thrown: an unreadable store is indistinguishable from no stored session, and
   * "you are signed out" is the correct, safe interpretation of both.
   */
  read() {
    return readKey(ACCESS_KEY);
  },

  readRefreshToken() {
    return readKey(REFRESH_KEY);
  },

  /** Signing out must never fail, so this swallows storage errors by design. */
  clear() {
    try {
      KEYS.forEach((key) => {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key);
      });
    } catch {
      /* Nothing useful to do, and nothing to tell the user. */
    }
  },

  /** True when the stored session is the one that survives a browser restart. */
  isPersistent() {
    try {
      return window.localStorage.getItem(ACCESS_KEY) !== null;
    } catch {
      return false;
    }
  },
};

function readKey(key) {
  try {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
