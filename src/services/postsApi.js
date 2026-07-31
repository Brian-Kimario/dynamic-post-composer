import { createLocalCollectionApi } from './localCollection';

export const postsApi = createLocalCollectionApi({
  storageKey: 'dpc.posts.v1',
  label: 'published posts',
});
