import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { CALENDAR_VIEW, selectCalendarView, selectFocusedDateKey } from '../../store/calendarSlice';
import {
  HOUR_SLOTS,
  buildWeekDays,
  formatDayNumber,
  formatHourLabel,
  formatWeekdayShort,
  fromDateKey,
  isToday,
  toDateKey,
} from '../../utils/calendar';
import TimeSlot from './TimeSlot';

/** Scrolled to on mount — the working day, rather than the empty small hours. */
const DEFAULT_VISIBLE_HOUR = 8;
const SLOT_HEIGHT_REM = 3;

/**
 * Week and day views share this grid: a column per day, a row per hour.
 *
 * Day view is not a separate component, it is this one with a single column.
 * The two views differ only in how many days they show, so expressing that as a
 * number rather than as a second implementation keeps the drop behaviour, the
 * scroll position and the layout identical between them by construction.
 *
 * All 24 hours are rendered rather than a "business hours" window. A post
 * scheduled for 11pm has to be visible and draggable, and a grid that silently
 * hides events outside 9–5 would be worse than one you have to scroll.
 */
export default function TimeGrid() {
  const view = useSelector(selectCalendarView);
  const focusedDateKey = useSelector(selectFocusedDateKey);

  const scrollRef = useRef(null);

  const days = useMemo(() => {
    const focused = fromDateKey(focusedDateKey);
    const range = view === CALENDAR_VIEW.DAY ? [focused] : buildWeekDays(focused);

    return range.map((day) => ({
      key: toDateKey(day),
      weekday: formatWeekdayShort(day),
      dayNumber: formatDayNumber(day),
      today: isToday(day),
    }));
  }, [focusedDateKey, view]);

  // Runs once: opening a calendar at midnight and making the user scroll to
  // find their own working day is a small, avoidable insult. Deliberately not
  // re-run when the date changes — that would fight a user who has scrolled.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = DEFAULT_VISIBLE_HOUR * SLOT_HEIGHT_REM * 16;
    }
  }, []);

  const columns = `4rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      {/* The day header sits outside the scroll container so it stays put. */}
      <div className="grid bg-slate-50" style={{ gridTemplateColumns: columns }}>
        <div className="border-r border-b border-slate-200" />
        {days.map((day) => (
          <div
            key={day.key}
            className="border-r border-b border-slate-200 px-2 py-1.5 text-center last:border-r-0"
          >
            <div className="text-[0.6875rem] font-medium text-slate-500">{day.weekday}</div>
            <div
              className={`mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                day.today ? 'bg-slate-900 text-white' : 'text-slate-700'
              }`}
            >
              {day.dayNumber}
            </div>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="max-h-[30rem] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          {HOUR_SLOTS.map((hour) => (
            // A fragment per row rather than a wrapper element: the cells are
            // direct children of one grid, which is what keeps every column
            // aligned across all 24 rows.
            <div key={hour} className="contents">
              <div className="border-r border-b border-slate-200 px-2 py-1 text-right text-[0.625rem] text-slate-400 tabular-nums">
                {formatHourLabel(hour)}
              </div>

              {days.map((day) => (
                <TimeSlot key={`${day.key}-${hour}`} dateKey={day.key} hour={hour} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
