import { createLocalCollectionApi } from './localCollection';
import { PERMISSION } from '../config/permissions';

export const postsApi = createLocalCollectionApi({
  storageKey: 'dpc.posts.v1',
  label: 'published posts',
  // Removing something already published is the one destructive act reserved for
  // admins — an editor can publish, but unpublishing is not theirs to do.
  permissions: {
    read: PERMISSION.CONTENT_READ,
    create: PERMISSION.POST_PUBLISH,
    update: PERMISSION.POST_PUBLISH,
    remove: PERMISSION.POST_DELETE,
  },
});
