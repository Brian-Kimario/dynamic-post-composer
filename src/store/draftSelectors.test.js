import { describe, expect, it } from 'vitest';
import {
  selectContentSummary,
  selectFilteredDrafts,
  selectHasMoreDrafts,
  selectHiddenDraftCount,
  selectOverLimitDraftCount,
  selectPlatformBreakdown,
  selectVisibleDraftIds,
} from './selectors';
import { DRAFT_PAGE_SIZE } from './filtersSlice';
import { PLATFORM_LIST, DEFAULT_PLATFORM_ID } from '../config/platforms';

const drafts = [
  { id: 'd1', content: 'Redux Toolkit owns the drafts now', platformId: 'linkedin' },
  { id: 'd2', content: 'Shipping platform validation', platformId: 'x' },
  { id: 'd3', content: 'a'.repeat(500), platformId: 'x' }, // over X's 280 limit
];

const posts = [{ id: 'p1', content: 'Announcing the composer', platformId: 'instagram' }];

function stateWith({
  searchTerm = '',
  platformFilter = 'all',
  visibleCount = DRAFT_PAGE_SIZE,
} = {}) {
  return {
    drafts: {
      ids: drafts.map((d) => d.id),
      entities: Object.fromEntries(drafts.map((d) => [d.id, d])),
    },
    posts: {
      ids: posts.map((p) => p.id),
      entities: Object.fromEntries(posts.map((p) => [p.id, p])),
    },
    platforms: {
      ids: PLATFORM_LIST.map((p) => p.id),
      entities: Object.fromEntries(PLATFORM_LIST.map((p) => [p.id, p])),
      selectedPlatformId: DEFAULT_PLATFORM_ID,
    },
    filters: { searchTerm, platformFilter, visibleCount },
  };
}

/**
 * The derived-state pipeline from Experiment 1.2.2, which had been verified by
 * hand but never pinned by a test. Every value here is computed rather than
 * stored, so these assertions are what stop a refactor from quietly changing
 * what the panels display.
 */
describe('drafts filtering pipeline', () => {
  it('returns everything when no filter is applied', () => {
    expect(selectFilteredDrafts(stateWith())).toHaveLength(3);
  });

  it('filters by platform', () => {
    const result = selectFilteredDrafts(stateWith({ platformFilter: 'x' }));
    expect(result.map((d) => d.id)).toEqual(['d2', 'd3']);
  });

  it('searches case-insensitively', () => {
    const result = selectFilteredDrafts(stateWith({ searchTerm: 'REDUX' }));
    expect(result.map((d) => d.id)).toEqual(['d1']);
  });

  it('ignores surrounding whitespace in the search term', () => {
    expect(selectFilteredDrafts(stateWith({ searchTerm: '  shipping  ' }))).toHaveLength(1);
  });

  it('combines search and platform filters', () => {
    const result = selectFilteredDrafts(stateWith({ searchTerm: 'shipping', platformFilter: 'x' }));
    expect(result.map((d) => d.id)).toEqual(['d2']);

    expect(
      selectFilteredDrafts(stateWith({ searchTerm: 'shipping', platformFilter: 'linkedin' })),
    ).toHaveLength(0);
  });
});

describe('paging', () => {
  it('renders only up to the visible count', () => {
    const state = stateWith({ visibleCount: 2 });

    expect(selectVisibleDraftIds(state)).toEqual(['d1', 'd2']);
    expect(selectHasMoreDrafts(state)).toBe(true);
    expect(selectHiddenDraftCount(state)).toBe(1);
  });

  it('reports nothing hidden once everything fits', () => {
    const state = stateWith({ visibleCount: 10 });

    expect(selectHasMoreDrafts(state)).toBe(false);
    expect(selectHiddenDraftCount(state)).toBe(0);
  });

  it('returns the same array reference when nothing relevant changed', () => {
    // The memoization that keeps the panel from re-rendering on every dispatch.
    const state = stateWith();
    expect(selectVisibleDraftIds(state)).toBe(selectVisibleDraftIds(state));
  });
});

describe('insights', () => {
  it('counts drafts over their own platform limit', () => {
    // d3 is 500 characters on X (280); the LinkedIn draft is nowhere near its limit.
    expect(selectOverLimitDraftCount(stateWith())).toBe(1);
  });

  it('summarises drafts and posts together', () => {
    const summary = selectContentSummary(stateWith());

    expect(summary.draftCount).toBe(3);
    expect(summary.postCount).toBe(1);
    expect(summary.overLimitCount).toBe(1);
    expect(summary.averageDraftLength).toBeGreaterThan(0);
  });

  it('breaks down by platform and omits platforms with nothing in them', () => {
    const breakdown = selectPlatformBreakdown(stateWith());
    const byId = Object.fromEntries(breakdown.map((row) => [row.id, row]));

    expect(byId.x.drafts).toBe(2);
    expect(byId.linkedin.drafts).toBe(1);
    expect(byId.instagram.posts).toBe(1);
    expect(byId.facebook).toBeUndefined();
  });
});
