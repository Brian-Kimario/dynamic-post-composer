import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle, CalendarRange, Loader2, RotateCw, X } from 'lucide-react';
import {
  fetchScheduledPosts,
  scheduleActionErrorDismissed,
  selectScheduleActionError,
  selectScheduleError,
  selectScheduleStatus,
  selectScheduledPostCount,
} from '../store/scheduleSlice';
import { CALENDAR_VIEW, selectCalendarView } from '../store/calendarSlice';
import { selectUpcomingScheduledCount } from '../store/selectors';
import { REQUEST_STATUS } from '../store/draftsSlice';
import CalendarToolbar from '../components/calendar/CalendarToolbar';
import MonthGrid from '../components/calendar/MonthGrid';
import TimeGrid from '../components/calendar/TimeGrid';
import EventDetailPanel from '../components/calendar/EventDetailPanel';

/**
 * The calendar route. Loads its own data and picks a grid; the grids and the
 * detail dialog read everything else from the store themselves.
 */
export default function CalendarPage() {
  const dispatch = useDispatch();

  const view = useSelector(selectCalendarView);
  const status = useSelector(selectScheduleStatus);
  const error = useSelector(selectScheduleError);
  const actionError = useSelector(selectScheduleActionError);
  const totalCount = useSelector(selectScheduledPostCount);
  const upcomingCount = useSelector(selectUpcomingScheduledCount);

  useEffect(() => {
    dispatch(fetchScheduledPosts());
  }, [dispatch]);

  return (
    <section
      aria-label="Content calendar"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarRange aria-hidden="true" className="size-4 text-slate-400" />
          Content calendar
          {status === REQUEST_STATUS.READY && totalCount > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {upcomingCount} upcoming
            </span>
          )}
        </h1>
      </div>

      {/* A refused or failed reschedule leaves the calendar usable — the event
          has already rolled back to where it was — so it is a dismissible
          banner rather than a replacement for the whole view. */}
      {actionError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900"
        >
          <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-red-600" />
          <p className="flex-1">{actionError}</p>
          <button
            type="button"
            onClick={() => dispatch(scheduleActionErrorDismissed())}
            aria-label="Dismiss error"
            className="-m-1 rounded-md p-1 text-red-700 transition hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {status === REQUEST_STATUS.LOADING && (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Loading the schedule…
          </p>
        )}

        {status === REQUEST_STATUS.ERROR && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-4 text-sm text-red-900"
          >
            <p className="flex items-start gap-2.5">
              <AlertCircle aria-hidden="true" className="mt-px size-4 shrink-0 text-red-600" />
              <span className="flex-1">{error}</span>
            </p>
            <button
              type="button"
              onClick={() => dispatch(fetchScheduledPosts())}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <RotateCw aria-hidden="true" className="size-3.5" />
              Try again
            </button>
          </div>
        )}

        {status === REQUEST_STATUS.READY && (
          <>
            <CalendarToolbar />
            {view === CALENDAR_VIEW.MONTH ? <MonthGrid /> : <TimeGrid />}

            {totalCount === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500">
                Nothing scheduled yet. Write a post and choose <strong>Schedule</strong> in the
                composer to place it on the calendar.
              </p>
            )}
          </>
        )}
      </div>

      <EventDetailPanel />
    </section>
  );
}
