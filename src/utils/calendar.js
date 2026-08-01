/**
 * Date arithmetic for the calendar, built on `Date` and `Intl` rather than a
 * library.
 *
 * date-fns or Day.js would be reasonable choices, and the course brief lists a
 * date library as optional. What this calendar actually needs is a dozen
 * operations — add days, find the start of a week, build a month matrix, format
 * a heading — and every one of them is a few lines of `Date` arithmetic. The
 * formatting, which is the part that is genuinely hard, is delegated to `Intl`,
 * which is in the browser already and knows about locales and time zones.
 *
 * Two rules run through this file:
 *
 * 1. **Everything is local time.** A calendar is a human artifact: "Tuesday" is
 *    the user's Tuesday. Scheduled posts are stored as UTC ISO strings — the
 *    right way to store an instant — and converted here for display.
 *
 * 2. **Never derive a day key from `toISOString()`.** It returns UTC, so at 23:00
 *    local in a positive offset the calendar would file a post under tomorrow.
 *    `toDateKey` builds the key from local components instead, which is the whole
 *    reason it exists.
 */

/** Sunday-first, matching the weekday header the grid renders. */
const WEEK_STARTS_ON = 0;

/** Rows in a month grid. Six covers every possible month layout. */
const MONTH_GRID_ROWS = 6;
const DAYS_PER_WEEK = 7;

export const HOURS_IN_DAY = 24;

/* -------------------------------------------------------------------------- */
/* Keys and boundaries                                                         */
/* -------------------------------------------------------------------------- */

/**
 * `YYYY-MM-DD` in **local** time — the identity of a day for grouping purposes.
 *
 * Used as the key of the scheduled-posts-by-day map, so a day cell can look up
 * its own events in O(1) instead of filtering the whole collection.
 */
export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` key back to local midnight. */
export function fromDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfWeek(date) {
  const next = startOfDay(date);
  // `getDay()` is 0–6 from Sunday, so this is a no-op in a Sunday-first week and
  // shifts back by the offset otherwise.
  next.setDate(next.getDate() - ((next.getDay() - WEEK_STARTS_ON + DAYS_PER_WEEK) % DAYS_PER_WEEK));
  return next;
}

export function startOfMonth(date) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

/* -------------------------------------------------------------------------- */
/* Arithmetic                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `setDate` handles month and year rollover, and — importantly — daylight saving
 * transitions, which adding `n * 86400000` milliseconds does not. On the day a
 * clock shifts, that naive arithmetic lands an hour off and eventually skips or
 * repeats a day.
 */
export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/**
 * Clamps the day so that adding a month to 31 January gives the end of February
 * rather than spilling into March, which is what `setMonth` would do on its own.
 */
export function addMonths(date, amount) {
  const next = new Date(date);
  const targetDay = next.getDate();

  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  next.setDate(Math.min(targetDay, daysInMonth(next)));

  return next;
}

/** Day 0 of the following month is the last day of this one. */
function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Combines a day with a time of day — the operation a drag-and-drop reschedule is. */
export function withTimeOfDay(day, { hours, minutes = 0 }) {
  const next = startOfDay(day);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

/** Moves an existing instant to another day, keeping its time of day. */
export function moveToDay(instant, day) {
  return withTimeOfDay(day, { hours: instant.getHours(), minutes: instant.getMinutes() });
}

/* -------------------------------------------------------------------------- */
/* Grids                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The 42 days a month view shows: the month itself, padded with the tail of the
 * previous month and the head of the next so every row is a full week.
 *
 * Fixed at six rows on purpose. A grid that changed height between months would
 * shift the whole page when paging through — and every month fits in six.
 */
export function buildMonthGrid(date) {
  const firstCell = startOfWeek(startOfMonth(date));

  return Array.from({ length: MONTH_GRID_ROWS * DAYS_PER_WEEK }, (_, index) =>
    addDays(firstCell, index),
  );
}

export function buildWeekDays(date) {
  const first = startOfWeek(date);
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(first, index));
}

export const HOUR_SLOTS = Array.from({ length: HOURS_IN_DAY }, (_, hour) => hour);

/* -------------------------------------------------------------------------- */
/* Predicates                                                                  */
/* -------------------------------------------------------------------------- */

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

export function isPast(instant) {
  return instant.getTime() < Date.now();
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Formatters are created once at module scope rather than per render.
 * `Intl.DateTimeFormat` is expensive to construct and cheap to reuse — building
 * one per cell would mean 42 of them on every month render.
 */
const monthTitleFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const weekdayShortFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayNumberFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const hourFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric' });
const fullDateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatMonthTitle = (date) => monthTitleFormat.format(date);
export const formatWeekdayShort = (date) => weekdayShortFormat.format(date);
export const formatDayNumber = (date) => dayNumberFormat.format(date);
export const formatTime = (date) => timeFormat.format(date);
export const formatFullDate = (date) => fullDateFormat.format(date);
export const formatDateTime = (date) => dateTimeFormat.format(date);

export const formatHourLabel = (hour) =>
  hourFormat.format(withTimeOfDay(new Date(), { hours: hour }));

/** A week heading spanning two months or years still has to read correctly. */
export function formatWeekTitle(date) {
  const first = startOfWeek(date);
  const last = addDays(first, DAYS_PER_WEEK - 1);

  if (isSameMonth(first, last)) return formatMonthTitle(first);

  return `${new Intl.DateTimeFormat(undefined, { month: 'short' }).format(first)} – ${monthTitleFormat.format(last)}`;
}

/* -------------------------------------------------------------------------- */
/* Form helpers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `<input type="datetime-local">` speaks local wall-clock time with no zone, so
 * it needs `YYYY-MM-DDTHH:mm` — and `toISOString()` would hand it UTC, silently
 * shifting the value the user sees. Same trap as `toDateKey`, one field along.
 */
export function toDateTimeLocalValue(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${toDateKey(date)}T${hours}:${minutes}`;
}

export function fromDateTimeLocalValue(value) {
  // `new Date('2026-08-02T14:30')` is parsed as local time, which is what the
  // input means. Appending a `Z` here would be the bug this helper prevents.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
