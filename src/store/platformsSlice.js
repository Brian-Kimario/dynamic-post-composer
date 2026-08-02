import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { DEFAULT_PLATFORM_ID, PLATFORM_LIST } from '../config/platforms';

/**
 * Platforms are static configuration, but they still go through the store so
 * that every component reads them the same way and the selected platform is
 * available anywhere without prop drilling.
 *
 * `platforms.js` remains the single source of truth for the data itself — this
 * slice only normalizes it into the `{ ids, entities }` shape the rest of the
 * store uses.
 */
const platformsAdapter = createEntityAdapter();

// `setAll` works on plain objects as well as drafts, returning new state, so the
// config can be loaded into the normalized shape before the store is created.
const initialState = platformsAdapter.setAll(
  platformsAdapter.getInitialState({ selectedPlatformId: DEFAULT_PLATFORM_ID }),
  PLATFORM_LIST,
);

const platformsSlice = createSlice({
  name: 'platforms',
  initialState,
  reducers: {
    platformSelected(state, action) {
      state.selectedPlatformId = action.payload;
    },
  },
});

export const { platformSelected } = platformsSlice.actions;

export const {
  selectAll: selectAllPlatforms,
  selectById: selectPlatformById,
  // The raw lookup table. Selectors that need limits for many platforms at once
  // take this rather than calling selectById in a loop.
  selectEntities: selectPlatformEntities,
} = platformsAdapter.getSelectors((state) => state.platforms);

export const selectSelectedPlatformId = (state) => state.platforms.selectedPlatformId;

export const selectSelectedPlatform = (state) =>
  state.platforms.entities[state.platforms.selectedPlatformId];

export default platformsSlice.reducer;
