import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  buildWeekDays,
  fromDateTimeLocalValue,
  isSameMonth,
  moveToDay,
  toDateKey,
  toDateTimeLocalValue,
  withTimeOfDay,
} from './calendar';

/**
 * The date layer is pure, has no React in it, and is where every subtle
 * calendar bug lives — so it is tested hardest and fastest.
 */
describe('toDateKey', () => {
  it('uses local date components, not the UTC date', () => {
    // 2am local. In any zone ahead of UTC this instant falls on the *previous*
    // UTC day, which is the bug the whole helper exists to prevent.
    const earlyMorning = new Date(2026, 7, 5, 2, 0);

    expect(toDateKey(earlyMorning)).toBe('2026-08-05');
  });

  it('disagrees with the ISO string exactly when the zone offset moves the day', () => {
    const earlyMorning = new Date(2026, 7, 5, 2, 0);
    const utcDay = earlyMorning.toISOString().slice(0, 10);

    // Passes in any zone: either the offset shifts the day and the two differ,
    // or the machine is on UTC and they agree. What must never happen is
    // toDateKey following the UTC day.
    expect(toDateKey(earlyMorning)).toBe('2026-08-05');
    if (earlyMorning.getTimezoneOffset() < 0) {
      expect(utcDay).toBe('2026-08-04');
    }
  });

  it('pads single-digit months and days', () => {
    expect(toDateKey(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(toDateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(toDateKey(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });

  it('lands on the same wall-clock day regardless of a DST shift', () => {
    // Adding 86_400_000ms would land an hour out on a transition day; using
    // setDate keeps the calendar day correct in every zone.
    const start = new Date(2026, 2, 28, 12, 0);
    const result = addDays(start, 1);

    expect(result.getDate()).toBe(29);
    expect(result.getHours()).toBe(12);
  });
});

describe('addMonths', () => {
  it('clamps the day rather than spilling into the next month', () => {
    // Naive setMonth turns 31 January into 3 March.
    expect(toDateKey(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
  });

  it('handles a leap year', () => {
    expect(toDateKey(addMonths(new Date(2028, 0, 31), 1))).toBe('2028-02-29');
  });

  it('steps backwards across a year boundary', () => {
    expect(toDateKey(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-15');
  });
});

describe('buildMonthGrid', () => {
  const grid = buildMonthGrid(new Date(2026, 7, 15));

  it('always returns six full weeks, so the layout never jumps between months', () => {
    expect(grid).toHaveLength(42);
    expect(buildMonthGrid(new Date(2026, 1, 1))).toHaveLength(42);
  });

  it('starts on a Sunday and runs consecutively', () => {
    expect(grid[0].getDay()).toBe(0);

    for (let index = 1; index < grid.length; index += 1) {
      expect(toDateKey(grid[index])).toBe(toDateKey(addDays(grid[index - 1], 1)));
    }
  });

  it('contains every day of the target month', () => {
    const inMonth = grid.filter((day) => isSameMonth(day, new Date(2026, 7, 1)));
    expect(inMonth).toHaveLength(31);
  });
});

describe('buildWeekDays', () => {
  it('returns seven days beginning on Sunday', () => {
    const week = buildWeekDays(new Date(2026, 7, 5));

    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(0);
    expect(toDateKey(week[0])).toBe('2026-08-02');
    expect(toDateKey(week[6])).toBe('2026-08-08');
  });
});

describe('withTimeOfDay and moveToDay', () => {
  it('sets an hour and zeroes everything below it — a time-slot drop', () => {
    const result = withTimeOfDay(new Date(2026, 7, 5, 13, 47, 30), { hours: 16 });

    expect(result.getHours()).toBe(16);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('keeps the time of day when moving to another day — a month-cell drop', () => {
    const original = new Date(2026, 7, 2, 14, 30);
    const result = moveToDay(original, new Date(2026, 7, 12));

    expect(toDateKey(result)).toBe('2026-08-12');
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});

describe('datetime-local round trip', () => {
  it('formats and reparses as local wall-clock time', () => {
    const instant = new Date(2026, 7, 5, 2, 0);
    const value = toDateTimeLocalValue(instant);

    expect(value).toBe('2026-08-05T02:00');
    expect(fromDateTimeLocalValue(value).getTime()).toBe(instant.getTime());
  });

  it('returns null for an unparseable value rather than an Invalid Date', () => {
    expect(fromDateTimeLocalValue('')).toBeNull();
    expect(fromDateTimeLocalValue('not a date')).toBeNull();
  });
});
