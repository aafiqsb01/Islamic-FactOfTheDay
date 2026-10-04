/** UK calendar-day helpers (Europe/London). No external timezone library. */

export const UK_TIME_ZONE = 'Europe/London';

/**
 * Returns YYYY-MM-DD for the given instant in Europe/London.
 */
export function getUkDateString(date = new Date(), timeZone = UK_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Adds calendar days to a YYYY-MM-DD string (UTC date arithmetic on the civil date).
 */
export function addDaysToDateString(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/**
 * UTC instant corresponding to local midnight for `dateStr` in `timeZone`.
 */
export function zonedMidnightToUtc(dateStr, timeZone = UK_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  let utc = new Date(`${dateStr}T00:00:00.000Z`);
  for (let i = 0; i < 4; i += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(utc)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    const hour = parts.hour === '24' ? 0 : Number(parts.hour);
    const asLocalMs = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second),
    );
    const [year, month, day] = dateStr.split('-').map(Number);
    const desiredLocalMs = Date.UTC(year, month - 1, day, 0, 0, 0);
    utc = new Date(utc.getTime() - (asLocalMs - desiredLocalMs));
  }

  return utc;
}

/**
 * Inclusive-start / exclusive-end UTC ISO bounds for a UK calendar day.
 */
export function getUkDayBoundsUtc(dateStr, timeZone = UK_TIME_ZONE) {
  const start = zonedMidnightToUtc(dateStr, timeZone);
  const end = zonedMidnightToUtc(addDaysToDateString(dateStr, 1), timeZone);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
