/**
 * A minimal JWT implementation: sign, decode, verify.
 *
 * Every previous experiment mocked its "backend" with localStorage, and this one
 * follows the same rule — the token is produced here in the browser rather than
 * by a server. What is *not* mocked is the token itself. It is a real
 * `HEADER.PAYLOAD.SIGNATURE` string, base64url-encoded, signed with HMAC-SHA256
 * through the Web Crypto API, and it verifies in any JWT debugger.
 *
 * That distinction matters for the experiment: the three-part structure, the
 * registered claims (`sub`, `iat`, `exp`) and the signature check are the parts
 * worth understanding, and faking them with `JSON.stringify` would have taught
 * none of it.
 *
 * The obvious caveat, stated plainly: a token signed in the browser is signed
 * with a secret the browser can read, so the signature proves nothing against a
 * determined user. It is a faithful model of the mechanism, not a security
 * boundary. Everything here moves to the server when one exists — see
 * `authApi.js`, which is the only module that holds the secret, precisely so
 * that boundary is visible in the file layout.
 *
 * `crypto.subtle` is only exposed in secure contexts, which covers `https://`
 * and `http://localhost` — so Vite's dev server and any real deployment both
 * qualify.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };
const HEADER = { alg: 'HS256', typ: 'JWT' };

/** Reasons a token can be rejected, so callers can branch without string matching. */
export const TOKEN_ERROR = {
  MALFORMED: 'malformed',
  INVALID_SIGNATURE: 'invalid-signature',
  EXPIRED: 'expired',
};

export class TokenError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = 'TokenError';
    this.reason = reason;
  }
}

/* -------------------------------------------------------------------------- */
/* base64url                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * JWT uses base64url, not base64: `+/` become `-_` and the `=` padding is
 * dropped, so a token can travel in a URL or an HTTP header untouched.
 */
function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  // `atob` requires the padding that base64url strips, so put it back.
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

// `TextEncoder` first, so non-ASCII claims (a name with an accent) survive the
// round trip — `btoa` alone throws on anything outside Latin-1.
function encodeJson(value) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

function decodeJson(segment) {
  return JSON.parse(decoder.decode(base64UrlToBytes(segment)));
}

/* -------------------------------------------------------------------------- */
/* Signing and verification                                                    */
/* -------------------------------------------------------------------------- */

function importSigningKey(secret, usages) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), ALGORITHM, false, usages);
}

/**
 * Issues a signed token.
 *
 * `iat` and `exp` are added here rather than accepted from the caller: expiry is
 * a property of the *issuer's* policy, and a token whose lifetime its own bearer
 * could choose would be pointless. Both are seconds since the epoch, not
 * milliseconds — the JWT spec's `NumericDate`, and a common source of bugs when
 * mixed with `Date.now()`.
 */
export async function signToken(claims, { secret, expiresInSeconds }) {
  const issuedAt = Math.floor(Date.now() / 1000);

  const payload = {
    ...claims,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  };

  const signingInput = `${encodeJson(HEADER)}.${encodeJson(payload)}`;
  const key = await importSigningKey(secret, ['sign']);
  const signature = await crypto.subtle.sign(ALGORITHM, key, encoder.encode(signingInput));

  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/**
 * Reads a token *without* checking the signature.
 *
 * Deliberately separate from `verifyToken`, because the difference between them
 * is the whole point of a signature. Decoding is just base64 — anyone holding
 * the token can read its claims, which is why a JWT payload must never carry a
 * secret. Use this only for display; never to decide whether to trust something.
 */
export function decodeToken(token) {
  const segments = String(token ?? '').split('.');

  if (segments.length !== 3) {
    throw new TokenError(TOKEN_ERROR.MALFORMED, 'Token is not a well-formed JWT.');
  }

  try {
    return {
      header: decodeJson(segments[0]),
      payload: decodeJson(segments[1]),
      signature: segments[2],
    };
  } catch {
    throw new TokenError(TOKEN_ERROR.MALFORMED, 'Token segments could not be decoded.');
  }
}

/**
 * The real check: recompute the signature over the received header and payload,
 * then confirm the token has not expired.
 *
 * Order matters. Expiry is read from the payload, and the payload is only
 * trustworthy once the signature has been verified — checking `exp` first would
 * mean trusting a claim that anyone could have edited.
 *
 * `crypto.subtle.verify` is used rather than re-signing and comparing strings,
 * so the comparison is not a `===` an attacker could time.
 */
export async function verifyToken(token, { secret, clockToleranceSeconds = 0 } = {}) {
  const decoded = decodeToken(token);
  const [header, payload, signature] = String(token).split('.');

  if (decoded.header.alg !== HEADER.alg) {
    // Rejecting anything but the expected algorithm is what closes the `alg: none`
    // family of attacks, where a token asks to be validated with no signature.
    throw new TokenError(TOKEN_ERROR.INVALID_SIGNATURE, 'Unsupported token algorithm.');
  }

  const key = await importSigningKey(secret, ['verify']);
  const isAuthentic = await crypto.subtle.verify(
    ALGORITHM,
    key,
    base64UrlToBytes(signature),
    encoder.encode(`${header}.${payload}`),
  );

  if (!isAuthentic) {
    throw new TokenError(TOKEN_ERROR.INVALID_SIGNATURE, 'Token signature does not match.');
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    typeof decoded.payload.exp !== 'number' ||
    decoded.payload.exp + clockToleranceSeconds <= now
  ) {
    throw new TokenError(TOKEN_ERROR.EXPIRED, 'Token has expired.');
  }

  return decoded.payload;
}

/** Milliseconds until `exp`, floored at zero. Used for the session countdown. */
export function millisecondsUntilExpiry(payload) {
  if (!payload || typeof payload.exp !== 'number') return 0;
  return Math.max(payload.exp * 1000 - Date.now(), 0);
}
