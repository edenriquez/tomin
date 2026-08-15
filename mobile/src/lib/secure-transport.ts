/**
 * Application-layer encryption for the extracted content.
 *
 * TLS is not enough for the promise this app makes: a corporate proxy, a load
 * balancer log or a mis-terminated TLS session would all see the plaintext of a
 * bank statement. So the extracted payload is sealed with NaCl `crypto_box`
 * (X25519 + XSalsa20-Poly1305) against the backend's public key, using a fresh
 * ephemeral keypair per upload, and the body on the wire is opaque.
 *
 * PROTOCOL v1 (the backend implements this verbatim):
 *
 *   GET  /api/ingest/key
 *        -> { key_id, algorithm: "x25519-xsalsa20-poly1305", public_key: b64(32B) }
 *
 *   POST /api/ingest/extracted
 *        <- { v: 1, key_id, epk: b64(32B), nonce: b64(24B), box: b64 }
 *        -> 201 { statement_id, template, transactions_created, statement, dashboard_url }
 *        -> 409 ya procesado · 400 envelope/payload inválido
 *
 * Key trust is TOFU: the first key we ever see is pinned to disk next to the
 * statements index. If the server later offers a different key we refuse to
 * send and ask the user — a silent key swap is precisely the MITM this layer
 * exists to catch. Rotation is still possible, it just has to be consented to
 * (`trustServerKey`).
 */
import "@/lib/polyfills";

import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

import { api } from "@/lib/api";
import type { ExtractedPayload } from "@/lib/extract";
import { ensureStatementsDir, STATEMENTS_DIR } from "@/lib/storage";

export const ENVELOPE_VERSION = 1;
export const ALGORITHM = "x25519-xsalsa20-poly1305";

const PINNED_KEY_PATH = `${STATEMENTS_DIR}ingest-key.json`;

export type ServerKey = {
    key_id: string;
    algorithm: string;
    public_key: string;
};

export type PinnedServerKey = ServerKey & { pinned_at: string };

export type Envelope = {
    v: number;
    key_id: string;
    epk: string;
    nonce: string;
    box: string;
};

export type IngestResponse = {
    statement_id: string;
    template: string;
    transactions_created: number;
    statement: Record<string, unknown>;
    dashboard_url: string;
};

/** The server offered a key that does not match the pinned one. */
export class KeyPinMismatchError extends Error {
    readonly pinned: PinnedServerKey;
    readonly offered: ServerKey;

    constructor(pinned: PinnedServerKey, offered: ServerKey) {
        super("La llave pública del servidor cambió");
        this.name = "KeyPinMismatchError";
        this.pinned = pinned;
        this.offered = offered;
        Object.setPrototypeOf(this, KeyPinMismatchError.prototype);
    }
}

/** The backend already has this content (409) — dedup by `content_sha256`. */
export class AlreadyProcessedError extends Error {
    readonly body: Record<string, unknown> | null;

    constructor(body: Record<string, unknown> | null) {
        super("Este archivo ya fue procesado");
        this.name = "AlreadyProcessedError";
        this.body = body;
        Object.setPrototypeOf(this, AlreadyProcessedError.prototype);
    }
}

export class TransportError extends Error {
    readonly status: number | null;

    constructor(message: string, status: number | null = null) {
        super(message);
        this.name = "TransportError";
        this.status = status;
        Object.setPrototypeOf(this, TransportError.prototype);
    }
}

/* -------------------------------------------------------------------------- */
/* randomness                                                                  */
/* -------------------------------------------------------------------------- */

let prngInstalled = false;

/**
 * tweetnacl refuses to generate keys until it has a CSPRNG, and Hermes exposes
 * no `crypto.getRandomValues`, so we wire expo-crypto's platform RNG in
 * (SecRandomCopyBytes on iOS, SecureRandom on Android).
 *
 * Deliberately `Crypto.getRandomValues` and not `Crypto.getRandomBytes`: the
 * latter silently falls back to `Math.random()` in dev builds when remote JS
 * debugging is attached, which would turn every keypair into decoration.
 * `getRandomValues` always goes to native and throws if the module is missing —
 * and failing loudly is the honest outcome, because an envelope built on weak
 * entropy protects nobody while looking like it does.
 */
function ensurePrng(): void {
    if (prngInstalled) return;
    nacl.setPRNG((x: Uint8Array, n: number) => {
        if (n === 0) return;
        const bytes = Crypto.getRandomValues(new Uint8Array(n));
        // An all-zero draw is the signature of a stubbed-out native module. At
        // n >= 16 the odds of a genuine one are 2^-128, so this is safe to treat
        // as a failure rather than a coincidence.
        const looksDead = n >= 16 && bytes.every((b) => b === 0);
        if (!bytes || bytes.length !== n || looksDead) {
            throw new TransportError(
                "El generador de aleatoriedad del sistema no respondió; no voy a cifrar con entropía dudosa"
            );
        }
        for (let i = 0; i < n; i++) x[i] = bytes[i];
    });
    prngInstalled = true;
}

/* -------------------------------------------------------------------------- */
/* server key: fetch, pin, verify                                              */
/* -------------------------------------------------------------------------- */

let cachedKey: ServerKey | null = null;

function parseServerKey(raw: unknown): ServerKey {
    const value = raw as Partial<ServerKey> | null;
    if (!value || typeof value.key_id !== "string" || typeof value.public_key !== "string") {
        throw new TransportError("El servidor devolvió una llave con formato inválido");
    }
    if (value.algorithm !== ALGORITHM) {
        throw new TransportError(`Algoritmo no soportado: ${String(value.algorithm)}`);
    }
    let decoded: Uint8Array;
    try {
        decoded = naclUtil.decodeBase64(value.public_key);
    } catch {
        throw new TransportError("La llave pública del servidor no es base64 válido");
    }
    if (decoded.length !== nacl.box.publicKeyLength) {
        throw new TransportError(
            `La llave pública del servidor mide ${decoded.length} bytes, se esperaban ${nacl.box.publicKeyLength}`
        );
    }
    return { key_id: value.key_id, algorithm: value.algorithm, public_key: value.public_key };
}

export async function readPinnedKey(): Promise<PinnedServerKey | null> {
    const info = await FileSystem.getInfoAsync(PINNED_KEY_PATH);
    if (!info.exists) return null;
    try {
        return JSON.parse(await FileSystem.readAsStringAsync(PINNED_KEY_PATH));
    } catch {
        return null;
    }
}

async function writePinnedKey(key: ServerKey): Promise<PinnedServerKey> {
    await ensureStatementsDir();
    const pinned: PinnedServerKey = { ...key, pinned_at: new Date().toISOString() };
    await FileSystem.writeAsStringAsync(PINNED_KEY_PATH, JSON.stringify(pinned));
    return pinned;
}

/** Explicit user consent to a rotated key ("confiar en la nueva llave"). */
export async function trustServerKey(key: ServerKey): Promise<PinnedServerKey> {
    const validated = parseServerKey(key);
    cachedKey = validated;
    return writePinnedKey(validated);
}

async function fetchServerKey(): Promise<ServerKey> {
    let res: Response;
    try {
        res = await fetch(`${api.baseUrl}/api/ingest/key`);
    } catch (e) {
        throw new TransportError(`No se pudo contactar al servidor: ${(e as Error).message}`);
    }
    if (!res.ok) {
        throw new TransportError(`El servidor no entregó su llave (HTTP ${res.status})`, res.status);
    }
    return parseServerKey(await res.json());
}

/**
 * Returns the key to seal against, enforcing the pin. Throws
 * {@link KeyPinMismatchError} when the offered key differs from the pinned one;
 * the caller is expected to ask the user before calling {@link trustServerKey}.
 */
export async function resolveServerKey(): Promise<ServerKey> {
    if (cachedKey) return cachedKey;

    const offered = await fetchServerKey();
    const pinned = await readPinnedKey();

    if (!pinned) {
        await writePinnedKey(offered);
        cachedKey = offered;
        return offered;
    }
    if (pinned.key_id !== offered.key_id || pinned.public_key !== offered.public_key) {
        throw new KeyPinMismatchError(pinned, offered);
    }
    cachedKey = offered;
    return offered;
}

/** Drops the in-memory cache; the pin on disk is untouched. */
export function forgetCachedKey(): void {
    cachedKey = null;
}

/* -------------------------------------------------------------------------- */
/* seal + send                                                                 */
/* -------------------------------------------------------------------------- */

/** Seals a payload for a given server key. Pure, so it can be tested offline. */
export function sealPayload(payload: ExtractedPayload, key: ServerKey): Envelope {
    ensurePrng();

    const message = naclUtil.decodeUTF8(JSON.stringify(payload));
    const serverPublicKey = naclUtil.decodeBase64(key.public_key);
    const ephemeral = nacl.box.keyPair();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const box = nacl.box(message, nonce, serverPublicKey, ephemeral.secretKey);
    // The ephemeral secret has done its job; do not leave it lying in memory.
    ephemeral.secretKey.fill(0);
    message.fill(0);

    return {
        v: ENVELOPE_VERSION,
        key_id: key.key_id,
        epk: naclUtil.encodeBase64(ephemeral.publicKey),
        nonce: naclUtil.encodeBase64(nonce),
        box: naclUtil.encodeBase64(box),
    };
}

/**
 * Seals the extracted payload and posts it. The original file is not touched
 * here and never leaves the device.
 */
export async function sendExtracted(payload: ExtractedPayload): Promise<IngestResponse> {
    const key = await resolveServerKey();
    const envelope = sealPayload(payload, key);

    let res: Response;
    try {
        res = await fetch(`${api.baseUrl}/api/ingest/extracted`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(envelope),
        });
    } catch (e) {
        throw new TransportError(`No se pudo enviar: ${(e as Error).message}`);
    }

    if (res.status === 409) {
        throw new AlreadyProcessedError(await safeJson(res));
    }
    if (!res.ok) {
        const body = await safeJson(res);
        const detail =
            body && typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
        throw new TransportError(detail, res.status);
    }
    return (await res.json()) as IngestResponse;
}

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
    try {
        return (await res.json()) as Record<string, unknown>;
    } catch {
        return null;
    }
}
