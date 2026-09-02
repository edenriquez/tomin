/**
 * Turning ML Kit's positioned text boxes back into printed ticket lines.
 *
 * Kept free of any React Native / Expo import on purpose, exactly like
 * `pdf-lines.ts`: this is the part of receipt reading with real logic in it, so
 * `scripts/verify-receipt-lines.mjs` can run it under plain Node.
 *
 * The problem is specific to tickets. A recognizer returns *boxes*, and on a
 * two-column thermal print the product name and its price are two boxes on the
 * same physical line — often two different blocks, sometimes in the wrong
 * order. Handed to the backend as-is, `LECHE LALA ENT 1L` and `28.50` arrive as
 * separate lines and the reader (whose one rule is "a product line ends in
 * money") sees a product with no price and a price with no product.
 *
 * So boxes are re-joined by vertical position, and the tolerance is relative to
 * the text's own height rather than absolute: a photo taken from 20 cm away has
 * boxes three times taller than one taken from 60, and a fixed pixel threshold
 * would merge every line of the far photo into one.
 */

export type TextBox = {
    text: string;
    /** Top edge, in image pixels. Y grows downwards, unlike PDF space. */
    top: number;
    left: number;
    height: number;
};

/**
 * How much of a line's height two boxes' centres may differ by and still count
 * as the same printed line. Half a line is the natural cut: at more than that
 * the boxes are vertically adjacent rather than side by side.
 */
export const LINE_TOLERANCE_RATIO = 0.5;

export function groupOcrLines(boxes: TextBox[]): string[] {
    const usable = boxes.filter((box) => box.text.trim().length > 0);
    // Strict total order first — a tolerance-based comparator is intransitive
    // and a sort given one is free to produce garbage. The tolerance is applied
    // while bucketing below instead. Same discipline as `pdf-lines.ts`.
    usable.sort((a, b) => a.top - b.top || a.left - b.left);

    const lines: string[] = [];
    let current: TextBox[] = [];

    const flush = () => {
        if (current.length === 0) return;
        const text = current
            .slice()
            .sort((a, b) => a.left - b.left)
            .map((box) => box.text.trim())
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        if (text.length > 0) lines.push(text);
        current = [];
    };

    for (const box of usable) {
        if (current.length === 0) {
            current.push(box);
            continue;
        }
        const anchor = current[0];
        const slack = Math.max(anchor.height, box.height, 1) * LINE_TOLERANCE_RATIO;
        const sameLine = Math.abs(centre(box) - centre(anchor)) <= slack;
        if (!sameLine) flush();
        current.push(box);
    }
    flush();
    return lines;
}

function centre(box: TextBox): number {
    return box.top + box.height / 2;
}

/**
 * Narrows what a recognizer returned into {@link TextBox}es.
 *
 * Written against the shape `@react-native-ml-kit/text-recognition` returns
 * (blocks of lines, each with an optional `frame`), and tolerant of a missing
 * frame: iOS and Android have disagreed about that field across versions, and a
 * line with no geometry is better kept in reading order than dropped. Such a
 * line gets a synthetic position after the last one that had geometry, which
 * preserves order without pretending to know where it sat.
 */
export function toBoxes(result: unknown): TextBox[] {
    const blocks = (result as { blocks?: unknown[] })?.blocks ?? [];
    const boxes: TextBox[] = [];
    let fallbackTop = 0;

    for (const rawBlock of blocks) {
        const block = rawBlock as { lines?: unknown[] };
        for (const rawLine of block.lines ?? []) {
            const line = rawLine as {
                text?: string;
                frame?: { top?: number; left?: number; height?: number };
            };
            if (typeof line.text !== "string" || line.text.trim().length === 0) continue;
            const frame = line.frame;
            const height = numberOr(frame?.height, 12);
            const top = numberOr(frame?.top, fallbackTop);
            boxes.push({ text: line.text, top, left: numberOr(frame?.left, 0), height });
            fallbackTop = top + height;
        }
    }
    return boxes;
}

function numberOr(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
