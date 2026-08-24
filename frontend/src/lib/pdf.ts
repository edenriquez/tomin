/**
 * True when the PDF declares an /Encrypt dictionary, i.e. it needs a password.
 *
 * Sniffed client-side so the password prompt appears *before* the upload —
 * a round trip that ends in "this file needs a password" is a worse answer
 * than an instant one. The backend stays the authority: if this misses, the
 * server replies `pdf_password_required` and the same dialog opens anyway.
 *
 * A false positive costs the user one unnecessary password prompt; a false
 * negative just falls through to the server as before.
 */
export function isEncryptedPdf(bytes: Uint8Array): boolean {
    const needle = [0x2f, 0x45, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74]; // "/Encrypt"
    outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (bytes[i + j] !== needle[j]) continue outer;
        }
        return true;
    }
    return false;
}
