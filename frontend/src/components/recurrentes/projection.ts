/**
 * What the selected series have cost, month by month, and what they will cost.
 *
 * Two different kinds of number live here and they must not be confused:
 *
 * - **History** is measured. Each past month is the sum of the charges that
 *   actually landed in it.
 * - **Projection** is simulated, charge by charge: step the cadence forward
 *   from `next_expected` and drop `typical_amount` on each landing. This is
 *   deliberately NOT `monthly_equivalent × months` — a rate times a duration
 *   smears an annual charge across twelve months, which answers "what is my
 *   average" when the user asked "what will I pay". An annual renewal in
 *   November either falls inside your six-month horizon or it doesn't, and
 *   the whole point of asking is to find out which.
 *
 * A series whose expected charge is long overdue is treated as ended and is
 * not projected: quietly billing the user for a cancelled subscription is the
 * one error here that compounds.
 *
 * "Overdue" is measured against the END OF THE LEDGER, not against today, and
 * that distinction is the whole difference between this working and not. A
 * user who last uploaded a statement in July has no data for August; judging
 * against today would declare every series cancelled at once and hand back an
 * empty projection. Against the ledger's own last day the question becomes the
 * one that carries evidence: while other charges kept arriving, did THIS one
 * stop? Silence from the whole ledger is a missing statement, not a wave of
 * cancellations.
 */

import type { RecurringItem } from "@/lib/api";
import { parsePeriodKey } from "@/lib/metrics";

/** Nominal cadence in days, for the staleness check only. Calendar stepping
 *  below is what actually places a charge. */
const CADENCE_DAYS: Record<string, number> = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    yearly: 365,
};

const DAY = 86_400_000;

export type MonthKey = string; // "YYYY-MM"

export function monthKeyOf(d: Date): MonthKey {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyToDate(key: MonthKey): Date {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, 1);
}

/** Today at local midnight — the boundary between measured and simulated. */
export function today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function stepForward(d: Date, frequency: string): Date {
    const next = new Date(d);
    switch (frequency) {
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "biweekly":
            next.setDate(next.getDate() + 14);
            break;
        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
            break;
        default:
            // Calendar month, not 30 days: a rent charge on the 5th stays on
            // the 5th instead of drifting to the 4th, then the 3rd.
            next.setMonth(next.getMonth() + 1);
    }
    return next;
}

/** Never call a series dead over a gap shorter than this, however tight its
 *  cadence: a fortnight's silence from a weekly grocery run is a holiday. */
const MIN_SILENCE_DAYS = 21;

/**
 * The last day the ledger has any evidence for — the most recent charge across
 * every series. Staleness is judged against this, so see the note at the top
 * of the file before changing it to `today()`.
 */
export function ledgerEnd(items: RecurringItem[]): Date {
    let latest: Date | null = null;
    for (const item of items) {
        for (const c of item.charges ?? []) {
            const d = parsePeriodKey(c.date);
            if (d && (!latest || d > latest)) latest = d;
        }
    }
    // No charges at all: fall back to today, where nothing can be projected
    // anyway.
    return latest ?? today();
}

/**
 * A series is considered over when its expected charge came and went while the
 * ledger kept recording other charges — more than two cadences (or three
 * weeks, whichever is longer) before the ledger's last day.
 *
 * `asOf` must be the ledger's end, not today. The default is deliberately the
 * cautious one: with no context, assume the data is current.
 */
export function isStale(item: RecurringItem, asOf: Date = today()): boolean {
    const next = parsePeriodKey(item.next_expected);
    if (!next) return true;
    const cadence = CADENCE_DAYS[item.frequency] ?? 30;
    const tolerance = Math.max(2 * cadence, MIN_SILENCE_DAYS);
    return asOf.getTime() - next.getTime() > tolerance * DAY;
}

/**
 * Simulated future charges for one series, from tomorrow through `until`.
 * Returns one entry per landing, so callers can count occurrences as easily
 * as they can sum pesos.
 */
export function futureCharges(
    item: RecurringItem,
    until: Date,
    from: Date = today(),
    /** Ledger end for the staleness test; defaults to `from` for callers that
     *  have no wider context. */
    asOf: Date = from
): { date: Date; amount: number }[] {
    if (isStale(item, asOf)) return [];
    const first = parsePeriodKey(item.next_expected);
    if (!first) return [];

    const out: { date: Date; amount: number }[] = [];
    let cursor = new Date(first);
    // An expected charge that is merely a few days late still counts, and it
    // counts on the day it was expected — not today, which would bunch every
    // overdue series onto the same date.
    let guard = 0;
    while (cursor <= until && guard++ < 500) {
        if (cursor >= from) out.push({ date: new Date(cursor), amount: item.typical_amount });
        cursor = stepForward(cursor, item.frequency);
    }
    return out;
}

export type Timeline = {
    /** Month keys, oldest first, spanning history and horizon. */
    months: MonthKey[];
    /** Index of the first month that contains projected charges. */
    firstFutureIndex: number;
    /** One entry per series, aligned to `months`. */
    series: { item: RecurringItem; values: number[] }[];
    /** The ledger's last day — what staleness was judged against. */
    asOf: Date;
    /** Totals across the selection. */
    totals: {
        /** Measured: what the selection has cost in the shown history. */
        spent: number;
        /** Simulated: the horizon's pesos, and how many charges make it up. */
        projected: number;
        projectedCount: number;
        /** How many of the selected series still contribute. Ended series are
         *  skipped, and a total drawn from 2 of 7 series must say so. */
        activeSeries: number;
        /** Selected series judged ended, and therefore not projected. */
        endedSeries: number;
        /** Simulated over 12 months from today. */
        yearly: number;
        /** Steady-state rate — the sum of monthly equivalents. */
        monthlyRate: number;
    };
};

/**
 * The stacked chart's data and the projection readout, computed together so a
 * bar and the number under it can never disagree.
 */
export function buildTimeline(
    items: RecurringItem[],
    monthsBack: number,
    monthsAhead: number
): Timeline {
    const now = today();
    const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    const horizonEnd = new Date(now.getFullYear(), now.getMonth() + monthsAhead + 1, 0);
    const yearEnd = new Date(now.getFullYear(), now.getMonth() + 12 + 1, 0);

    // Judge "ended" against the data, not the calendar — see the file header.
    const asOf = ledgerEnd(items);

    const months: MonthKey[] = [];
    for (let i = 0; i < monthsBack + monthsAhead; i++) {
        months.push(monthKeyOf(new Date(start.getFullYear(), start.getMonth() + i, 1)));
    }
    const index = new Map(months.map((m, i) => [m, i]));
    const currentMonth = monthKeyOf(now);

    let spent = 0;
    let projected = 0;
    let projectedCount = 0;
    let activeSeries = 0;
    let endedSeries = 0;
    let yearly = 0;
    let monthlyRate = 0;

    const series = items.map((item) => {
        const values = new Array(months.length).fill(0);

        // Measured history.
        for (const c of item.charges ?? []) {
            const d = parsePeriodKey(c.date);
            if (!d) continue;
            const at = index.get(monthKeyOf(d));
            if (at === undefined) continue;
            const amount = Math.abs(c.amount);
            values[at] += amount;
            spent += amount;
        }

        // Simulated horizon. The current month can hold both: charges already
        // made and charges still to come, which is exactly right.
        const upcoming = futureCharges(item, horizonEnd, now, asOf);
        if (upcoming.length) activeSeries += 1;
        else if (isStale(item, asOf)) endedSeries += 1;
        for (const c of upcoming) {
            const at = index.get(monthKeyOf(c.date));
            if (at === undefined) continue;
            values[at] += c.amount;
            projected += c.amount;
            projectedCount += 1;
        }

        for (const c of futureCharges(item, yearEnd, now, asOf)) yearly += c.amount;
        monthlyRate += item.monthly_equivalent;

        return { item, values };
    });

    return {
        months,
        firstFutureIndex: index.get(currentMonth) ?? months.length,
        series,
        totals: {
            spent,
            projected,
            projectedCount,
            activeSeries,
            endedSeries,
            yearly,
            monthlyRate,
        },
        asOf,
    };
}
