import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Vitest's jsdom environment does not expose `localStorage` or `sessionStorage`,
 * and the whole persistence layer is built on them. This is a minimal in-memory
 * `Storage`: enough for the service layer to read, write and throw the same way.
 */
function createMemoryStorage() {
  const entries = new Map();

  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
    clear: () => entries.clear(),
    key: (index) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
}

for (const name of ['localStorage', 'sessionStorage']) {
  if (!window[name]) {
    Object.defineProperty(window, name, { value: createMemoryStorage(), writable: true });
  }
}

/**
 * jsdom does not implement `<dialog>`'s modal behaviour, so `showModal` and
 * `close` are missing and `EventDetailPanel` would throw on mount. These stubs
 * give the element just enough behaviour to be testable: the flag the component
 * reads, and the `close` event it listens for.
 *
 * Stubbing a missing platform API is legitimate; stubbing away application code
 * would not be. What is lost here is the focus trap and inert backdrop, which
 * are the browser's job and were verified in a real one (`:modal` was true).
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// Each test gets a clean DOM and a clean store of persisted records.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
