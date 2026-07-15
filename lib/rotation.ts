import { differenceInCalendarDays, getDaysInMonth } from "date-fns";

/**
 * HiLow runs two independent rotating focuses per class, on top of the fixed
 * Core/oblicuos block every class always has:
 *  - Lower body focus cycles every 5 days
 *  - Upper body focus cycles every 6 days
 * Since 5 and 6 are coprime, the combined (lower, upper) pair doesn't repeat
 * for 30 days straight.
 */
export const LOWER_CYCLE = [
  "Center Glutes",
  "Isquiotibiales",
  "Outer Glutes",
  "Full Lower",
  "Aductores",
] as const;

export const UPPER_CYCLE = [
  "Hombros",
  "Full Upper",
  "Biceps",
  "Triceps",
  "Pecho",
  "Espalda",
] as const;

export type LowerFocus = (typeof LOWER_CYCLE)[number];
export type UpperFocus = (typeof UPPER_CYCLE)[number];

export interface DayFocus {
  date: Date;
  dayNumber: number;
  lowerFocus: LowerFocus;
  upperFocus: UpperFocus;
}

/**
 * Reference date where the rotation is known to land on
 * Center Glutes (lower) + Hombros (upper) — index 0 of both cycles.
 *
 * IMPORTANT: this must be calibrated against the studio's live rotation board
 * so the app's calendar matches what's physically posted in the studio.
 * Adjust ROTATION_ANCHOR (env var, ISO date) if the schedule drifts.
 */
export function getRotationAnchor(): Date {
  const fromEnv = process.env.ROTATION_ANCHOR;
  if (fromEnv) return new Date(fromEnv + "T00:00:00Z");
  return new Date("2026-01-05T00:00:00Z");
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function getFocusForDate(date: Date, anchor: Date = getRotationAnchor()): {
  lowerFocus: LowerFocus;
  upperFocus: UpperFocus;
} {
  const diff = differenceInCalendarDays(date, anchor);
  const lowerIndex = mod(diff, LOWER_CYCLE.length);
  const upperIndex = mod(diff, UPPER_CYCLE.length);
  return { lowerFocus: LOWER_CYCLE[lowerIndex], upperFocus: UPPER_CYCLE[upperIndex] };
}

export function getMonthFocuses(year: number, month: number, anchor: Date = getRotationAnchor()): DayFocus[] {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const days: DayFocus[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const { lowerFocus, upperFocus } = getFocusForDate(date, anchor);
    days.push({ date, dayNumber: day, lowerFocus, upperFocus });
  }
  return days;
}
