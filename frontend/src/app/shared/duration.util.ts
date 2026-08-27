/**
 * Formats whole minutes as "Hh Mm", e.g. 90 -> "1h 30m", 45 -> "0h 45m", 120 -> "2h 00m".
 * Mirrors backend/src/services/duration.ts formatDuration — duplicated intentionally
 * (see docs/SDD/build-tl-app.plan.md, Open Implementation Note) rather than shared
 * via a workspace package, to avoid build-tooling overhead for a ~4-line function.
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}
