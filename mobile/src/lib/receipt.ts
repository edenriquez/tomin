/**
 * On-device reading of a grocery ticket.
 *
 * The same promise the statement path makes, for a different document: the
 * photo is taken by this app, stays in this app, and is never uploaded. What
 * travels is the text the phone read off it, sealed (see `secure-transport.ts`)
 * — so the backend can tell you where milk was cheaper without ever having seen
 * your kitchen table.
 *
 * Recognition is native: ML Kit on Android, Vision on iOS, both behind
 * `@react-native-ml-kit/text-recognition`. That is a native module, so a JS
 * reload is not enough after installing it — the dev client has to be rebuilt
 * (`npx expo run:ios` / `run:android`), same as `expo-crypto`.
 */
import "@/lib/polyfills";

import * as FileSystem from "expo-file-system";
import { sha256 } from "js-sha256";
import { Platform } from "react-native";
import naclUtil from "tweetnacl-util";

import { groupOcrLines, toBoxes } from "@/lib/receipt-lines";

/** What the backend's `POST /api/ingest/receipt` accepts, before sealing. */
export type ReceiptPayload = {
    v: 1;
    kind: "receipt";
    filename: string;
    /** Hex SHA-256 of the ORIGINAL photo — the backend dedups on this. */
    content_sha256: string;
    lines: string[];
    captured_at: string;
    /** Traceability of OCR quality, per the custody plan. */
    extractor: string;
    /** Set when the user picked the movement themselves. */
    transaction_id?: string | null;
};

export type ReceiptErrorCode =
    /** The recognizer found no text at all: a blurry photo, or not a ticket. */
    | "no_text"
    /** The native module is missing — the dev client was not rebuilt. */
    | "recognizer_missing"
    /** The photo could not be read off disk. */
    | "unreadable";

export class ReceiptError extends Error {
    readonly code: ReceiptErrorCode;

    constructor(code: ReceiptErrorCode, message: string) {
        super(message);
        this.name = "ReceiptError";
        this.code = code;
        Object.setPrototypeOf(this, ReceiptError.prototype);
    }
}

/** Message shown to the user, in the product's voice. */
export function receiptMessage(error: unknown): string {
    if (error instanceof ReceiptError) {
        switch (error.code) {
            case "no_text":
                return "No alcancé a leer el ticket. Intenta con más luz y la foto derecha.";
            case "recognizer_missing":
                return "Falta el lector de texto nativo. Reconstruye la app (npx expo run:ios).";
            default:
                return "No pude leer esta foto en tu teléfono.";
        }
    }
    return `No pude leer esta foto: ${(error as Error).message}`;
}

export const RECEIPT_EXTRACTOR = `mlkit-${Platform.OS}`;

/**
 * Reads a photographed ticket into the payload the backend accepts.
 *
 * The hash is over the image bytes as they sit on disk, so re-sending the same
 * photo is deduped by a digest of something the server never receives.
 */
export async function readReceipt(
    localUri: string,
    filename: string,
    transactionId?: string | null
): Promise<ReceiptPayload> {
    let base64: string;
    try {
        base64 = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
    } catch (e) {
        throw new ReceiptError("unreadable", (e as Error).message);
    }
    const contentSha256 = sha256(naclUtil.decodeBase64(base64));

    const lines = groupOcrLines(toBoxes(await recognize(localUri)));
    if (lines.length === 0) {
        throw new ReceiptError("no_text", "The recognizer returned no lines");
    }

    return {
        v: 1,
        kind: "receipt",
        filename,
        content_sha256: contentSha256,
        lines,
        captured_at: new Date().toISOString(),
        extractor: RECEIPT_EXTRACTOR,
        transaction_id: transactionId ?? null,
    };
}

/**
 * Loaded lazily so the app still starts (and the statement path still works)
 * on a dev client built before this module existed. The alternative — a
 * top-level import — turns a missing native module into a white screen on
 * launch rather than one feature saying what it needs.
 */
async function recognize(uri: string): Promise<unknown> {
    let recognizer: { recognize: (uri: string) => Promise<unknown> };
    try {
        recognizer = (await import("@react-native-ml-kit/text-recognition")).default as never;
    } catch (e) {
        throw new ReceiptError("recognizer_missing", (e as Error).message);
    }
    try {
        return await recognizer.recognize(uri);
    } catch (e) {
        throw new ReceiptError("unreadable", (e as Error).message);
    }
}
