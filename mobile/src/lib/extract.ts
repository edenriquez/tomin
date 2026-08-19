/**
 * On-device extraction.
 *
 * This is the module that makes the custody promise true: the raw file is read
 * from the phone's own storage, turned into text *here*, and never handed to
 * anyone. Only the result of this module travels — sealed — to the backend
 * (see `secure-transport.ts`).
 *
 * Two inputs are supported, mirroring what the backend pipeline already
 * consumes (`ExtractedDocument`: kind text|xml, lines):
 *
 *   - SAT XML — it is already text; read it and pass it through.
 *   - PDF with a text layer — pdfjs-dist (legacy build) runs on Hermes and
 *     gives us positioned text fragments, which we group back into lines.
 *
 * A scanned PDF has no text layer. We refuse it loudly instead of quietly
 * falling back to uploading the file, because uploading the file is exactly
 * what this phase exists to stop.
 */
import "@/lib/polyfills";

import * as FileSystem from "expo-file-system";
import { sha256 } from "js-sha256";
import naclUtil from "tweetnacl-util";

import { groupIntoLines } from "@/lib/pdf-lines";

/** Mirrors the `ExtractedDocument` the backend pipeline already consumes. */
export type ExtractedPayload = {
    v: 1;
    kind: "text" | "xml";
    filename: string;
    /** Hex SHA-256 of the ORIGINAL file bytes — the backend dedups on this. */
    content_sha256: string;
    lines: string[] | null;
    xml: string | null;
    extracted_at: string;
    /** Traceability of extraction quality, per the custody plan. */
    extractor: string;
};

export type ExtractionErrorCode =
    /** PDF with no usable text layer: needs OCR, which F1 does not ship. */
    | "scanned_pdf"
    /** PDF is encrypted and no password was supplied yet. */
    | "password_required"
    /** A password was supplied and the PDF rejected it. */
    | "password_incorrect"
    /** Neither PDF nor XML. */
    | "unsupported_type"
    /** Extraction stopped responding and was abandoned. */
    | "timed_out"
    /** The file could not be read or parsed at all. */
    | "unreadable";

export class ExtractionError extends Error {
    readonly code: ExtractionErrorCode;

    constructor(code: ExtractionErrorCode, message: string) {
        super(message);
        this.name = "ExtractionError";
        this.code = code;
        Object.setPrototypeOf(this, ExtractionError.prototype);
    }
}

/** Message shown to the user, in the product's voice. */
export function extractionMessage(error: unknown): string {
    if (error instanceof ExtractionError) {
        switch (error.code) {
            case "scanned_pdf":
                return "Este PDF es un escaneo; por ahora súbelo desde la web.";
            case "password_required":
                return "Este PDF pide contraseña.";
            case "password_incorrect":
                return "Esa contraseña no abrió el PDF. Inténtalo de nuevo.";
            case "timed_out":
                return "Este PDF dejó de responder mientras lo leía. No se envió nada.";
            case "unsupported_type":
                return "Solo puedo leer PDF o XML del SAT.";
            default:
                return "No pude leer este archivo en tu teléfono.";
        }
    }
    return `No pude leer este archivo: ${(error as Error).message}`;
}

const PDFJS_VERSION = "4.2.67";
export const EXTRACTOR_ID = `pdfjs-${PDFJS_VERSION}`;

/**
 * Same threshold the backend's pdfplumber extractor uses to decide a PDF needs
 * OCR (`PdfTextExtractor.MIN_TEXT_CHARS`). Keeping the two in step means the
 * phone refuses exactly the files the server would have sent to OCR.
 */
const MIN_TEXT_CHARS = 40;

/**
 * Ceiling on a single extraction.
 *
 * Three separate pdf.js-on-Hermes bugs this month all showed up as a spinner
 * that never stopped rather than an error, because every one of them left a
 * promise that simply never settled. No amount of patching the known cases makes
 * the next unknown one fail honestly, so extraction is bounded here: worst case
 * the user is told it gave up, which is always better than a phone that looks
 * busy forever.
 */
const EXTRACTION_TIMEOUT_MS = 45_000;

/**
 * True when the PDF declares an /Encrypt dictionary, i.e. it needs a password.
 *
 * pdf.js has its own, better-informed answer to this, but it only delivers it by
 * having the worker ask the main thread — a round trip that does not come back
 * on Hermes, so the document hangs instead of reporting that it is encrypted.
 * Sniffing the bytes ourselves lets the app ask for the password *before*
 * pdf.js is involved, and a supplied password is then checked inside the worker
 * with no round trip at all.
 *
 * A false positive costs the user one unnecessary password prompt; a false
 * negative just falls through to pdf.js as before.
 */
function isEncryptedPdf(bytes: Uint8Array): boolean {
    const needle = [0x2f, 0x45, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74]; // "/Encrypt"
    outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (bytes[i + j] !== needle[j]) continue outer;
        }
        return true;
    }
    return false;
}

export async function extractDocument(
    localUri: string,
    filename: string,
    mimeType: string,
    /**
     * Only for encrypted PDFs. It is used to open the document and is never
     * stored, hashed into the payload, or sent anywhere: the sealed envelope
     * carries extracted text, so the password stays on this device by
     * construction.
     */
    password?: string
): Promise<ExtractedPayload> {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = naclUtil.decodeBase64(base64);
    const contentSha256 = sha256(bytes);

    const lower = filename.toLowerCase();
    const isXml = lower.endsWith(".xml") || mimeType.includes("xml");
    const isPdf = lower.endsWith(".pdf") || mimeType.includes("pdf");

    if (isXml) {
        const xml = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        return {
            v: 1,
            kind: "xml",
            filename,
            content_sha256: contentSha256,
            lines: null,
            xml,
            extracted_at: new Date().toISOString(),
            extractor: "device-xml-1",
        };
    }

    if (!isPdf) {
        throw new ExtractionError("unsupported_type", `Unsupported file type: ${filename}`);
    }

    if (!password && isEncryptedPdf(bytes)) {
        throw new ExtractionError("password_required", "PDF declares an /Encrypt dictionary");
    }

    const lines = await extractPdfLines(bytes, password);
    return {
        v: 1,
        kind: "text",
        filename,
        content_sha256: contentSha256,
        lines,
        xml: null,
        extracted_at: new Date().toISOString(),
        extractor: EXTRACTOR_ID,
    };
}

/* -------------------------------------------------------------------------- */
/* pdf.js on Hermes                                                            */
/* -------------------------------------------------------------------------- */

type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Loads pdf.js lazily, with the three adjustments React Native needs. All of
 * them were found by running this on a real device; none show up when the same
 * files are loaded under Node.
 *
 * 1. There is no `Worker`, so pdf.js must fall back to its "fake worker" — the
 *    worker code running on the JS thread behind a `LoopbackPort`. Its normal
 *    fallback path is `await import(GlobalWorkerOptions.workerSrc)`, a runtime
 *    URL import Metro cannot do. Setting `globalThis.pdfjsWorker` to the worker
 *    module makes pdf.js pick the handler straight out of the global instead
 *    (`PDFWorker.#mainThreadWorkerMessageHandler`), and short-circuits the
 *    `new Worker(...)` attempt entirely.
 * 2. Globals Hermes lacks (`structuredClone`, `TextDecoder`, and `DOMException`,
 *    which core-js reaches for while the worker bundle is still loading) are
 *    installed by `@/lib/polyfills`, imported at the top of this file.
 * 3. The pdf.mjs entry ends in a *top-level await*. Metro wraps modules in
 *    ordinary functions, so Hermes reads `await (...)` as a call to a function
 *    named `await`. The patch drops it and leaves the promise on
 *    `globalThis.pdfjsLibPromise` for us to await here.
 *
 * Metro also needs `metro.config.js`'s Node built-in shim to bundle the legacy
 * build at all — see the comment there.
 */
async function loadPdfjs(): Promise<PdfjsModule> {
    if (!pdfjsPromise) {
        pdfjsPromise = (async () => {
            const globals = globalThis as unknown as Record<string, unknown>;

            const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
            globals.pdfjsWorker = worker;

            // Importing pdf.mjs only *starts* the module: its entry is an async
            // webpack module, and the patch (3. above) hands us the promise
            // instead of awaiting it at the top level. The named ESM exports of
            // that file are undefined by construction — the real namespace is
            // what this promise resolves to.
            await import("pdfjs-dist/legacy/build/pdf.mjs");
            const pdfjs = (await globals.pdfjsLibPromise) as PdfjsModule;
            if (!pdfjs?.getDocument) {
                throw new ExtractionError(
                    "unreadable",
                    "pdf.js did not finish loading (globalThis.pdfjsLibPromise)"
                );
            }
            // Never fetched (see 1. above) but pdf.js asserts it is non-empty
            // on some code paths.
            pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
            return pdfjs;
        })();
    }
    return pdfjsPromise;
}

async function extractPdfLines(bytes: Uint8Array, password?: string): Promise<string[]> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abandon = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            // With a password supplied, by far the likeliest reason pdf.js went
            // quiet is that the password is wrong: rejecting one is the same
            // worker -> main thread report that hangs. Saying so is a guess, but
            // it is the useful guess, and the user can just try again.
            reject(
                password
                    ? new ExtractionError(
                          "password_incorrect",
                          `No response ${EXTRACTION_TIMEOUT_MS}ms after opening with a password`
                      )
                    : new ExtractionError(
                          "timed_out",
                          `Extraction stopped responding after ${EXTRACTION_TIMEOUT_MS}ms`
                      )
            );
        }, EXTRACTION_TIMEOUT_MS);
    });

    try {
        return await Promise.race([readPdfLines(bytes, password), abandon]);
    } finally {
        clearTimeout(timer);
    }
}

/** The actual read; `extractPdfLines` only adds the deadline around it. */
async function readPdfLines(bytes: Uint8Array, password?: string): Promise<string[]> {
    const pdfjs = await loadPdfjs();

    const task = pdfjs.getDocument({
        data: bytes,
        // Undefined is what pdf.js expects when there is nothing to try; passing
        // an empty string would be a *wrong* password rather than no password.
        password: password || undefined,
        // Nothing is rendered, so no fonts are needed on this side, and asking
        // for them would mean network fetches we do not want.
        disableFontFace: true,
        useSystemFonts: false,
        useWorkerFetch: false,
        // Hermes has no `eval` / `Function` constructor.
        isEvalSupported: false,
        verbosity: 0,
    });

    let doc;
    try {
        doc = await task.promise;
    } catch (e) {
        const name = (e as Error)?.name ?? "";
        if (name === "PasswordException") {
            // pdf.js distinguishes the two cases, and so must the UI: one asks
            // for a password, the other says the one just tried is wrong.
            // NEED_PASSWORD = 1, INCORRECT_PASSWORD = 2.
            const incorrect = (e as { code?: number }).code === 2;
            throw new ExtractionError(
                incorrect ? "password_incorrect" : "password_required",
                (e as Error)?.message ?? "PDF requires a password"
            );
        }
        throw new ExtractionError("unreadable", (e as Error)?.message ?? "Could not open PDF");
    }

    try {
        const lines: string[] = [];
        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
            const page = await doc.getPage(pageNumber);
            const content = await page.getTextContent();
            lines.push(...groupIntoLines(content.items as unknown[]));
            page.cleanup();
        }

        if (lines.join("\n").length < MIN_TEXT_CHARS) {
            throw new ExtractionError(
                "scanned_pdf",
                "PDF has no usable text layer (scanned document)"
            );
        }
        return lines;
    } finally {
        await task.destroy();
    }
}
