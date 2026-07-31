import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { postsApi } from '../services/postsApi';
import { REQUEST_STATUS } from './draftsSlice';

/**
 * Published posts. Until now publishing was simulated and the result thrown
 * away; giving posts their own normalized slice means a published post becomes
 * real application data that any component can read.
 */
const postsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.createdAt.localeCompare(a.createdAt),
});

export const fetchPosts = createAsyncThunk('posts/fetchPosts', async () => {
  return postsApi.fetchAll();
});

export const publishPost = createAsyncThunk(
  'posts/publishPost',
  async ({ content, platformId }) => {
    return postsApi.create({ content, platformId });
  },
);

export const deletePost = createAsyncThunk('posts/deletePost', async (id) => {
  return postsApi.remove(id);
});

const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState({
    status: REQUEST_STATUS.LOADING,
    error: null,
    actionError: null,
    isPublishing: false,
    pendingIds: [],
  }),
  reducers: {
    postsActionErrorDismissed(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.status = REQUEST_STATUS.LOADING;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = REQUEST_STATUS.READY;
        postsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = REQUEST_STATUS.ERROR;
        state.error = action.error.message;
      })

      .addCase(publishPost.pending, (state) => {
        state.isPublishing = true;
        state.actionError = null;
      })
      .addCase(publishPost.fulfilled, (state, action) => {
        state.isPublishing = false;
        postsAdapter.addOne(state, action.payload);
      })
      .addCase(publishPost.rejected, (state, action) => {
        state.isPublishing = false;
        state.actionError = action.error.message;
      })

      .addCase(deletePost.pending, (state, action) => {
        state.actionError = null;
        state.pendingIds.push(action.meta.arg);
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        postsAdapter.removeOne(state, action.payload);
        state.pendingIds = state.pendingIds.filter((id) => id !== action.payload);
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.pendingIds = state.pendingIds.filter((id) => id !== action.meta.arg);
        state.actionError = action.error.message;
      });
  },
});

export const { postsActionErrorDismissed } = postsSlice.actions;

export const {
  selectAll: selectAllPosts,
  selectById: selectPostById,
  selectTotal: selectPostCount,
} = postsAdapter.getSelectors((state) => state.posts);

export const selectPostsStatus = (state) => state.posts.status;
export const selectPostsError = (state) => state.posts.error;
export const selectPostsActionError = (state) => state.posts.actionError;
export const selectIsPublishing = (state) => state.posts.isPublishing;
export const selectIsPostPending = (state, id) => state.posts.pendingIds.includes(id);

export default postsSlice.reducer;
