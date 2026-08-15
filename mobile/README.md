# Tomin Mobile (Expo)

React Native app (Expo Router). The phone is the custodian: raw bank statements
and SAT XML are copied into the app's private storage and **never leave the
device**. Extraction happens here, on-device; only the extracted text travels,
sealed with NaCl `crypto_box` against the backend's public key, and the response
comes back as a link to the web dashboard.

## Run

```bash
cd mobile
npm install
npx expo start
```

Set the backend URL in `app.json` under `expo.extra.apiUrl` (defaults to
`http://localhost:8000`). On a physical device use your machine's LAN IP.

`expo-crypto` is a native module, so a JS-only reload is not enough after a
fresh install — rebuild the dev client (`npx expo run:ios` / `run:android`).

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run verify       # envelope math, content hashing, polyfills, pdf.js boot
```

`npm run verify` runs the two Node self-checks in `scripts/`. They cover the
parts of the custody path that are host-independent; everything else needs a
device (see the checklist at the bottom).

## Structure

```
app/            # expo-router screens
  _layout.tsx   # navigation stack
  index.tsx     # dashboard (Resumen)
  upload.tsx    # pick → store on-device → extract → send sealed → dashboard link
  transactions.tsx
src/lib/
  api.ts              # backend client (read + delete only — no file upload)
  storage.ts          # on-device statement store (source of truth)
  extract.ts          # on-device extraction: PDF text layer / SAT XML
  pdf-lines.ts        # pdf.js fragments → reading-order lines (pure, testable)
  secure-transport.ts # server key TOFU pin, sealed envelope, POST
  polyfills.ts        # globals Hermes lacks (base64, structuredClone, TextDecoder)
scripts/
  verify-envelope.mjs   # crypto + hashing + polyfills, under Node
  verify-extraction.mjs # pdf.js worker-less boot + line grouping, under Node
```

## The wire protocol (v1)

```
GET  /api/ingest/key        -> { key_id, algorithm, public_key }
POST /api/ingest/extracted  <- { v, key_id, epk, nonce, box }
                            -> 201 { statement_id, template, transactions_created,
                                     statement, dashboard_url }
                               409 ya procesado · 400 envelope/payload inválido
```

The server's public key is pinned on first use. If it ever changes, the app
refuses to send and asks before trusting the new one — a silent key swap is
exactly the interception this layer exists to catch.

## Native / device notes

- `pdfjs-dist` is patched (`patches/pdfjs-dist+4.2.67.patch`) to remove a
  runtime `import(workerSrc)` Metro cannot bundle. pdf.js runs its worker on the
  JS thread via `globalThis.pdfjsWorker`; see `src/lib/extract.ts`.
- `metro.config.js` shims Node built-ins for the dead Node branches inside
  pdfjs-dist / tweetnacl / js-sha256.
- Scanned PDFs are refused with an honest message rather than uploaded. OCR on
  device is a later phase.
