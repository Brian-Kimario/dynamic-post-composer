import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarPlus, Check, Loader2 } from 'lucide-react';
import { schedulePost, selectIsSchedulingPost } from '../../store/scheduleSlice';
import { PERMISSION } from '../../config/permissions';
import { usePermission } from '../../hooks/usePermission';
import {
  addDays,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  withTimeOfDay,
} from '../../utils/calendar';

/** Tomorrow at 9am — a sensible default that is always in the future. */
function defaultSlot() {
  return withTimeOfDay(addDays(new Date(), 1), { hours: 9 });
}

/**
 * How a post gets onto the calendar in the first place.
 *
 * The composer already owns content, platform and validation, so scheduling is
 * one more destination for the same post rather than a second editor. It sits
 * beside Publish because that is the decision being made: send it now, or send
 * it then.
 *
 * The over-limit rule matches publishing exactly — a post that cannot be
 * published cannot be scheduled either, since scheduling is just publishing
 * later. Drafts remain the place where an over-limit post is allowed to live.
 */
export default function ScheduleControl({ content, platformId, canSchedulePost, onScheduled }) {
  const dispatch = useDispatch();

  const isSaving = useSelector(selectIsSchedulingPost);
  const canSchedule = usePermission(PERMISSION.POST_SCHEDULE);

  const [isOpen, setIsOpen] = useState(false);
  const [when, setWhen] = useState(() => toDateTimeLocalValue(defaultSlot()));
  const [justScheduled, setJustScheduled] = useState(false);

  if (!canSchedule) return null;

  const submit = async () => {
    const parsed = fromDateTimeLocalValue(when);
    if (!parsed) return;

    try {
      await dispatch(
        schedulePost({ content, platformId, scheduledFor: parsed.toISOString() }),
      ).unwrap();

      setIsOpen(false);
      setJustScheduled(true);
      setWhen(toDateTimeLocalValue(defaultSlot()));
      onScheduled?.();
    } catch {
      // The slice recorded the message; the calendar renders it.
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setJustScheduled(false);
          setIsOpen(true);
        }}
        disabled={!canSchedulePost}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {justScheduled ? (
          <Check aria-hidden="true" className="size-4 text-emerald-600" />
        ) : (
          <CalendarPlus aria-hidden="true" className="size-4" />
        )}
        {justScheduled ? 'Scheduled' : 'Schedule'}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="schedule-at" className="sr-only">
        Schedule for
      </label>
      <input
        id="schedule-at"
        type="datetime-local"
        value={when}
        onChange={(event) => setWhen(event.target.value)}
        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20"
      />

      <button
        type="button"
        onClick={submit}
        disabled={isSaving}
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSaving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Confirm
      </button>

      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
      >
        Cancel
      </button>
    </div>
  );
}
