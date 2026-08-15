/**
 * A colour per recurring series, drawn from the category taxonomy.
 *
 * The rule is coherence: a series is the same colour here as it is in every
 * chart in the app, because those all colour by category. A private palette
 * would make Netflix teal on the calendar and purple in the stacked columns,
 * and the user would have to learn two legends for one fact.
 *
 * The catch is that several series can share a category — three subscriptions
 * are all "Entretenimiento" — and identical fills would merge them into one
 * unreadable block. So the first series in a category gets the taxonomy colour
 * exactly, and its siblings get the same hue at stepped lightness: still
 * legibly "Entretenimiento", still separable from each other.
 */

import type { RecurringItem } from "@/lib/api";
import { categoryColor, type CategoryInfo } from "@/lib/categories";

/** Past these bounds a hue stops being itself: too dark reads black, too
 *  light disappears into Paper. */
const MIN_L = 26;
const MAX_L = 72;
/** Below this separation two siblings are the same colour to the eye, so the
 *  extras are pushed apart by hue instead. */
const MIN_GAP = 7;

function hexToHsl(hex: string): [number, number, number] | null {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const int = parseInt(m[1], 16);
    const r = ((int >> 16) & 255) / 255;
    const g = ((int >> 8) & 255) / 255;
    const b = (int & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
    const sn = s / 100;
    const ln = l / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = sn * Math.min(ln, 1 - ln);
    const f = (n: number) =>
        Math.round(255 * (ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Lightness values for `count` siblings of one category, first one exactly the
 * taxonomy's.
 *
 * Fixed deltas plus clamping was the obvious version and it was wrong: for a
 * light base like #ec4899, +14 and +26 both hit the ceiling and two different
 * series came out the identical hex. Instead the siblings share out the room
 * that actually exists on each side of the base, so every value is distinct by
 * construction and none needs clamping.
 */
function lightnessRamp(base: number, count: number): number[] {
    if (count <= 1) return [base];
    const out = [base];
    const down = Math.ceil((count - 1) / 2);
    const up = count - 1 - down;
    const downRoom = Math.max(0, base - MIN_L);
    const upRoom = Math.max(0, MAX_L - base);
    for (let j = 1; j <= Math.max(down, up); j++) {
        if (j <= down) out.push(base - (downRoom * j) / (down + 1));
        if (j <= up) out.push(base + (upRoom * j) / (up + 1));
    }
    return out.slice(0, count);
}

/**
 * Build the label -> colour resolver for a set of series.
 *
 * Pass ALL series, not the current selection: assignment is by position within
 * a category, so building it from a filtered list would repaint everything
 * whenever one series is toggled off.
 */
export function buildSeriesColors(
    items: RecurringItem[],
    categories: Map<string, CategoryInfo> | null
): (label: string) => string {
    // Group first: how many siblings a category has decides how far apart
    // they can be spread, so nothing can be assigned until they are counted.
    const groups = new Map<string, string[]>();
    for (const item of items) {
        const key = item.category_id ?? "none";
        const labels = groups.get(key) ?? [];
        if (!labels.includes(item.label)) labels.push(item.label);
        groups.set(key, labels);
    }

    const byLabel = new Map<string, string>();
    for (const [key, labels] of Array.from(groups.entries())) {
        const base = categoryColor(categories, key === "none" ? null : key);
        const hsl = hexToHsl(base);
        if (!hsl) {
            labels.forEach((label) => byLabel.set(label, base));
            continue;
        }
        const [h, s, l] = hsl;
        const ramp = lightnessRamp(l, labels.length);
        // If the family is so crowded that lightness alone stops separating
        // them, lean on hue for the extras — a small rotation still reads as
        // the same category, two identical fills read as one series.
        const crowded = labels.length > 1 && Math.abs(ramp[1] - ramp[0]) < MIN_GAP;
        labels.forEach((label, i) => {
            const hue = crowded ? (h + i * 14) % 360 : h;
            byLabel.set(label, hslToHex(hue, s, ramp[i]));
        });
    }

    return (label: string) => byLabel.get(label) ?? categoryColor(categories, null);
}
