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
    "1m",
    "3m",
    "6m",
    "1y",
    "ytd",
    "all",
] as const;

export type WindowId = (typeof WINDOW_VOCABULARY)[number];

export const WINDOW_LABELS: Record<WindowId, string> = {
    "7d": "7 días",
    "14d": "14 días",
    "1m": "Este mes",
    "3m": "3 meses",
    "6m": "6 meses",
    "1y": "1 año",
    ytd: "Este año",
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

const ROLLING_DAYS: Partial<Record<WindowId, number>> = { "7d": 7, "14d": 14 };
const CALENDAR_MONTHS: Partial<Record<WindowId, number>> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };

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
    if (id === "ytd") {
        return { start: iso(new Date(today.getFullYear(), 0, 1)), end };
    }
    const months = CALENDAR_MONTHS[id] ?? 1;
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
 * Chart grain by window length: short windows read day by day, long ones
 * month by month. The boundary is "1m" — a month of daily points is the
 * pace-of-the-month reading; three months of them is noise.
 */
export function grainFor(id: WindowId): "day" | "month" {
    return id === "7d" || id === "14d" || id === "1m" ? "day" : "month";
}
