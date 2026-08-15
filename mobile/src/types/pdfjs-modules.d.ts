/**
 * pdfjs-dist ships its type declarations for the package root only; the deep
 * `legacy/build/*.mjs` paths we import (Metro resolves them directly, and the
 * legacy build is the one that survives Hermes) have no matching `.d.ts` under
 * TypeScript's node10 resolution. Re-point them here.
 */
declare module "pdfjs-dist/legacy/build/pdf.mjs" {
    export * from "pdfjs-dist";
}

declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
    /**
     * The worker entry point. Assigning the whole module namespace to
     * `globalThis.pdfjsWorker` is what makes pdf.js run its worker on the JS
     * thread instead of trying to `new Worker(...)`. See `extract.ts`.
     */
    export const WorkerMessageHandler: unknown;
}
