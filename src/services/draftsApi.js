import { createLocalCollectionApi } from './localCollection';
import { PERMISSION } from '../config/permissions';

export const draftsApi = createLocalCollectionApi({
  storageKey: 'dpc.drafts.v1',
  label: 'drafts',
  // Anyone who can see the workspace can read drafts. Writing and discarding
  // them is what separates an editor from a viewer.
  permissions: {
    read: PERMISSION.CONTENT_READ,
    create: PERMISSION.DRAFT_WRITE,
    update: PERMISSION.DRAFT_WRITE,
    remove: PERMISSION.DRAFT_DELETE,
  },
});
