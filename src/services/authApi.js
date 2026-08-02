import { signToken, verifyToken } from './jwt';

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
 * Ten minutes. Long enough to work in, short enough that the expiry countdown
 * in the session panel is something you can actually watch happen — which is
 * the part of token lifecycle that is easy to read about and hard to picture.
 */
const TOKEN_TTL_SECONDS = 10 * 60;

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

  /**
   * Only what a consumer of the token legitimately needs. `sub` is the JWT
   * registered claim for "who this token is about"; the rest are private claims.
   * Nothing sensitive goes in here — the payload is readable by anyone holding
   * the token.
   */
  const token = await signToken(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    { secret: SIGNING_SECRET, expiresInSeconds: TOKEN_TTL_SECONDS },
  );

  return { token };
}

/**
 * Verifies a token and returns its claims, throwing `TokenError` otherwise.
 *
 * This is the server-side half of every authenticated request, and it is the
 * reason JWT is called stateless: the answer to "who is this?" is derived from
 * the token and the secret alone. There is no session table to consult, which is
 * what lets any instance of a service answer the question without shared memory.
 */
export function verifyAccessToken(token) {
  return verifyToken(token, { secret: SIGNING_SECRET });
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
