import { sendRequest } from './apiClient';

/**
 * Builds a mock async CRUD API over a single localStorage key.
 *
 * Drafts and published posts need identical persistence behaviour, so the
 * behaviour lives here once and is instantiated twice rather than copied. Every
 * method is async and returns a Promise, deliberately mirroring the shape a real
 * HTTP client would have — the calling code is written against an asynchronous
 * contract from day one, so a real backend later replaces only this file.
 *
 * Since Experiment 1.3.1 every method is also an *authenticated* request: it
 * goes through `sendRequest`, which attaches the bearer token and refuses to run
 * the handler unless that token verifies. The delay moved in there with it, so
 * latency is simulated where the round trip conceptually happens.
 */
export function createLocalCollectionApi({ storageKey, label, latencyMs = 350 }) {
  /**
   * localStorage throws rather than returning null in several real situations:
   * Safari private mode, disabled site data, and exceeded quota. Every access is
   * wrapped so those surface as ordinary rejected promises the UI can render.
   */
  function read() {
    let raw;

    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      throw new Error(`Browser storage is unavailable, so ${label} cannot be loaded.`);
    }

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      // Storage is user-writable and may hold data from an older version of the
      // app, so never assume the shape is correct.
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new Error(`Saved ${label} could not be read because the stored data is corrupted.`);
    }
  }

  function write(items) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      throw new Error(`${label} could not be saved. Browser storage may be full or unavailable.`);
    }
  }

  const request = (config, handler) => sendRequest({ latencyMs, ...config }, handler);

  return {
    fetchAll() {
      return request({ method: 'GET', url: `/${label}` }, () => read());
    },

    create(attributes) {
      // The author is taken from the verified token, not from the arguments —
      // the composer has no way to claim a different identity.
      return request({ method: 'POST', url: `/${label}` }, (user) => {
        const now = new Date().toISOString();
        const record = {
          id: createId(),
          ...attributes,
          authorId: user.id,
          authorName: user.name,
          createdAt: now,
          updatedAt: now,
        };

        write([record, ...read()]);
        return record;
      });
    },

    update(id, changes) {
      return request({ method: 'PATCH', url: `/${label}/${id}` }, () => {
        const items = read();
        const index = items.findIndex((item) => item.id === id);

        if (index === -1) {
          throw new Error('That record no longer exists.');
        }

        const updated = { ...items[index], ...changes, updatedAt: new Date().toISOString() };
        const next = [...items];
        next[index] = updated;
        write(next);

        return updated;
      });
    },

    remove(id) {
      return request({ method: 'DELETE', url: `/${label}/${id}` }, () => {
        const items = read();
        const next = items.filter((item) => item.id !== id);

        if (next.length === items.length) {
          throw new Error('That record no longer exists.');
        }

        write(next);
        return id;
      });
    },
  };
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
