/**
 * The four periods the command center offers, resolved to concrete ISO dates.
 *
 * Resolved on the client and sent explicitly rather than named to the API: the
 * user's "este mes" is their timezone's month, and a server deciding what
 * "this month" means would be right only by coincidence.
 */

import type { Period } from "./metrics";

export type PeriodId = "month" | "3m" | "6m" | "year";

export const PERIODS: { id: PeriodId; label: string }[] = [
    { id: "month", label: "Este mes" },
    { id: "3m", label: "3 meses" },
    { id: "6m", label: "6 meses" },
    { id: "year", label: "Año" },
];

export const DEFAULT_PERIOD: PeriodId = "month";

export function isPeriodId(value: string | null | undefined): value is PeriodId {
    return PERIODS.some((p) => p.id === value);
}

function iso(d: Date): string {
    // Local-date ISO. `toISOString()` would shift a Mexico City date back a day.
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

/** Inclusive bounds. The end is today, never the end of a month that hasn't
 *  happened — a partial month is honest, a projected one isn't. */
export function resolvePeriod(id: PeriodId, today: Date = new Date()): Period {
    const end = today;
    const start =
        id === "year"
            ? new Date(today.getFullYear(), 0, 1)
            : new Date(
                  today.getFullYear(),
                  today.getMonth() - { month: 0, "3m": 2, "6m": 5 }[id],
                  1
              );
    return { start: iso(start), end: iso(end) };
}

export function periodLabel(id: PeriodId): string {
    return PERIODS.find((p) => p.id === id)?.label ?? "Este mes";
}
