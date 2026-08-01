import { signToken, verifyToken, TokenError, TOKEN_ERROR } from './jwt';

/**
 * The mock authentication server.
 *
 * This module plays the part a backend would play: it is the only place that
 * knows the user directory and the only place that holds the signing secret.
 * Everything else in the app treats a token as an opaque credential it received
 * and can present, which is exactly the relationship real client code has with
 * one.
 *
 * Keeping that boundary visible in the file layout is the point. When a real
 * `/auth/login` endpoint exists, this file is the only one that is deleted —
 * `jwt.js` moves to the server, and the store, the API client and the UI are
 * untouched because none of them ever saw a password or a secret.
 */

/**
 * In a real system this never reaches the browser. It is here because the
 * "server" is here; see the caveat at the top of `jwt.js`.
 */
const SIGNING_SECRET = 'dpc-experiment-1.3.1-demo-secret';

/**
 * Two tokens, two lifetimes — the point of the refresh mechanism.
 *
 * The access token is deliberately short-lived: it travels on every request, so
 * a stolen one should stop working quickly. That would normally mean signing in
 * every two minutes, which is why the refresh token exists — it is presented
 * only to the refresh endpoint, so it is exposed far less often, and it can
 * therefore be trusted for longer.
 *
 * Two minutes is short even by real standards (15 is typical). It is chosen so
 * the renewal is something you can sit and watch happen in the session panel
 * rather than read about.
 */
const ACCESS_TOKEN_TTL_SECONDS = 2 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 60;

/**
 * Distinguishes the two token types. Without it an access token would be
 * accepted at the refresh endpoint and vice versa — a token-substitution
 * weakness, and the reason `typ` is checked rather than assumed.
 */
const TOKEN_TYPE = { ACCESS: 'access', REFRESH: 'refresh' };

const LATENCY_MS = 450;

/**
 * A fixed directory, standing in for a users table.
 *
 * The passwords are plain text and shown on the login screen, because they are
 * demo credentials for a client-side mock — there is no secret to protect. A
 * real service stores a slow password hash (bcrypt, scrypt, Argon2) and never
 * the password, and the comparison happens where the hash lives.
 *
 * `role` is carried into the token now even though nothing reads it yet.
 * Experiment 3.2 turns it into permissions and route guards; issuing it from the
 * start means that experiment changes how the claim is *used*, not how identity
 * is established.
 */
const USER_DIRECTORY = [
  {
    id: 'usr_ava_mitchell',
    email: 'ava@dpc.dev',
    password: 'composer123',
    name: 'Ava Mitchell',
    role: 'admin',
  },
  {
    id: 'usr_noah_reyes',
    email: 'noah@dpc.dev',
    password: 'composer123',
    name: 'Noah Reyes',
    role: 'editor',
  },
  {
    id: 'usr_priya_shah',
    email: 'priya@dpc.dev',
    password: 'composer123',
    name: 'Priya Shah',
    role: 'viewer',
  },
];

/** What the login screen offers as one-click fill. Never includes anything the
 *  directory would keep private beyond the demo password itself. */
export const DEMO_ACCOUNTS = USER_DIRECTORY.map(({ email, password, name, role }) => ({
  email,
  password,
  name,
  role,
}));

function delay() {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

/**
 * Exchanges credentials for a signed token.
 *
 * The failure message is identical for an unknown email and a wrong password.
 * Distinguishing them would turn the login form into an oracle that confirms
 * which addresses have accounts — a standard user-enumeration weakness, and one
 * that costs nothing to avoid.
 */
export async function login({ email, password }) {
  await delay();

  const normalizedEmail = String(email ?? '')
    .trim()
    .toLowerCase();

  const user = USER_DIRECTORY.find((candidate) => candidate.email === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error('Email or password is incorrect.');
  }

  return issueTokenPair(user);
}

/**
 * Mints both tokens for a user.
 *
 * The access token carries the full identity, because every request needs it.
 * The refresh token carries only `sub` — the refresh endpoint looks the user up
 * again, which is what allows a role change to take effect at the next renewal
 * instead of being frozen into a token issued hours earlier.
 */
async function issueTokenPair(user) {
  const [accessToken, refreshToken] = await Promise.all([
    /**
     * Only what a consumer of the token legitimately needs. `sub` is the JWT
     * registered claim for "who this token is about"; the rest are private
     * claims. Nothing sensitive goes in here — the payload is readable by anyone
     * holding the token.
     */
    signToken(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        typ: TOKEN_TYPE.ACCESS,
      },
      { secret: SIGNING_SECRET, expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS },
    ),
    signToken(
      { sub: user.id, typ: TOKEN_TYPE.REFRESH },
      { secret: SIGNING_SECRET, expiresInSeconds: REFRESH_TOKEN_TTL_SECONDS },
    ),
  ]);

  return { accessToken, refreshToken };
}

/**
 * The refresh endpoint: a valid refresh token buys a new pair.
 *
 * Three checks, each closing something specific:
 *
 * 1. The signature and expiry, as for any token.
 * 2. `typ === 'refresh'`, so an access token cannot be replayed here to extend
 *    itself indefinitely — the short access lifetime would mean nothing if the
 *    token could renew itself.
 * 3. The user still exists, which is the moment a deactivated account actually
 *    loses access. Statelessness has a cost, and this is where it is paid: an
 *    already-issued access token stays valid until it expires, so the access
 *    lifetime *is* the revocation window.
 *
 * A new refresh token is issued alongside the access token — rotation. The old
 * one is not revocable here (there is no server to remember it), and the README
 * is explicit that a real implementation stores refresh tokens precisely so it
 * can invalidate the previous one and detect replay.
 */
export async function refreshTokens(refreshToken) {
  await delay();

  const claims = await verifyToken(refreshToken, { secret: SIGNING_SECRET });

  if (claims.typ !== TOKEN_TYPE.REFRESH) {
    throw new Error('That token cannot be used to refresh a session.');
  }

  const user = USER_DIRECTORY.find((candidate) => candidate.id === claims.sub);

  if (!user) {
    throw new Error('That account no longer exists.');
  }

  return issueTokenPair(user);
}

/**
 * Verifies a token and returns its claims, throwing `TokenError` otherwise.
 *
 * This is the server-side half of every authenticated request, and it is the
 * reason JWT is called stateless: the answer to "who is this?" is derived from
 * the token and the secret alone. There is no session table to consult, which is
 * what lets any instance of a service answer the question without shared memory.
 *
 * The `typ` check is the mirror of the one in `refreshTokens`: a refresh token
 * presented as a bearer credential is rejected, so the long-lived token cannot
 * stand in for the short-lived one.
 */
export async function verifyAccessToken(token) {
  const claims = await verifyToken(token, { secret: SIGNING_SECRET });

  if (claims.typ !== TOKEN_TYPE.ACCESS) {
    throw new TokenError(TOKEN_ERROR.INVALID_SIGNATURE, 'Not an access token.');
  }

  return claims;
}

/** The identity shape the rest of the app works with, built from verified claims. */
export function userFromClaims(claims) {
  return {
    id: claims.sub,
    name: claims.name,
    email: claims.email,
    role: claims.role,
  };
}
