/**
 * Pure duration logic. No DB, no HTTP — directly unit-tested.
 *
 * Rules (see docs/SDD/build-tl-app.spec.md, Duration rule):
 *  - end > start  -> same-day span, duration = end - start
 *  - end == start -> zero-length, invalid (caller must reject before this runs)
 *  - end < start  -> rolled past midnight, duration = (start -> 24:00) + (00:00 -> end)
 */

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

function toSecondsOfDay(time: string): number {
  const match = TIME_RE.exec(time);
  if (!match) {
    throw new Error(`Invalid time value: ${time}`);
  }
  const [, hh, mm, ss] = match;
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
}

/** Whole minutes between startTime and endTime, applying the rollover rule. Throws on zero-length input. */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = toSecondsOfDay(startTime);
  const end = toSecondsOfDay(endTime);

  if (end === start) {
    throw new Error('Zero-length entry: endTime equals startTime');
  }

  const diffSeconds = end > start ? end - start : (86400 - start) + end;
  return Math.floor(diffSeconds / 60);
}

/** Formats whole minutes as "Hh Mm", e.g. 90 -> "1h 30m", 45 -> "0h 45m", 120 -> "2h 00m". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}
