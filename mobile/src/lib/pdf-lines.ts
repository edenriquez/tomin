/**
 * Turning pdf.js's positioned text fragments back into reading-order lines.
 *
 * Kept free of any React Native / Expo import on purpose: this is the part of
 * extraction with real logic in it, and this way `scripts/verify-extraction.mjs`
 * can run it under plain Node against a real PDF.
 *
 * The target shape is the one the backend pipeline already parses out of
 * pdfplumber: non-empty lines, single spaces between words, top-to-bottom.
 */

export type TextFragment = {
    str: string;
    /** x of the fragment origin (text matrix e). */
    x: number;
    /** y of the fragment origin (text matrix f). PDF y grows upwards. */
    y: number;
    width: number;
    hasEOL: boolean;
};

/** Vertical slack, in PDF units, for two fragments to count as one line. */
export const LINE_TOLERANCE = 3;
/** Horizontal gap, in PDF units, wide enough to be a word break. */
export const WORD_GAP = 0.6;

/** Narrows pdf.js `TextContent.items` (which also holds marked-content nodes). */
export function toFragments(items: unknown[]): TextFragment[] {
    const fragments: TextFragment[] = [];
    for (const raw of items) {
        const item = raw as Partial<TextFragment> & { transform?: number[] };
        // Marked-content items carry no `str`.
        if (typeof item.str !== "string" || item.str.length === 0) continue;
        const transform = item.transform;
        if (!transform || transform.length < 6) continue;
        fragments.push({
            str: item.str,
            x: transform[4],
            y: transform[5],
            width: typeof item.width === "number" ? item.width : 0,
            hasEOL: Boolean(item.hasEOL),
        });
    }
    return fragments;
}

export function groupIntoLines(items: unknown[]): string[] {
    const fragments = toFragments(items);

    // Strict total order — a tolerance-based comparator would be intransitive
    // and browsers are free to produce garbage for one. The tolerance is
    // applied while bucketing below instead.
    fragments.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: string[] = [];
    let current: TextFragment[] = [];
    let currentY: number | null = null;

    const flush = () => {
        if (current.length === 0) return;
        const text = joinFragments(current).replace(/\s+/g, " ").trim();
        if (text.length > 0) lines.push(text);
        current = [];
    };

    for (const fragment of fragments) {
        if (currentY === null) {
            currentY = fragment.y;
        } else if (Math.abs(fragment.y - currentY) > LINE_TOLERANCE) {
            flush();
            currentY = fragment.y;
        }
        current.push(fragment);
        if (fragment.hasEOL) {
            flush();
            currentY = null;
        }
    }
    flush();
    return lines;
}

/**
 * Joins one line's fragments left to right, inserting a space wherever the
 * horizontal gap says the glyphs are not touching. pdf.js already emits
 * synthetic space fragments for wide column gaps, so this mostly guards against
 * the cases where it does not.
 */
export function joinFragments(fragments: TextFragment[]): string {
    const ordered = [...fragments].sort((a, b) => a.x - b.x);
    let out = "";
    let previousEnd: number | null = null;
    for (const fragment of ordered) {
        if (previousEnd !== null && fragment.x - previousEnd > WORD_GAP && !out.endsWith(" ")) {
            out += " ";
        }
        out += fragment.str;
        previousEnd = fragment.x + fragment.width;
    }
    return out;
}
