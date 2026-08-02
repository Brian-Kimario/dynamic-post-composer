import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectFocusedDateKey } from '../../store/calendarSlice';
import {
  buildMonthGrid,
  formatWeekdayShort,
  fromDateKey,
  isSameMonth,
  toDateKey,
} from '../../utils/calendar';
import MonthDayCell from './MonthDayCell';

/**
 * The month view: six weeks of day cells.
 *
 * The grid is derived from the focused date rather than stored — 42 dates that
 * can be recomputed from one string are the definition of derived state. The
 * `useMemo` is not about the arithmetic being slow (it is not); it keeps the
 * array *identity* stable so the memoized cells below are not handed new props
 * every time an unrelated part of the calendar re-renders.
 */
export default function MonthGrid() {
  const focusedDateKey = useSelector(selectFocusedDateKey);

  const { days, weekdayLabels } = useMemo(() => {
    const focused = fromDateKey(focusedDateKey);
    const grid = buildMonthGrid(focused);

    return {
      days: grid.map((day) => ({
        key: toDateKey(day),
        isCurrentMonth: isSameMonth(day, focused),
      })),
      // Taken from the first week of the grid, so the labels follow the same
      // locale and week-start as the cells themselves rather than a hard-coded
      // list of English day names.
      weekdayLabels: grid.slice(0, 7).map((day) => formatWeekdayShort(day)),
    };
  }, [focusedDateKey]);

  return (
    <div className="overflow-hidden rounded-xl border-t border-l border-slate-200">
      <div className="grid grid-cols-7 bg-slate-50">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="border-r border-b border-slate-200 px-2 py-1.5 text-center text-[0.6875rem] font-medium text-slate-500"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => (
          <MonthDayCell key={day.key} dateKey={day.key} isCurrentMonth={day.isCurrentMonth} />
        ))}
      </div>
    </div>
  );
}
