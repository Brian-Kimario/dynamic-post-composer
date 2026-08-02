import { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { selectIsScheduledPostPending, selectScheduledPostById } from '../../store/scheduleSlice';
import { selectPlatformById } from '../../store/platformsSlice';
import { dragEnded, dragStarted, eventSelected } from '../../store/calendarSlice';
import { PERMISSION } from '../../config/permissions';
import { usePermission } from '../../hooks/usePermission';
import { formatTime } from '../../utils/calendar';
import { buildExcerpt } from '../../utils/draftFormatting';

/** The MIME-ish key the drop targets read the dragged id back out of. */
export const DRAG_TYPE = 'application/x-dpc-scheduled-post';

/**
 * One event on the calendar. Takes an id and reads its own entity, the same
 * normalized-store pattern as `DraftListItem` — so dragging one event does not
 * re-render the other forty.
 *
 * It is a `<button>` rather than a `<div>` with an onClick: the click opens the
 * detail panel, and that is a real control which must be reachable by keyboard
 * and announced as such. Native HTML5 drag-and-drop is *not* keyboard
 * accessible, which is why the panel it opens also offers a date/time field —
 * dragging is the fast path, not the only path.
 */
function ScheduledPostChip({ postId, showTime = true }) {
  const dispatch = useDispatch();

  const post = useSelector((state) => selectScheduledPostById(state, postId));
  const isPending = useSelector((state) => selectIsScheduledPostPending(state, postId));
  const platform = useSelector((state) =>
    post ? selectPlatformById(state, post.platformId) : undefined,
  );

  const canSchedule = usePermission(PERMISSION.POST_SCHEDULE);

  // An unscheduled event leaves the store before this unmounts.
  if (!post || !platform) return null;

  const scheduledAt = new Date(post.scheduledFor);

  const handleDragStart = (event) => {
    // `setData` is what makes this a real drag rather than a mouse-move
    // simulation: the payload survives into the drop handler, and the browser
    // supplies the drag image, the cursor and the escape-to-cancel behaviour.
    event.dataTransfer.setData(DRAG_TYPE, postId);
    event.dataTransfer.effectAllowed = 'move';
    dispatch(dragStarted(postId));
  };

  return (
    <button
      type="button"
      draggable={canSchedule && !isPending}
      onDragStart={handleDragStart}
      onDragEnd={() => dispatch(dragEnded())}
      onClick={() => dispatch(eventSelected(postId))}
      aria-label={`${platform.name} post scheduled for ${formatTime(scheduledAt)}: ${buildExcerpt(post.content, 40)}`}
      className={`flex w-full items-center gap-1.5 rounded-md border-l-2 bg-white px-1.5 py-1 text-left text-[0.6875rem] leading-tight shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none ${
        canSchedule ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isPending ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: platform.accentColor }}
    >
      {isPending ? (
        <Loader2 aria-hidden="true" className="size-3 shrink-0 animate-spin text-slate-400" />
      ) : (
        <span
          aria-hidden="true"
          style={{ backgroundColor: platform.accentColor }}
          className="flex size-3 shrink-0 items-center justify-center rounded-[3px] text-[7px] font-bold text-white"
        >
          {platform.monogram}
        </span>
      )}

      {showTime && (
        <span className="shrink-0 font-medium text-slate-500 tabular-nums">
          {formatTime(scheduledAt)}
        </span>
      )}

      <span className="truncate text-slate-700">{buildExcerpt(post.content, 60)}</span>
    </button>
  );
}

export default memo(ScheduledPostChip);
