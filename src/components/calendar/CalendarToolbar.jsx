import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  CALENDAR_VIEW,
  periodStepped,
  selectCalendarView,
  selectFocusedDateKey,
  todayFocused,
  viewChanged,
} from '../../store/calendarSlice';
import {
  formatFullDate,
  formatMonthTitle,
  formatWeekTitle,
  fromDateKey,
} from '../../utils/calendar';

const VIEW_OPTIONS = [
  { value: CALENDAR_VIEW.MONTH, label: 'Month' },
  { value: CALENDAR_VIEW.WEEK, label: 'Week' },
  { value: CALENDAR_VIEW.DAY, label: 'Day' },
];

/**
 * Navigation and view switching.
 *
 * The three step buttons are identical because the reducer knows what a step
 * means in each view — the toolbar never branches on the current view to decide
 * how far to move.
 */
export default function CalendarToolbar() {
  const dispatch = useDispatch();

  const view = useSelector(selectCalendarView);
  const focusedDateKey = useSelector(selectFocusedDateKey);

  const focused = fromDateKey(focusedDateKey);

  const title =
    view === CALENDAR_VIEW.MONTH
      ? formatMonthTitle(focused)
      : view === CALENDAR_VIEW.WEEK
        ? formatWeekTitle(focused)
        : formatFullDate(focused);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => dispatch(periodStepped(-1))}
          aria-label={`Previous ${view}`}
          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => dispatch(periodStepped(1))}
          aria-label={`Next ${view}`}
          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => dispatch(todayFocused())}
          className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
        >
          <CalendarDays aria-hidden="true" className="size-3.5" />
          Today
        </button>

        {/* `aria-live` so the heading change is announced after a paging button
            press — otherwise a screen reader user gets no feedback at all. */}
        <h2 aria-live="polite" className="ml-2 text-sm font-semibold text-slate-900">
          {title}
        </h2>
      </div>

      <div
        role="group"
        aria-label="Calendar view"
        className="flex items-center gap-0.5 rounded-lg border border-slate-300 p-0.5"
      >
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => dispatch(viewChanged(option.value))}
            aria-pressed={view === option.value}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none ${
              view === option.value
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
