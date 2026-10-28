/**
 * Which data layer the app runs against.
 *
 * `VITE_USE_BACKEND=true` (set in `.env.development`) sends every call to the
 * Spring Boot API. Anything else — including the Vitest run, which reads no
 * `.env.development` — keeps the in-browser mock the earlier experiments built,
 * so the component tests never depend on a server being up.
 */
export const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

/** Empty means same-origin, which is what the Vite dev proxy and the nginx gateway both want. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Stored in place of a refresh token: the real one is an HttpOnly cookie JavaScript cannot read. */
export const COOKIE_REFRESH_MARKER = 'http-only-cookie';
