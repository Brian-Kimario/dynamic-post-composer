import { createSlice } from '@reduxjs/toolkit';

/** How many drafts are rendered per page. */
export const DRAFT_PAGE_SIZE = 6;

/**
 * View state for the drafts list: search text, platform filter and how many
 * rows are currently rendered.
 *
 * In 1.2.1 these lived in `DraftsPanel` as local state, on the reasoning that
 * nothing else read them. Experiment 1.2.2 changes the trade-off: a
 * `createSelector` can only memoize over the store, so filters kept in
 * component state force the derived list back into a per-instance `useMemo`
 * that nothing else can reuse. Moving them here makes the whole
 * drafts → filtered → paged chain one composable, shared, memoized pipeline.
 *
 * This is still UI state and is deliberately kept out of the data slices.
 */
const filtersSlice = createSlice({
  name: 'filters',
  initialState: {
    searchTerm: '',
    platformFilter: 'all',
    visibleCount: DRAFT_PAGE_SIZE,
  },
  reducers: {
    // Narrowing the list resets paging. Doing it in the reducer means the rule
    // holds for every caller instead of being repeated at each call site.
    searchTermChanged(state, action) {
      state.searchTerm = action.payload;
      state.visibleCount = DRAFT_PAGE_SIZE;
    },
    platformFilterChanged(state, action) {
      state.platformFilter = action.payload;
      state.visibleCount = DRAFT_PAGE_SIZE;
    },
    moreDraftsRequested(state) {
      state.visibleCount += DRAFT_PAGE_SIZE;
    },
  },
});

export const { searchTermChanged, platformFilterChanged, moreDraftsRequested } =
  filtersSlice.actions;

export const selectSearchTerm = (state) => state.filters.searchTerm;
export const selectPlatformFilter = (state) => state.filters.platformFilter;
export const selectVisibleCount = (state) => state.filters.visibleCount;

export default filtersSlice.reducer;
