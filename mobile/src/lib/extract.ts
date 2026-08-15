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
    /** PDF is encrypted and we have no password. */
    | "password_protected"
    /** Neither PDF nor XML. */
    | "unsupported_type"
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
            case "password_protected":
                return "Este PDF está protegido con contraseña. Quítasela y vuelve a intentar.";
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

export async function extractDocument(
    localUri: string,
    filename: string,
    mimeType: string
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

    const lines = await extractPdfLines(bytes);
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
 * Loads pdf.js lazily, with the two adjustments React Native needs:
 *
 * 1. There is no `Worker`, so pdf.js must fall back to its "fake worker" — the
 *    worker code running on the JS thread behind a `LoopbackPort`. Its normal
 *    fallback path is `await import(GlobalWorkerOptions.workerSrc)`, a runtime
 *    URL import Metro cannot do. Setting `globalThis.pdfjsWorker` to the worker
 *    module makes pdf.js pick the handler straight out of the global instead
 *    (`PDFWorker.#mainThreadWorkerMessageHandler`), and short-circuits the
 *    `new Worker(...)` attempt entirely.
 * 2. Globals Hermes lacks (`structuredClone`, `atob`/`btoa`, `TextDecoder`) are
 *    installed by `@/lib/polyfills`, imported at the top of this file.
 *
 * Metro also needs `metro.config.js`'s Node built-in shim to bundle the legacy
 * build at all — see the comment there.
 */
async function loadPdfjs(): Promise<PdfjsModule> {
    if (!pdfjsPromise) {
        pdfjsPromise = (async () => {
            const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
            (globalThis as unknown as Record<string, unknown>).pdfjsWorker = worker;
            const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
            // Never fetched (see 1. above) but pdf.js asserts it is non-empty
            // on some code paths.
            pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
            return pdfjs;
        })();
    }
    return pdfjsPromise;
}

async function extractPdfLines(bytes: Uint8Array): Promise<string[]> {
    const pdfjs = await loadPdfjs();

    const task = pdfjs.getDocument({
        data: bytes,
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
            throw new ExtractionError("password_protected", "PDF requires a password");
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
