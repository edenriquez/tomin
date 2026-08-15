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
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

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

/** Loads a dependency-free TypeScript module from src/ into this Node process. */
async function importTs(relativePath) {
    const source = readFileSync(path.join(ROOT, relativePath), "utf8");
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    });
    return import(`data:text/javascript;base64,${Buffer.from(outputText, "utf8").toString("base64")}`);
}

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

/** Boots pdf.js exactly the way src/lib/extract.ts does. */
async function loadPdfjs() {
    const savedProcess = globalThis.process;
    // pdf.js decides `isNodeJS` from `process + ""`; removing it puts us on the
    // same branch React Native takes.
    delete globalThis.process;
    try {
        const worker = await import(pathToFileURL(path.join(PDFJS_DIR, "pdf.worker.mjs")).href);
        globalThis.pdfjsWorker = worker;
        const pdfjs = await import(pathToFileURL(path.join(PDFJS_DIR, "pdf.mjs")).href);
        pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
        return pdfjs;
    } finally {
        globalThis.process = savedProcess;
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

console.log("pdf.js bootstrap (fake worker, no Worker global)");

const pdfjs = await loadPdfjs();
check("pdf.js version is the one we pinned", pdfjs.version === "4.2.67", pdfjs.version);
check("worker handler comes from globalThis.pdfjsWorker", typeof globalThis.pdfjsWorker?.WorkerMessageHandler === "function");

const { groupIntoLines, toFragments } = await importTs("src/lib/pdf-lines.ts");

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

console.log("");
if (failures > 0) {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
}
console.log("OK — pdf.js runs worker-less, and line grouping matches the backend's line shape.");
