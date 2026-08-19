/**
 * Offline self-check for on-device PDF extraction.
 *
 *     node scripts/verify-extraction.mjs
 *
 * A phone is the only place this code really runs, but the awkward parts are
 * host-independent and can be pinned down here:
 *
 *  1. pdf.js boots through its *fake worker* — worker code on the JS thread —
 *     purely because `globalThis.pdfjsWorker` is set, with no `new Worker(...)`
 *     and no runtime URL import. We delete `globalThis.process` before loading
 *     it so pdf.js's `isNodeJS` is false, which is the shape React Native
 *     presents. If the `patches/pdfjs-dist+4.2.67.patch` bootstrap ever stops
 *     working, this throws instead of silently falling back.
 *  2. `src/lib/pdf-lines.ts` turns the positioned fragments back into the lines
 *     the backend expects, including the two-column layout of a statement.
 *  3. A PDF with no text layer yields too little text, which is what makes the
 *     app say "this is a scan" instead of quietly uploading the file.
 *
 * Node natively provides `structuredClone`, `atob` and `TextDecoder`; on the
 * device those come from `src/lib/polyfills.ts`, which is verified separately by
 * `verify-envelope.mjs`.
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadTs } from "./load-ts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PDFJS_DIR = path.join(ROOT, "node_modules/pdfjs-dist/legacy/build");

let failures = 0;
function check(name, condition, detail = "") {
    if (condition) console.log(`  ok   ${name}`);
    else {
        failures++;
        console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    }
}

const importTs = (relativePath) => loadTs(path.join(ROOT, relativePath));

/** Builds a small PDF with a real text layer, laid out in two columns. */
function buildStatementPdf(withText = true) {
    const content = withText
        ? `BT /F1 10 Tf 50 700 Td (01 JUL OXXO SUC 1234) Tj ET
BT /F1 10 Tf 420 700 Td (129.00) Tj ET
BT /F1 10 Tf 50 680 Td (03 JUL SPEI RECIBIDO NOMINA) Tj ET
BT /F1 10 Tf 420 680 Td (18,400.00) Tj ET
BT /F1 10 Tf 50 660 Td (05 JUL CARGO RECURRENTE STREAMING) Tj ET
BT /F1 10 Tf 420 660 Td (199.00) Tj ET
`
        : "";

    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [];
    objects.forEach((body, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return new Uint8Array(Buffer.from(pdf, "latin1"));
}

/**
 * Globals Node has and Hermes / React Native 0.74 does not. Every one of these
 * has to be gone before pdf.js loads, or this script quietly passes while the
 * device fails — which is exactly what happened the first time: Node's built-in
 * `DOMException` hid the crash that core-js causes on a real phone.
 */
const ABSENT_IN_HERMES = [
    "structuredClone",
    "TextDecoder",
    "TextEncoder",
    "DOMException",
    "MessageChannel",
    "MessagePort",
    "Worker",
    "crypto",
    "SharedArrayBuffer",
    "Atomics",
    "ReadableStream",
    "WritableStream",
    "TransformStream",
    "CompressionStream",
    "DecompressionStream",
    "FinalizationRegistry",
    "OffscreenCanvas",
    "ImageData",
    "Path2D",
    "DOMMatrix",
    "document",
];

/**
 * Boots pdf.js exactly the way src/lib/extract.ts does, in an environment cut
 * down to what the phone actually offers, with our own polyfills filling the
 * gaps. Returns the pdf.js namespace plus a restore function.
 */
async function loadPdfjsUnderHermesShape(polyfills) {
    const saved = new Map();
    for (const name of ABSENT_IN_HERMES) {
        if (name in globalThis) {
            saved.set(name, globalThis[name]);
            delete globalThis[name];
        }
    }
    // Hermes has no Promise.withResolvers either; core-js, bundled inside the
    // pdf.js legacy build, is supposed to put it back.
    const savedWithResolvers = Promise.withResolvers;
    delete Promise.withResolvers;

    // ...and now the polyfills the app installs, and only those.
    globalThis.structuredClone = polyfills.structuredClone;
    globalThis.TextDecoder = polyfills.TextDecoder;
    globalThis.DOMException = polyfills.DOMException;
    globalThis.ReadableStream = polyfills.ReadableStream;
    // Hermes ships atob/btoa natively, so the app's versions stay dormant.

    const savedProcess = globalThis.process;
    // pdf.js decides `isNodeJS` from `process + ""`; removing it puts us on the
    // same branch React Native takes.
    delete globalThis.process;

    const restore = () => {
        globalThis.process = savedProcess;
        for (const [name, value] of saved) globalThis[name] = value;
        if (savedWithResolvers) Promise.withResolvers = savedWithResolvers;
    };

    try {
        const worker = await import(pathToFileURL(path.join(PDFJS_DIR, "pdf.worker.mjs")).href);
        globalThis.pdfjsWorker = worker;

        // The patched entry hands us a promise instead of awaiting it at the
        // top level; the named ESM exports of pdf.mjs are undefined by design.
        await import(pathToFileURL(path.join(PDFJS_DIR, "pdf.mjs")).href);
        const pdfjs = await globalThis.pdfjsLibPromise;

        globalThis.process = savedProcess;
        pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
        return { pdfjs, restore, withResolversRestored: typeof Promise.withResolvers === "function" };
    } catch (e) {
        restore();
        throw e;
    }
}

async function textItems(pdfjs, bytes) {
    const task = pdfjs.getDocument({
        data: bytes,
        disableFontFace: true,
        useSystemFonts: false,
        useWorkerFetch: false,
        isEvalSupported: false,
        verbosity: 0,
    });
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const items = content.items;
    page.cleanup();
    await task.destroy();
    return items;
}

console.log("pdf.js bootstrap (Hermes-shaped host, fake worker, no top-level await)");

const { __polyfills } = await importTs("src/lib/polyfills.ts");
const { groupIntoLines, toFragments } = await importTs("src/lib/pdf-lines.ts");

const { pdfjs, restore, withResolversRestored } = await loadPdfjsUnderHermesShape(__polyfills);

check("pdf.js version is the one we pinned", pdfjs.version === "4.2.67", pdfjs.version);
check("worker handler comes from globalThis.pdfjsWorker", typeof globalThis.pdfjsWorker?.WorkerMessageHandler === "function");
check("entry resolved through globalThis.pdfjsLibPromise", typeof pdfjs.getDocument === "function");
check("core-js restored Promise.withResolvers", withResolversRestored);

console.log("text layer");

const items = await textItems(pdfjs, buildStatementPdf(true));
check("pdf.js returned text fragments", items.length > 0, `${items.length} items`);

const fragments = toFragments(items);
check("fragments carry x/y/width", fragments.every((f) => Number.isFinite(f.x) && Number.isFinite(f.y)));

const lines = groupIntoLines(items);
const expected = [
    "01 JUL OXXO SUC 1234 129.00",
    "03 JUL SPEI RECIBIDO NOMINA 18,400.00",
    "05 JUL CARGO RECURRENTE STREAMING 199.00",
];
check("columns land on one line each, top to bottom", JSON.stringify(lines) === JSON.stringify(expected), JSON.stringify(lines));
check("no empty lines", lines.every((l) => l.trim().length > 0));
check("no double spaces", lines.every((l) => !l.includes("  ")));

console.log("scanned PDF (no text layer)");

const emptyLines = groupIntoLines(await textItems(pdfjs, buildStatementPdf(false)));
// 40 = MIN_TEXT_CHARS in src/lib/extract.ts, matching the backend's
// PdfTextExtractor.MIN_TEXT_CHARS.
check("falls under the scanned-PDF threshold", emptyLines.join("\n").length < 40, JSON.stringify(emptyLines));

console.log("Hermes regex support");

/**
 * Hermes implements no Unicode property escapes: building `\p{...}` throws
 * "SyntaxError: Invalid RegExp: Invalid escape". Node does support them, so
 * this script cannot catch such a regex by *running* it — the bundle has to be
 * read as text. pdf.js built `SpecialCharRegExp` out of `\p{Mn}` and `\p{Cf}`
 * at module scope, which meant importing the worker crashed on device the
 * instant a user picked a file, while every check here stayed green.
 *
 * The patch expands those two classes into explicit ranges. That is only safe
 * while the ranges still say exactly what the property escapes said, so the
 * comparison is redone here against Node's own Unicode tables rather than
 * trusted from the day the patch was written.
 */
const workerSource = readFileSync(path.join(PDFJS_DIR, "pdf.worker.mjs"), "utf8");

const specialCharLine = workerSource
    .split("\n")
    .find((line) => line.startsWith("const SpecialCharRegExp = new RegExp("));

check("SpecialCharRegExp is still where the patch left it", specialCharLine !== undefined);

if (specialCharLine) {
    // The pattern is a *string* in the source, so JSON.parse recovers the regex
    // text with its escapes intact.
    const literal = specialCharLine.slice(
        specialCharLine.indexOf('"'),
        specialCharLine.lastIndexOf('", "u");') + 1
    );
    const source = JSON.parse(literal);
    const alternatives = source.split("|");

    check("pattern carries no \\p{...} escape", !source.includes("\\p{"), source.slice(0, 60));
    check("pattern still has three alternatives", alternatives.length === 3);

    // `^(\s)`, `([Mn ranges])`, `([Cf ranges])$` — strip the anchors and the
    // capturing parens to get back the bare character classes.
    const classFor = { Mn: alternatives[1], Cf: alternatives[2] };
    for (const [category, group] of Object.entries(classFor)) {
        const expanded = group.replace(/^\(/, "").replace(/\)\$?$/, "");
        let mismatch = null;
        try {
            const property = new RegExp(`^\\p{${category}}$`, "u");
            const explicit = new RegExp(`^${expanded}$`, "u");
            for (let cp = 0; cp <= 0x10ffff && mismatch === null; cp++) {
                if (cp >= 0xd800 && cp <= 0xdfff) continue; // lone surrogates
                const char = String.fromCodePoint(cp);
                if (property.test(char) !== explicit.test(char)) {
                    mismatch = `U+${cp.toString(16).toUpperCase()}`;
                }
            }
        } catch (error) {
            mismatch = error.message;
        }
        check(
            `expanded class still equals \\p{${category}} on every code point`,
            mismatch === null,
            mismatch ?? ""
        );
    }
}

/**
 * Any *other* `\p{...}` left in the bundle. The one below survives on purpose:
 * it is built inside an XFA method body, so it only throws if an XFA form is
 * parsed — which a bank statement never triggers — and expanding `\p{L}` would
 * add some 50 KB to the patch for a path we do not walk. A new entry appearing
 * here is a real risk and fails the run.
 */
const KNOWN_UNEXPANDED = ['new RegExp("[\\\\p{L}_][\\\\p{L}\\\\d._\\\\p{M}-]*", "u")'];

const liveProperyEscapes = workerSource
    .split("\n")
    .filter((line) => line.includes("\\p{") && !line.trimStart().startsWith("//"))
    .filter((line) => !KNOWN_UNEXPANDED.some((known) => line.includes(known)));

check(
    "no unreviewed \\p{...} left in the worker bundle",
    liveProperyEscapes.length === 0,
    liveProperyEscapes.map((line) => line.trim().slice(0, 80)).join(" / ")
);

restore();

console.log("");
if (failures > 0) {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
}
console.log("OK — pdf.js runs worker-less, and line grouping matches the backend's line shape.");
