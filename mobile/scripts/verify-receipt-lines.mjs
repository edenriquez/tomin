/**
 * Offline self-check for grouping a photographed ticket back into lines.
 *
 *     node scripts/verify-receipt-lines.mjs
 *
 * The recognizer itself is native and only runs on a device, but the part with
 * the actual logic in it — turning its positioned boxes back into printed lines
 * — is host-independent, and it is the part the whole feature rests on: the
 * backend's reader has exactly one rule ("a product line ends in money"), so a
 * name and its price arriving as two separate lines breaks every basket.
 *
 * Three properties are pinned here:
 *
 *  1. Two boxes side by side on the same printed line become one line, even
 *     when the recognizer reported them in different blocks and out of order.
 *  2. The tolerance scales with text height, so a photo taken up close (tall
 *     boxes, wide gaps) does not collapse into a single line.
 *  3. A line the recognizer gave no geometry for keeps its reading order
 *     instead of being dropped or floated to the top.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadTs } from "./load-ts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(name, condition, detail = "") {
    if (condition) console.log(`  ok   ${name}`);
    else {
        failures++;
        console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    }
}

const { groupOcrLines, toBoxes } = await loadTs(path.join(ROOT, "src/lib/receipt-lines.ts"));

/** A two-column ticket, as a recognizer tends to report it: names in one
 *  block, prices in another, top-to-bottom within each. */
const twoColumn = {
    blocks: [
        {
            lines: [
                { text: "LECHE LALA ENT 1L", frame: { top: 100, left: 20, height: 18 } },
                { text: "COCA COLA 600ML", frame: { top: 130, left: 20, height: 18 } },
                { text: "TOTAL", frame: { top: 160, left: 20, height: 18 } },
            ],
        },
        {
            lines: [
                { text: "28.50", frame: { top: 101, left: 240, height: 17 } },
                { text: "20.00", frame: { top: 131, left: 240, height: 17 } },
                { text: "48.50", frame: { top: 161, left: 240, height: 17 } },
            ],
        },
    ],
};

console.log("receipt lines");
const lines = groupOcrLines(toBoxes(twoColumn));
check("name and price on one line", lines[0] === "LECHE LALA ENT 1L 28.50", lines[0]);
check("reading order is top to bottom", lines.length === 3 && lines[2] === "TOTAL 48.50", lines.join(" | "));

// Close-up photo: same layout, three times the scale. Rows are 90px apart and
// boxes are 54px tall — an absolute tolerance tuned for the small photo would
// merge them.
const closeUp = {
    blocks: [
        {
            lines: [
                { text: "PAN BIMBO", frame: { top: 300, left: 60, height: 54 } },
                { text: "45.90", frame: { top: 303, left: 720, height: 51 } },
                { text: "JITOMATE", frame: { top: 390, left: 60, height: 54 } },
                { text: "27.20", frame: { top: 393, left: 720, height: 51 } },
            ],
        },
    ],
};
const zoomed = groupOcrLines(toBoxes(closeUp));
check("a close-up photo still has two lines", zoomed.length === 2, zoomed.join(" | "));
check("and they are the right two", zoomed[0] === "PAN BIMBO 45.90", zoomed[0]);

// A recognizer that reported no frame for one line: it must stay where it was,
// not vanish and not jump to the top.
const noFrame = {
    blocks: [
        {
            lines: [
                { text: "SORIANA HIPER", frame: { top: 10, left: 0, height: 20 } },
                { text: "LECHE 28.50" },
                { text: "TOTAL 28.50", frame: { top: 90, left: 0, height: 20 } },
            ],
        },
    ],
};
const ordered = groupOcrLines(toBoxes(noFrame));
check("a line with no geometry keeps its place", ordered.join(" | ") === "SORIANA HIPER | LECHE 28.50 | TOTAL 28.50", ordered.join(" | "));

// An empty photo is an empty read, not a crash.
check("nothing recognised is no lines", groupOcrLines(toBoxes({})).length === 0);

if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
}
console.log("\nall checks passed.");
