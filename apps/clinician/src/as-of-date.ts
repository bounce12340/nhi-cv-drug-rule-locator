/**
 * The as-of date the price lookup runs against.
 *
 * Formatted from local calendar components, never from `toISOString()`. Taiwan is
 * UTC+8, so between local midnight and 08:00 the UTC date is still yesterday —
 * `toISOString().slice(0, 10)` would hand the clinician the previous day's prices
 * every morning, and only in the morning, which is the kind of bug nobody reports.
 */
export function toIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

export interface AsOfDatePreset {
  readonly key: "today" | "announcement";
  /** ISO date this preset selects. */
  readonly value: string;
}

/**
 * The two dates worth one tap: today, and the day the 2026-09-01 announcement
 * takes effect. Both are offered whatever today is — after the effective date the
 * announcement preset still answers "what does it say now that it is in force".
 */
export function resolveAsOfDatePresets(
  announcementEffectiveFrom: string,
  now: Date = new Date()
): readonly AsOfDatePreset[] {
  return Object.freeze([
    Object.freeze({ key: "today" as const, value: todayIso(now) }),
    Object.freeze({ key: "announcement" as const, value: announcementEffectiveFrom })
  ]);
}

/** True when the date is a well-formed calendar date, matching the engine's own check. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
