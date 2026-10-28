import { API_BASE_URL } from '../config';
import { tokenStorage } from '../tokenStorage';

/**
 * Transport for the real backend: the one place that knows the `ApiResponse`
 * envelope, the bearer header, the refresh cookie and what each status means.
 * Feature modules call `request` and get back `data`, or a typed error.
 */

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null, correlationId = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    /** Per-field validation messages from a 400, e.g. `{ content: 'Content is required' }`. */
    this.fieldErrors = fieldErrors;
    /** Matches the `X-Correlation-Id` in the server log for this request. */
    this.correlationId = correlationId;
  }
}

export class UnauthorizedError extends Error {
  constructor(message, { isExpired = true } = {}) {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
    this.isExpired = isExpired;
  }
}

export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

function buildUrl(path, query) {
  const params = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });

  const suffix = params.toString();
  return `${API_BASE_URL}${path}${suffix ? `?${suffix}` : ''}`;
}

function describeFieldErrors(message, fieldErrors) {
  const details = Object.values(fieldErrors ?? {});
  return details.length > 0 ? `${message}: ${details.join('; ')}` : message;
}

/** One HTTP round trip, with no refresh logic: login and refresh themselves use this. */
export async function rawRequest({ method = 'GET', path, query, body, token }) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      // Sends and receives the HttpOnly refresh cookie.
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }

  let envelope = null;

  try {
    envelope = await response.json();
  } catch {
    // A gateway error page or an empty body: fall through to the status mapping.
  }

  if (response.ok) return envelope?.data ?? null;

  const message = envelope?.message ?? `Request failed (${response.status}).`;
  const correlationId = envelope?.correlationId ?? null;

  if (response.status === 401) throw new UnauthorizedError(message);
  if (response.status === 403) {
    throw new ForbiddenError('Your role does not have permission to perform this action.');
  }

  const fieldErrors = envelope?.data && typeof envelope.data === 'object' ? envelope.data : null;

  throw new ApiError(describeFieldErrors(message, fieldErrors), {
    status: response.status,
    fieldErrors,
    correlationId,
  });
}

/* Refresh is single-flight: parallel 401s share one renewal, as in the mock layer. */
let refreshInFlight = null;
let onSessionRefreshed = null;

export function setLiveSessionRefreshHandler(handler) {
  onSessionRefreshed = handler;
}

async function refreshSession() {
  const data = await rawRequest({ method: 'POST', path: '/api/v1/auth/refresh' });
  const tokens = { accessToken: data.accessToken, refreshToken: tokenStorage.readRefreshToken() };

  tokenStorage.replace(tokens);
  onSessionRefreshed?.(tokens);

  return tokens.accessToken;
}

function refreshOnce() {
  refreshInFlight ??= refreshSession().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * An authenticated call: attaches the bearer token and, on a 401, renews the
 * session once and retries. A second 401 means the session is over — the token
 * is discarded and the error reaches the auth slice, which signs the user out.
 */
export async function request(options) {
  try {
    return await rawRequest({ ...options, token: tokenStorage.read() });
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;

    try {
      const token = await refreshOnce();
      return await rawRequest({ ...options, token });
    } catch (retryError) {
      if (retryError instanceof UnauthorizedError) {
        tokenStorage.clear();
        throw new UnauthorizedError('Your session has expired. Sign in again to continue.');
      }
      throw retryError;
    }
  }
}
