import { createLocalCollectionApi } from './localCollection';
import { PERMISSION } from '../config/permissions';

/**
 * Scheduled posts — the third collection, and the first whose records carry a
 * time other than "when this row was touched".
 *
 * It reuses `createLocalCollectionApi` unchanged. Scheduling needed no new
 * persistence behaviour, only a new permission and a `scheduledFor` field on the
 * record, which is the payoff of having built that factory in 1.1.2 rather than
 * writing the same CRUD twice.
 *
 * Rescheduling maps onto `update`, so a drag-and-drop is a PATCH like any other.
 */
export const scheduleApi = createLocalCollectionApi({
  storageKey: 'dpc.schedule.v1',
  label: 'scheduled posts',
  // A viewer can see the plan but not change it — dragging is the whole
  // interaction of this experiment, so it is the thing the permission gates.
  permissions: {
    read: PERMISSION.CONTENT_READ,
    create: PERMISSION.POST_SCHEDULE,
    update: PERMISSION.POST_SCHEDULE,
    remove: PERMISSION.POST_SCHEDULE,
  },
});
