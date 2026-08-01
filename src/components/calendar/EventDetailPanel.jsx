import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { CalendarClock, Loader2, PenLine, Trash2, X } from 'lucide-react';
import { eventDeselected, selectSelectedEventId } from '../../store/calendarSlice';
import {
  reschedulePost,
  selectIsScheduledPostPending,
  selectScheduledPostById,
  unschedulePost,
} from '../../store/scheduleSlice';
import { selectPlatformById } from '../../store/platformsSlice';
import { draftOpened } from '../../store/composerSlice';
import { saveDraft } from '../../store/draftsSlice';
import { PERMISSION } from '../../config/permissions';
import { usePermission } from '../../hooks/usePermission';
import {
  formatDateTime,
  fromDateTimeLocalValue,
  isPast,
  toDateTimeLocalValue,
} from '../../utils/calendar';

/**
 * The typed alternative to dragging. Its own component so that its state can be
 * reset by remounting it, which is what the `key` on the call site does.
 */
function RescheduleField({ initialValue, isPending, onApply }) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
      <label htmlFor="reschedule-at" className="text-xs font-medium text-slate-700">
        Reschedule
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="reschedule-at"
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
        />
        <button
          type="button"
          onClick={() => onApply(value)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <CalendarClock aria-hidden="true" className="size-4" />
          )}
          Move
        </button>
      </div>
      <p className="text-xs text-slate-400">Or drag the event to another day or time slot.</p>
    </div>
  );
}

/**
 * What a click on an event opens: the "view/edit" interaction of the brief.
 *
 * It is a dialog rather than a route, because it annotates the calendar behind
 * it — the user is still looking at their week, with one event expanded. A route
 * would replace that context and make Back the way out of a panel.
 *
 * The reschedule field here is not a lesser alternative to dragging. Native
 * HTML5 drag-and-drop cannot be driven from the keyboard at all, so without a
 * typed date this whole experiment would be mouse-only. Same action, two routes
 * to it, and the field is also the only way to change the *minutes*, which a
 * drop onto an hour slot deliberately rounds away.
 */
export default function EventDetailPanel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const selectedId = useSelector(selectSelectedEventId);
  const post = useSelector((state) =>
    selectedId ? selectScheduledPostById(state, selectedId) : null,
  );
  const platform = useSelector((state) =>
    post ? selectPlatformById(state, post.platformId) : undefined,
  );
  const isPending = useSelector((state) =>
    selectedId ? selectIsScheduledPostPending(state, selectedId) : false,
  );

  const canSchedule = usePermission(PERMISSION.POST_SCHEDULE);
  const canEdit = usePermission(PERMISSION.DRAFT_WRITE);

  const dialogRef = useRef(null);

  // `showModal` rather than an `open` attribute: it is what gives the dialog a
  // focus trap, an inert background and Escape-to-close for free, none of which
  // a hand-rolled overlay gets without real work.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedId && !dialog.open) dialog.showModal();
    if (!selectedId && dialog.open) dialog.close();
  }, [selectedId]);

  const close = () => dispatch(eventDeselected());

  const applyTime = (value) => {
    const parsed = fromDateTimeLocalValue(value);
    if (!parsed || !post) return;

    dispatch(reschedulePost({ id: post.id, scheduledFor: parsed.toISOString() }));
    close();
  };

  /**
   * "Edit content" moves the post back into the composer as a draft and drops it
   * from the schedule. Editing in place would need a second editor with its own
   * validation and platform rules; routing it through the one composer that
   * already has them is both less code and the behaviour a user expects from
   * "edit".
   */
  const editContent = async () => {
    if (!post) return;

    try {
      const draft = await dispatch(
        saveDraft({ content: post.content, platformId: post.platformId }),
      ).unwrap();

      dispatch(unschedulePost(post.id));
      dispatch(draftOpened(draft.id));
      close();
      navigate('/compose');
    } catch {
      // The slice recorded the message; the drafts panel renders it.
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      // A click on the backdrop lands on the dialog element itself, since the
      // content below stops propagation by being a child.
      onClick={(event) => event.target === dialogRef.current && close()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/30"
    >
      {post && platform && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                style={{ backgroundColor: platform.accentColor }}
                className="flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
              >
                {platform.monogram}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">{platform.name}</h2>
                <p className="text-xs text-slate-500">
                  {formatDateTime(new Date(post.scheduledFor))}
                  {isPast(new Date(post.scheduledFor)) && ' — in the past'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-m-1 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <p className="max-h-40 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm break-words whitespace-pre-wrap text-slate-700">
            {post.content}
          </p>

          {post.authorName && (
            <p className="text-xs text-slate-400">Scheduled by {post.authorName}</p>
          )}

          {canSchedule ? (
            /**
             * Keyed on the event's current instant, so a drag that moves this
             * post while the panel is open remounts the field with the new time
             * instead of leaving a stale value in it. Resetting state with a
             * `key` rather than an effect is the same technique `ComposePage`
             * uses to re-seed the composer.
             */
            <RescheduleField
              key={post.scheduledFor}
              initialValue={toDateTimeLocalValue(new Date(post.scheduledFor))}
              isPending={isPending}
              onApply={applyTime}
            />
          ) : (
            <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
              Your role can view the schedule but not change it.
            </p>
          )}

          {(canEdit || canSchedule) && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {canEdit && (
                <button
                  type="button"
                  onClick={editContent}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
                >
                  <PenLine aria-hidden="true" className="size-3.5" />
                  Edit content
                </button>
              )}

              {canSchedule && (
                <button
                  type="button"
                  onClick={() => {
                    dispatch(unschedulePost(post.id));
                    close();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                  Unschedule
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
