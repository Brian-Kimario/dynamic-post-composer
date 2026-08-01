const TOKEN_KEY = 'dpc.auth.token.v1';

/**
 * Where the access token lives on the client.
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
 * Isolating all of this behind one module means the storage decision is one file
 * to revisit, and the interceptor in `apiClient.js` does not care which backend
 * won. Every access is wrapped: storage throws rather than returning null in
 * Safari private mode, with site data disabled, and over quota.
 */
export const tokenStorage = {
  /**
   * Writes to one store and clears the other, so switching "keep me signed in"
   * between sessions can never leave a second, longer-lived copy behind.
   */
  save(token, { persistent }) {
    const [target, other] = persistent
      ? [window.localStorage, window.sessionStorage]
      : [window.sessionStorage, window.localStorage];

    try {
      other.removeItem(TOKEN_KEY);
      target.setItem(TOKEN_KEY, token);
    } catch {
      throw new Error('Browser storage is unavailable, so the session could not be saved.');
    }
  },

  /**
   * Returns the token or `null`. A storage failure here is deliberately not
   * thrown: an unreadable store is indistinguishable from no stored session, and
   * "you are signed out" is the correct, safe interpretation of both.
   */
  read() {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /** Signing out must never fail, so this swallows storage errors by design. */
  clear() {
    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* Nothing useful to do, and nothing to tell the user. */
    }
  },

  /** True when the stored session is the one that survives a browser restart. */
  isPersistent() {
    try {
      return window.localStorage.getItem(TOKEN_KEY) !== null;
    } catch {
      return false;
    }
  },
};
