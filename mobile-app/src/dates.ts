// Date helpers. The backend works in Africa/Algiers; the app shows times there too.
import { locale, t } from "./i18n";

const TZ = "Africa/Algiers";

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD for a Date in Algiers time. */
export function isoDay(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(d)
    .reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const today = () => isoDay();
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
export function monthKey(day: string) {
  return day.slice(0, 7);
}
export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}

// Dates follow the app language; digits stay Western (0-9) in Arabic too, as in Algeria.
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale(), { timeZone: TZ, numberingSystem: "latn", ...opts });
/** "Thu 22 Oct" from YYYY-MM-DD */
export function dayLabel(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return fmt({ month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, 15)));
}
export const timeLabel = (iso: string) => fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
export const dateTimeLabel = (iso: string) =>
  fmt({ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
export const dayOfIso = (iso: string) => isoDay(new Date(iso));

export function greeting() {
  const h = Number(fmt({ hour: "numeric", hour12: false }).format(new Date()));
  if (h < 12) return t("Good morning");
  if (h < 18) return t("Good afternoon");
  return t("Good evening");
}

/** Days in a month grid, Monday first, padded with nulls. */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** "Thursday 22 October" */
export function longDay(day: string = today()) {
  const [y, m, d] = day.split("-").map(Number);
  return fmt({ weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
/** "Thursday 29 October, 10:00" */
export const longDateTime = (iso: string) =>
  `${fmt({ weekday: "long", day: "numeric", month: "long" }).format(new Date(iso))}, ${timeLabel(iso)}`;
/** "THU 22 OCT, 21:06" */
export const entryStamp = (iso: string) =>
  `${fmt({ weekday: "short", day: "numeric", month: "short" }).format(new Date(iso))}, ${timeLabel(iso)}`.toLocaleUpperCase(locale());
/** Short weekday "Fri" */
export function weekdayShort(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return fmt({ weekday: "short" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
/** One-letter weekday names, Monday first, in the app language ("M T W…", "L M M…", "ن ث ر…"). */
export function weekInitials() {
  return Array.from({ length: 7 }, (_, i) => fmt({ weekday: "narrow" }).format(new Date(Date.UTC(2024, 0, 1 + i, 12))));
}
/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
