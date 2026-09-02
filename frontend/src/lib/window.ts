/**
 * Time windows — the user-configurable spans every view reads through.
 *
 * Replaces the fixed four-preset `period.ts`. The vocabulary is closed (a
 * settings checkbox per entry); which entries are *enabled*, and which is the
 * default, belong to `lib/settings.ts`.
 *
 * Two API quirks live here and only here, so no caller improvises:
 * - `/api/transactions` treats absent bounds as "all time" → `resolveWindow`
 *   returns optional fields and "all" returns `{}`.
 * - `/api/metrics/query` requires a period object → `windowToPeriod` maps
 *   "all" to a sentinel start no personal ledger predates.
 */

import type { Period } from "./metrics";

export const WINDOW_VOCABULARY = [
    "7d",
    "14d",
    "15d",
    "30d",
    "3m",
    "1y",
    "all",
] as const;

export type WindowId = (typeof WINDOW_VOCABULARY)[number];

export const WINDOW_LABELS: Record<WindowId, string> = {
    "7d": "7 días",
    "14d": "14 días",
    "15d": "15 días",
    "30d": "30 días",
    "3m": "3 meses",
    "1y": "1 año",
    all: "Todo",
};

export function isWindowId(value: string | null | undefined): value is WindowId {
    return WINDOW_VOCABULARY.includes(value as WindowId);
}

/** Both bounds optional; absent = unbounded. Inclusive local-date ISO. */
export type WindowBounds = { start?: string; end?: string };

function iso(d: Date): string {
    // Local-date ISO. `toISOString()` would shift a Mexico City date back a day.
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

const ROLLING_DAYS: Partial<Record<WindowId, number>> = { "7d": 7, "14d": 14, "15d": 15, "30d": 30 };
const CALENDAR_MONTHS: Partial<Record<WindowId, number>> = { "3m": 3, "1y": 12 };

/**
 * Inclusive bounds ending today — a partial month is honest, a projected one
 * isn't. Rolling windows count days ("7d" = today and the 6 before it);
 * month windows start at the first of the earliest calendar month, matching
 * how people read "3 meses" on a statement.
 */
export function resolveWindow(id: WindowId, today: Date = new Date()): WindowBounds {
    if (id === "all") return {};

    const end = iso(today);
    const rolling = ROLLING_DAYS[id];
    if (rolling) {
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (rolling - 1));
        return { start: iso(start), end };
    }
    const months = CALENDAR_MONTHS[id] ?? 3;
    return { start: iso(new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)), end };
}

/** No personal bank history predates this; "all" needs *some* start because
 *  the metrics endpoint requires a period object. */
const ALL_TIME_START = "2000-01-01";

/** The same window as a `Period` for `/api/metrics/query`. */
export function windowToPeriod(id: WindowId, today: Date = new Date()): Period {
    const bounds = resolveWindow(id, today);
    return { start: bounds.start ?? ALL_TIME_START, end: bounds.end ?? iso(today) };
}

/**
 * Chart grain by window length: the rolling day-count windows read day by
 * day, the month windows month by month. Thirty days of daily points is the
 * pace-of-the-month reading; three months of them is noise.
 */
export function grainFor(id: WindowId): "day" | "month" {
    return id in ROLLING_DAYS ? "day" : "month";
}

/* -------------------------------------------------------------------------- */
/* The selection: a preset, or two dates                                       */
/* -------------------------------------------------------------------------- */

/** Inclusive local-date ISO bounds the user typed or dragged. */
export type CustomRange = { start: string; end: string };

/**
 * What the time filter holds. A preset is a *rule* ("the last 30 days") that
 * re-resolves every day; a custom range is two fixed dates. Both are one
 * selection so every view reads through one value, whichever way it was set —
 * a pill, a date picker, or a drag across a chart.
 */
export type TimeWindow =
    | { kind: "preset"; id: WindowId }
    | { kind: "custom"; start: string; end: string };

export function preset(id: WindowId): TimeWindow {
    return { kind: "preset", id };
}

/** Two dates as a selection, whichever order they came in. */
export function custom(a: string, b: string): Extract<TimeWindow, { kind: "custom" }> {
    const [start, end] = a <= b ? [a, b] : [b, a];
    return { kind: "custom", start, end };
}

export function resolveTimeWindow(w: TimeWindow, today: Date = new Date()): WindowBounds {
    return w.kind === "preset" ? resolveWindow(w.id, today) : { start: w.start, end: w.end };
}

export function timeWindowToPeriod(w: TimeWindow, today: Date = new Date()): Period {
    if (w.kind === "preset") return windowToPeriod(w.id, today);
    return { start: w.start, end: w.end };
}

/** Under ~six weeks reads day by day; anything longer, month by month. */
export function grainForWindow(w: TimeWindow): "day" | "month" {
    if (w.kind === "preset") return grainFor(w.id);
    return spanDays(w.start, w.end) <= 45 ? "day" : "month";
}

/** A string that changes exactly when the selection does — for effect deps
 *  and React keys, where an object identity would refetch on every render. */
export function timeWindowKey(w: TimeWindow): string {
    return w.kind === "preset" ? w.id : `${w.start}..${w.end}`;
}

export function isSameTimeWindow(a: TimeWindow, b: TimeWindow): boolean {
    return timeWindowKey(a) === timeWindowKey(b);
}

export function spanDays(startIso: string, endIso: string): number {
    const [sy, sm, sd] = startIso.split("-").map(Number);
    const [ey, em, ed] = endIso.split("-").map(Number);
    const ms = new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime();
    return Math.round(ms / 86_400_000) + 1;
}

/** Local-midnight ms → local-date ISO. The inverse of the charts' `dateToMs`. */
export function msToIso(ms: number): string {
    return iso(new Date(ms));
}

/** "2026-08" → its first and last day, as a selection. */
export function monthsToRange(startKey: string, endKey: string): Extract<TimeWindow, { kind: "custom" }> {
    const [sy, sm] = startKey.split("-").map(Number);
    const [ey, em] = endKey.split("-").map(Number);
    return custom(iso(new Date(sy, sm - 1, 1)), iso(new Date(ey, em, 0)));
}

export function isCustomRange(value: unknown): value is CustomRange {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;
    const day = /^\d{4}-\d{2}-\d{2}$/;
    return (
        typeof v.start === "string" && typeof v.end === "string" &&
        day.test(v.start) && day.test(v.end) && v.start <= v.end
    );
}
