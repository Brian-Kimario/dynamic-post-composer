import { createLocalCollectionApi } from './localCollection';

export const draftsApi = createLocalCollectionApi({
  storageKey: 'dpc.drafts.v1',
  label: 'drafts',
});
