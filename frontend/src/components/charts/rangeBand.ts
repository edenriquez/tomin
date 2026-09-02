import type { RecurringItem } from "@/lib/api";
import { quantile, type Timeline } from "@/components/recurrentes/projection";

export const CHART_ENCODINGS = ["barras", "rango"] as const;
export type ChartEncoding = (typeof CHART_ENCODINGS)[number];

export const CHART_ENCODING_LABELS: Record<ChartEncoding, string> = {
    barras: "Capas",
    rango: "Rango",
};

export type BandSeries = {
    name: string;
    color: string;
    /** Fill behind the line — a lighter sibling of `color`. */
    bandColor: string;
    mid: number[];
    low: number[];
    high: number[];
};

/**
 * One series' envelope from its own charge history: P25–P75 when the
 * amount moves, a point when it doesn't. A month that didn't fire
 * contributes nothing, so the band is about size, not presence.
 */
function itemEnvelope(item: RecurringItem): { lo: number; hi: number } {
    const typical = item.typical_amount;
    const amounts = (item.charges ?? [])
        .map((c) => Math.abs(c.amount))
        .filter((a) => a > 0)
        .sort((a, b) => a - b);
    if (item.amount_stable || amounts.length < 3) {
        return { lo: typical, hi: typical };
    }
    return { lo: quantile(amounts, 0.25), hi: quantile(amounts, 0.75) };
}

/**
 * Monthly load as a median-like total with a band: certain amounts sit on
 * the line, amounts that have moved historically open the band.
 */
export function timelineEnvelope(timeline: Timeline): {
    low: number[];
    mid: number[];
    high: number[];
} {
    const n = timeline.months.length;
    const mid = Array.from({ length: n }, () => 0);
    const low = Array.from({ length: n }, () => 0);
    const high = Array.from({ length: n }, () => 0);

    for (const s of timeline.series) {
        const env = itemEnvelope(s.item);
        const typical = s.item.typical_amount || 1;
        for (let i = 0; i < n; i++) {
            const v = s.values[i] ?? 0;
            mid[i] += v;
            if (v <= 0) continue;
            const scale = v / typical;
            const lo = env.lo * scale;
            const hi = env.hi * scale;
            low[i] += Math.min(lo, v);
            high[i] += Math.max(hi, v);
        }
    }

    for (let i = 0; i < n; i++) {
        low[i] = Math.min(low[i]!, mid[i]!);
        high[i] = Math.max(high[i]!, mid[i]!);
    }

    return { low, mid, high };
}
