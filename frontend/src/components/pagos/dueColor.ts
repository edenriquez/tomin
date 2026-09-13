/**
 * The colour of a charge that has not landed yet.
 *
 * One ramp, read at a glance: the payment about to be charged is Negative red,
 * the furthest one out is Edge blue darkened until it carries text, and every
 * charge between them sits on the straight line from one to the other. The
 * in-between is a muted mauve-slate rather than a vivid violet — this is a
 * warm-stone desk, not a rainbow — and every stop measures between 5:1 and 7:1
 * on Canvas, so the ramp is legible as text and not only as a dot.
 *
 * Position is by *rank*, not by distance in days: two charges a week apart in a
 * quiet month should read as clearly different, and a single charge six months
 * out should not flatten everything before it into the same red. Charges on the
 * same day share a stop, because they are the same moment.
 *
 * A charge that already landed gets none of this — it is grey, and the grey is
 * the point.
 */

/** Negative — the app's red, already the colour of money leaving. */
const NEAR: [number, number, number] = [168, 50, 42];
/** Edge, darkened to 5.02:1 on Canvas so it can be text and not just a mark. */
const FAR: [number, number, number] = [22, 115, 162];

/** `t` is 0 at the next charge, 1 at the last one on the list. */
export function dueColor(t: number): string {
    const k = Math.min(1, Math.max(0, t));
    const [r, g, b] = NEAR.map((from, i) => Math.round(from + (FAR[i]! - from) * k));
    return `rgb(${r} ${g} ${b})`;
}

/**
 * Stops for a list of charges already in date order: day -> position on the
 * ramp. One day is one stop, so a day with three charges is one colour.
 */
export function dueRamp(isoInOrder: string[]): Map<string, number> {
    const days = Array.from(new Set(isoInOrder));
    const last = days.length - 1;
    return new Map(days.map((iso, i) => [iso, last <= 0 ? 0 : i / last]));
}
