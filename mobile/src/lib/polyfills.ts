/**
 * Browser globals that Hermes (React Native 0.74) does not ship, but that the
 * pure-JS libraries behind on-device custody assume are there.
 *
 * Import this module for its side effects **before** importing `tweetnacl-util`
 * or `pdfjs-dist`:
 *
 *     import "@/lib/polyfills";
 *     import naclUtil from "tweetnacl-util";
 *
 * Module evaluation follows import order, so being the first import is enough.
 *
 * What is installed, and why each one is required:
 *
 * - `atob` / `btoa` — tweetnacl-util *chooses its base64 implementation at
 *   import time*: with no `atob` it falls back to Node's `Buffer`, which does
 *   not exist here either, and the module throws a ReferenceError while
 *   loading. pdf.js also uses them for embedded font data and XFA payloads.
 *
 * - `structuredClone` — pdf.js has no Worker in React Native, so it runs its
 *   worker code on the JS thread through a `LoopbackPort`, and that port clones
 *   every message with `structuredClone`. A transfer list is accepted and
 *   ignored (JavaScript cannot detach an ArrayBuffer); the only cost is a copy.
 *   core-js, bundled inside the pdf.js legacy build, feature-detects real
 *   transfer semantics and correctly concludes we do not have them.
 *
 * - `TextDecoder` — pdf.js decodes UTF-8 / UTF-16 PDF strings with it, relying
 *   on `{ fatal: true }` throwing on malformed input to fall back to PDFDocEncoding.
 *
 * None of this is a security primitive: randomness comes from expo-crypto (see
 * `secure-transport.ts`) and hashing from js-sha256.
 */

const g = globalThis as unknown as Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* base64                                                                      */
/* -------------------------------------------------------------------------- */

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const B64_REVERSE = (() => {
    const table = new Int16Array(256).fill(-1);
    for (let i = 0; i < B64_ALPHABET.length; i++) table[B64_ALPHABET.charCodeAt(i)] = i;
    return table;
})();

/** Builds a string from char codes without blowing the argument limit. */
function fromCharCodes(codes: number[]): string {
    const CHUNK = 8192;
    if (codes.length <= CHUNK) return String.fromCharCode(...codes);
    const parts: string[] = [];
    for (let i = 0; i < codes.length; i += CHUNK) {
        parts.push(String.fromCharCode(...codes.slice(i, i + CHUNK)));
    }
    return parts.join("");
}

function btoaPolyfill(binary: string): string {
    const out: string[] = [];
    let i = 0;
    for (; i + 2 < binary.length; i += 3) {
        const a = binary.charCodeAt(i);
        const b = binary.charCodeAt(i + 1);
        const c = binary.charCodeAt(i + 2);
        if (a > 0xff || b > 0xff || c > 0xff) throw new Error("btoa: string contains non-latin1 characters");
        const triplet = (a << 16) | (b << 8) | c;
        out.push(
            B64_ALPHABET[(triplet >> 18) & 63] +
                B64_ALPHABET[(triplet >> 12) & 63] +
                B64_ALPHABET[(triplet >> 6) & 63] +
                B64_ALPHABET[triplet & 63]
        );
    }
    const rest = binary.length - i;
    if (rest === 1) {
        const a = binary.charCodeAt(i);
        if (a > 0xff) throw new Error("btoa: string contains non-latin1 characters");
        out.push(B64_ALPHABET[a >> 2] + B64_ALPHABET[(a << 4) & 63] + "==");
    } else if (rest === 2) {
        const a = binary.charCodeAt(i);
        const b = binary.charCodeAt(i + 1);
        if (a > 0xff || b > 0xff) throw new Error("btoa: string contains non-latin1 characters");
        out.push(B64_ALPHABET[a >> 2] + B64_ALPHABET[((a << 4) | (b >> 4)) & 63] + B64_ALPHABET[(b << 2) & 63] + "=");
    }
    return out.join("");
}

function atobPolyfill(encoded: string): string {
    const input = encoded.replace(/[\t\n\f\r ]/g, "");
    let end = input.length;
    while (end > 0 && input.charCodeAt(end - 1) === 61 /* '=' */) end--;
    const outLength = Math.floor((end * 3) / 4);
    const codes = new Array<number>(outLength);

    let acc = 0;
    let accBits = 0;
    let o = 0;
    for (let i = 0; i < end; i++) {
        const value = B64_REVERSE[input.charCodeAt(i)];
        if (value < 0) throw new Error("atob: invalid base64 character");
        acc = (acc << 6) | value;
        accBits += 6;
        if (accBits >= 8) {
            accBits -= 8;
            codes[o++] = (acc >> accBits) & 0xff;
        }
    }
    if (o !== outLength) codes.length = o;
    return fromCharCodes(codes);
}

if (typeof g.btoa !== "function") g.btoa = btoaPolyfill;
if (typeof g.atob !== "function") g.atob = atobPolyfill;

/* -------------------------------------------------------------------------- */
/* structuredClone                                                             */
/* -------------------------------------------------------------------------- */

const TYPED_ARRAY_CTORS = [
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
];

function cloneValue(value: unknown, seen: Map<unknown, unknown>): unknown {
    if (value === null || typeof value !== "object") {
        if (typeof value === "function") {
            // Matches the spec: functions are not cloneable. pdf.js never sends
            // one across the loopback port, so throwing surfaces real bugs.
            throw new Error("structuredClone: functions cannot be cloned");
        }
        return value;
    }
    const cached = seen.get(value);
    if (cached !== undefined) return cached;

    if (value instanceof ArrayBuffer) {
        const copy = value.slice(0);
        seen.set(value, copy);
        return copy;
    }
    if (ArrayBuffer.isView(value)) {
        const view = value as ArrayBufferView;
        // Clone the backing buffer once so that several views over the same
        // buffer stay views over the *same* cloned buffer, as the spec requires.
        const buffer = cloneValue(view.buffer, seen) as ArrayBuffer;
        const Ctor = TYPED_ARRAY_CTORS.find((C) => view instanceof C) as
            | (new (b: ArrayBufferLike, offset: number, length: number) => ArrayBufferView)
            | undefined;
        const copy = Ctor
            ? new Ctor(buffer, view.byteOffset, (view as Uint8Array).length)
            : new DataView(buffer, view.byteOffset, view.byteLength);
        seen.set(value, copy);
        return copy;
    }
    if (value instanceof Date) {
        const copy = new Date(value.getTime());
        seen.set(value, copy);
        return copy;
    }
    if (value instanceof RegExp) {
        const copy = new RegExp(value.source, value.flags);
        seen.set(value, copy);
        return copy;
    }
    if (value instanceof Map) {
        const copy = new Map();
        seen.set(value, copy);
        for (const [k, v] of value) copy.set(cloneValue(k, seen), cloneValue(v, seen));
        return copy;
    }
    if (value instanceof Set) {
        const copy = new Set();
        seen.set(value, copy);
        for (const v of value) copy.add(cloneValue(v, seen));
        return copy;
    }
    if (Array.isArray(value)) {
        const copy = new Array(value.length);
        seen.set(value, copy);
        for (let i = 0; i < value.length; i++) copy[i] = cloneValue(value[i], seen);
        return copy;
    }
    if (value instanceof Error) {
        const copy = new Error(value.message);
        copy.name = value.name;
        copy.stack = value.stack;
        seen.set(value, copy);
        return copy;
    }
    // Everything else is cloned as a plain object. Prototypes are dropped, which
    // matches the spec for ordinary objects; class instances lose their
    // identity, which pdf.js does not depend on across the port.
    const copy: Record<string, unknown> = {};
    seen.set(value, copy);
    for (const key of Object.keys(value)) {
        copy[key] = cloneValue((value as Record<string, unknown>)[key], seen);
    }
    return copy;
}

if (typeof g.structuredClone !== "function") {
    // The second argument (`{ transfer: [...] }` or `null`) is accepted and
    // ignored: ownership transfer is impossible from JS, so we always copy.
    g.structuredClone = (value: unknown) => cloneValue(value, new Map());
}

/* -------------------------------------------------------------------------- */
/* TextDecoder                                                                 */
/* -------------------------------------------------------------------------- */

type Encoding = "utf-8" | "utf-16le" | "utf-16be" | "latin1";

const ENCODING_LABELS: Record<string, Encoding> = {
    "utf-8": "utf-8",
    "utf8": "utf-8",
    "unicode-1-1-utf-8": "utf-8",
    "unicode-1-1-utf8": "utf-8",
    "unicode11utf8": "utf-8",
    "utf-16": "utf-16le",
    "utf-16le": "utf-16le",
    "utf16le": "utf-16le",
    "utf-16be": "utf-16be",
    "utf16be": "utf-16be",
    "latin1": "latin1",
    "iso-8859-1": "latin1",
    "windows-1252": "latin1",
    "ascii": "latin1",
    "us-ascii": "latin1",
};

function pushCodePoint(units: number[], codePoint: number): void {
    if (codePoint > 0xffff) {
        const c = codePoint - 0x10000;
        units.push(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff));
    } else {
        units.push(codePoint);
    }
}

function decodeUtf8(bytes: Uint8Array, fatal: boolean): string {
    const units: number[] = [];
    const n = bytes.length;
    let i = 0;
    while (i < n) {
        const b0 = bytes[i++];
        if (b0 <= 0x7f) {
            units.push(b0);
            continue;
        }
        let needed: number;
        let codePoint: number;
        let lower = 0x80;
        let upper = 0xbf;
        if (b0 >= 0xc2 && b0 <= 0xdf) {
            needed = 1;
            codePoint = b0 & 0x1f;
        } else if (b0 >= 0xe0 && b0 <= 0xef) {
            needed = 2;
            codePoint = b0 & 0x0f;
            if (b0 === 0xe0) lower = 0xa0; // reject overlong
            if (b0 === 0xed) upper = 0x9f; // reject surrogates
        } else if (b0 >= 0xf0 && b0 <= 0xf4) {
            needed = 3;
            codePoint = b0 & 0x07;
            if (b0 === 0xf0) lower = 0x90;
            if (b0 === 0xf4) upper = 0x8f;
        } else {
            if (fatal) throw new TypeError("The encoded data was not valid for encoding utf-8");
            units.push(0xfffd);
            continue;
        }
        let ok = true;
        for (let k = 0; k < needed; k++) {
            const b = i < n ? bytes[i] : -1;
            if (b < lower || b > upper) {
                ok = false;
                break;
            }
            codePoint = (codePoint << 6) | (b & 0x3f);
            i++;
            lower = 0x80;
            upper = 0xbf;
        }
        if (!ok) {
            if (fatal) throw new TypeError("The encoded data was not valid for encoding utf-8");
            units.push(0xfffd);
            continue;
        }
        pushCodePoint(units, codePoint);
    }
    return fromCharCodes(units);
}

function decodeUtf16(bytes: Uint8Array, littleEndian: boolean, fatal: boolean): string {
    const units: number[] = [];
    let i = 0;
    for (; i + 1 < bytes.length; i += 2) {
        units.push(littleEndian ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
    }
    if (i < bytes.length) {
        if (fatal) throw new TypeError("The encoded data was not valid for encoding utf-16");
        units.push(0xfffd);
    }
    return fromCharCodes(units);
}

class TextDecoderPolyfill {
    readonly encoding: Encoding;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;

    constructor(label = "utf-8", options: { fatal?: boolean; ignoreBOM?: boolean } = {}) {
        const encoding = ENCODING_LABELS[String(label).trim().toLowerCase()];
        if (!encoding) throw new RangeError(`The encoding label "${label}" is not supported`);
        this.encoding = encoding;
        this.fatal = Boolean(options.fatal);
        this.ignoreBOM = Boolean(options.ignoreBOM);
    }

    decode(input?: ArrayBuffer | ArrayBufferView | null): string {
        if (input == null) return "";
        let bytes: Uint8Array;
        if (input instanceof Uint8Array) bytes = input;
        else if (ArrayBuffer.isView(input)) {
            bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        } else bytes = new Uint8Array(input);

        if (!this.ignoreBOM) {
            if (this.encoding === "utf-8" && bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
                bytes = bytes.subarray(3);
            } else if (this.encoding === "utf-16le" && bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
                bytes = bytes.subarray(2);
            } else if (this.encoding === "utf-16be" && bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
                bytes = bytes.subarray(2);
            }
        }

        switch (this.encoding) {
            case "utf-8":
                return decodeUtf8(bytes, this.fatal);
            case "utf-16le":
                return decodeUtf16(bytes, true, this.fatal);
            case "utf-16be":
                return decodeUtf16(bytes, false, this.fatal);
            default:
                return fromCharCodes(Array.from(bytes));
        }
    }
}

if (typeof g.TextDecoder !== "function") g.TextDecoder = TextDecoderPolyfill;

/** Exported only so the polyfills can be exercised from a plain Node script. */
export const __polyfills = {
    atob: atobPolyfill,
    btoa: btoaPolyfill,
    structuredClone: (value: unknown) => cloneValue(value, new Map()),
    TextDecoder: TextDecoderPolyfill,
};
