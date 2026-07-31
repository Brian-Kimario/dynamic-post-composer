/**
 * Mock draft API.
 *
 * Every function is async and returns a Promise, deliberately mirroring the
 * shape a real HTTP client would have. localStorage is synchronous, so the
 * latency is simulated — the point is that the *calling code* is written
 * against an asynchronous contract from day one. When a real backend arrives in
 * a later experiment, only the bodies of these functions change; the hooks and
 * components calling them stay exactly as they are.
 */

const STORAGE_KEY = 'dpc.drafts.v1';

/** Enough delay for loading states to be visible without feeling sluggish. */
const LATENCY_MS = 350;

function delay(ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * localStorage throws rather than returning null in several real situations:
 * Safari private mode, disabled site data, and exceeded quota. Every access is
 * wrapped so those surface as ordinary rejected promises the UI can render,
 * instead of uncaught exceptions.
 */
function readStore() {
  let raw;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error('Browser storage is unavailable, so drafts cannot be loaded.');
  }

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    // Defensive: storage is user-writable and may hold data from an older
    // version of the app, so never assume the shape is correct.
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error('Saved drafts could not be read because the stored data is corrupted.');
  }
}

function writeStore(drafts) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    throw new Error('Drafts could not be saved. Browser storage may be full or unavailable.');
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function fetchDrafts() {
  await delay();
  return readStore();
}

export async function createDraft({ content, platformId }) {
  await delay();

  const now = new Date().toISOString();
  const draft = {
    id: createId(),
    content,
    platformId,
    createdAt: now,
    updatedAt: now,
  };

  writeStore([draft, ...readStore()]);
  return draft;
}

export async function updateDraft(id, changes) {
  await delay();

  const drafts = readStore();
  const index = drafts.findIndex((draft) => draft.id === id);

  if (index === -1) {
    throw new Error('That draft no longer exists.');
  }

  const updated = {
    ...drafts[index],
    ...changes,
    updatedAt: new Date().toISOString(),
  };

  const next = [...drafts];
  next[index] = updated;
  writeStore(next);

  return updated;
}

export async function deleteDraft(id) {
  await delay();

  const drafts = readStore();
  const next = drafts.filter((draft) => draft.id !== id);

  if (next.length === drafts.length) {
    throw new Error('That draft no longer exists.');
  }

  writeStore(next);
  return id;
}
