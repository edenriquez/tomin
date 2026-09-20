/**
 * A colour per recurring series: the stone ramp, darkest to lightest, ordered
 * by what the series costs.
 *
 * Hue is not the categorical channel in this system — the brand permits one
 * accent, and `chart.neutral` exists precisely for "nominal categories ordered
 * by value". So the biggest charge takes the darkest stone and each smaller
 * one steps lighter. Two things fall out of that for free: the stack reads as
 * one gradient instead of a bag of hues, and weight is legible before a single
 * number is read — the dark mass at the bottom of the column *is* the rent.
 *
 * This replaced colouring by category. The taxonomy's hues were coherent with
 * the rest of the app but said nothing here: three teal subscriptions next to
 * one teal rent made the column's own shape unreadable, and the siblings had
 * to be pulled apart by lightness anyway.
 *
 * Assignment is by rank, so pass ALL series in play rather than the current
 * selection — building it from a filtered list would repaint everything left
 * whenever one row is hidden. Order the chart's input with `sortByWeight` so
 * the stack climbs in the same direction the ramp does.
 */

import { chart } from "@/design/tokens";
import type { RecurringItem } from "@/lib/api";

/** The ramp's stops, dark to light. Sampled, never indexed into directly: a
 *  set of three series should span the whole ramp, not crowd its dark end. */
const STOPS = chart.neutral;

function hexToRgb(hex: string): [number, number, number] {
    const int = parseInt(hex.slice(1), 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function mix(a: string, b: string, t: number): string {
    const [ar, ag, ab] = hexToRgb(a);
    const [br, bg, bb] = hexToRgb(b);
    const ch = (x: number, y: number) =>
        Math.round(x + (y - x) * t)
            .toString(16)
            .padStart(2, "0");
    return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

/**
 * `count` colours spanning the ramp end to end, darkest first. One series
 * takes the darkest stone; the stops themselves come back exactly when the
 * count matches them.
 */
export function rampColors(count: number): string[] {
    if (count <= 1) return [STOPS[0]];
    return Array.from({ length: count }, (_, i) => {
        const pos = (i / (count - 1)) * (STOPS.length - 1);
        const lo = Math.floor(pos);
        const hi = Math.min(lo + 1, STOPS.length - 1);
        return mix(STOPS[lo], STOPS[hi], pos - lo);
    });
}

/** Heaviest first — the order the ramp is handed out in, and the order the
 *  stack should be built in so its gradient runs the same way. */
export function sortByWeight<T extends RecurringItem>(items: T[]): T[] {
    return items
        .slice()
        .sort(
            (a, b) =>
                b.monthly_equivalent - a.monthly_equivalent || a.label.localeCompare(b.label, "es")
        );
}

/** Build the label -> colour resolver for a set of series. */
export function buildSeriesColors(items: RecurringItem[]): (label: string) => string {
    const labels: string[] = [];
    for (const item of sortByWeight(items)) {
        if (!labels.includes(item.label)) labels.push(item.label);
    }
    const ramp = rampColors(labels.length);
    const byLabel = new Map(labels.map((label, i) => [label, ramp[i]]));
    return (label: string) => byLabel.get(label) ?? STOPS[STOPS.length - 1];
}
