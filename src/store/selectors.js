import { createSelector } from '@reduxjs/toolkit';
import { selectAllDrafts } from './draftsSlice';
import { selectAllPosts } from './postsSlice';
import { selectAllPlatforms, selectPlatformEntities } from './platformsSlice';
import { selectPlatformFilter, selectSearchTerm, selectVisibleCount } from './filtersSlice';
import { selectAllScheduledPosts } from './scheduleSlice';
import { countCharacters } from '../utils/postValidation';
import { toDateKey } from '../utils/calendar';

/**
 * Derived state, computed rather than stored.
 *
 * Every selector here is built with `createSelector`, which caches its result
 * and recomputes only when one of its *input* selectors returns something new.
 * The inputs are cheap reads; the expensive work happens in the result function,
 * which is exactly the split memoization is designed for.
 *
 * Two notes on how Reselect 5 (bundled with Redux Toolkit) actually behaves:
 *
 * 1. It memoizes on *reference* equality of the input results. This is why
 *    normalized state matters — the drafts array identity only changes when a
 *    draft actually changes, so an unrelated dispatch does not invalidate the
 *    cache.
 * 2. The default memoizer is `weakMapMemoize`, not the old cache-size-1
 *    `lruMemoize`. Alternating between two argument sets no longer thrashes the
 *    cache, so the same selector can safely serve several components.
 */

/* -------------------------------------------------------------------------- */
/* Filtered and paged drafts                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The search term is normalized in its own tiny selector so the expensive
 * filter below does not recompute when the user types a character that
 * normalizes to the same query — trailing whitespace, or a case change.
 */
const selectNormalizedQuery = createSelector([selectSearchTerm], (term) =>
  term.trim().toLowerCase(),
);

export const selectFilteredDrafts = createSelector(
  [selectAllDrafts, selectPlatformFilter, selectNormalizedQuery],
  (drafts, platformFilter, query) =>
    drafts
      .filter((draft) => platformFilter === 'all' || draft.platformId === platformFilter)
      .filter((draft) => query === '' || draft.content.toLowerCase().includes(query)),
);

/**
 * Rows take ids, not objects, so the list selects ids. Memoizing here matters:
 * `map` would otherwise return a new array on every render and defeat the
 * `useSelector` reference check, re-rendering the panel for no reason.
 */
export const selectVisibleDraftIds = createSelector(
  [selectFilteredDrafts, selectVisibleCount],
  (drafts, visibleCount) => drafts.slice(0, visibleCount).map((draft) => draft.id),
);

export const selectFilteredDraftCount = createSelector(
  [selectFilteredDrafts],
  (drafts) => drafts.length,
);

export const selectHiddenDraftCount = createSelector(
  [selectFilteredDraftCount, selectVisibleCount],
  (total, visibleCount) => Math.max(total - visibleCount, 0),
);

export const selectHasMoreDrafts = createSelector([selectHiddenDraftCount], (hidden) => hidden > 0);

/* -------------------------------------------------------------------------- */
/* Content insights (derived analytics)                                        */
/* -------------------------------------------------------------------------- */

function countByPlatform(items) {
  return items.reduce((counts, item) => {
    counts[item.platformId] = (counts[item.platformId] ?? 0) + 1;
    return counts;
  }, {});
}

const selectDraftCountsByPlatform = createSelector([selectAllDrafts], countByPlatform);
const selectPostCountsByPlatform = createSelector([selectAllPosts], countByPlatform);

/**
 * The clearest case for memoization in this codebase.
 *
 * Deciding whether a draft is over its platform's limit means running
 * `Intl.Segmenter` over its whole body — grapheme segmentation costs roughly
 * 10ms on a maxed-out Facebook post. Without memoization this would run for
 * every draft on every render, including while the user types in the composer.
 * Memoized, it runs once per change to the drafts or platforms slices.
 *
 * It also composes across slices: draft content on one side, platform limits on
 * the other.
 */
export const selectOverLimitDraftCount = createSelector(
  [selectAllDrafts, selectPlatformEntities],
  (drafts, platforms) =>
    drafts.filter((draft) => {
      const platform = platforms[draft.platformId];
      return platform ? countCharacters(draft.content) > platform.characterLimit : false;
    }).length,
);

/**
 * Built from other memoized selectors rather than from raw state. Composition
 * is the point: each layer recomputes only when its own inputs change, so a new
 * published post does not re-run the draft counting.
 */
export const selectPlatformBreakdown = createSelector(
  [selectAllPlatforms, selectDraftCountsByPlatform, selectPostCountsByPlatform],
  (platforms, draftCounts, postCounts) =>
    platforms
      .map((platform) => ({
        id: platform.id,
        name: platform.name,
        accentColor: platform.accentColor,
        monogram: platform.monogram,
        drafts: draftCounts[platform.id] ?? 0,
        posts: postCounts[platform.id] ?? 0,
      }))
      .filter((row) => row.drafts > 0 || row.posts > 0),
);

/* -------------------------------------------------------------------------- */
/* Calendar: mapping posts onto the time axis                                  */
/* -------------------------------------------------------------------------- */

/**
 * Scheduled posts grouped by local day: `{ '2026-08-02': [post, …], … }`.
 *
 * This is the "map structured data to a temporal layout" step, and doing it once
 * in a memoized selector is what keeps the calendar cheap. The alternative —
 * each day cell filtering the full collection for its own date — is O(days ×
 * posts) on every render, 42 passes over the array for a single month view.
 * Grouping once is O(posts), and every cell then does a key lookup.
 *
 * The grouping key comes from `toDateKey`, which reads *local* date components.
 * Grouping by the first ten characters of the stored ISO string would be
 * simpler and wrong: that is the UTC day, so a post scheduled for 11pm would
 * appear on the following day for anyone east of Greenwich.
 */
export const selectScheduledPostsByDay = createSelector([selectAllScheduledPosts], (posts) => {
  const byDay = {};

  for (const post of posts) {
    const key = toDateKey(new Date(post.scheduledFor));
    (byDay[key] ??= []).push(post);
  }

  return byDay;
});

/**
 * The ids for one day, memoized *per day key*.
 *
 * Two things are happening here. Returning ids rather than objects means a cell
 * re-renders only when its set of events changes, not when an event's content is
 * edited — the same reasoning as `selectVisibleDraftIds`. And because Reselect 5
 * memoizes on `weakMapMemoize` by default, this single selector serves all 42
 * cells without the cache thrashing that a cache-size-1 memoizer would cause
 * when called with a different key each time.
 */
export const selectScheduledPostIdsForDay = createSelector(
  [selectScheduledPostsByDay, (_state, dateKey) => dateKey],
  (byDay, dateKey) => (byDay[dateKey] ?? []).map((post) => post.id),
);

/** Events for one day, already ordered by time — used by the week and day grids. */
export const selectScheduledPostsForDay = createSelector(
  [selectScheduledPostsByDay, (_state, dateKey) => dateKey],
  (byDay, dateKey) => byDay[dateKey] ?? [],
);

/**
 * How many posts are planned from now on. A count of *upcoming* work is what a
 * planning view is actually about; total scheduled includes everything already
 * behind you.
 */
export const selectUpcomingScheduledCount = createSelector([selectAllScheduledPosts], (posts) => {
  const now = new Date().toISOString();
  return posts.filter((post) => post.scheduledFor >= now).length;
});

export const selectContentSummary = createSelector(
  [selectAllDrafts, selectAllPosts, selectOverLimitDraftCount],
  (drafts, posts, overLimitCount) => ({
    draftCount: drafts.length,
    postCount: posts.length,
    overLimitCount,
    // Averages are derived too — storing them would mean keeping them in sync.
    averageDraftLength: drafts.length
      ? Math.round(drafts.reduce((total, d) => total + d.content.length, 0) / drafts.length)
      : 0,
  }),
);
