import * as FileSystem from "expo-file-system";

/**
 * On-device statement store.
 *
 * The phone is the durable source of truth for raw bank statements / SAT XML.
 * Files are copied into the app's private document directory and indexed
 * locally; only transient copies are ever uploaded to the backend for parsing.
 */

/**
 * Private, app-scoped directory holding the durable copies plus the local
 * index. Exported so neighbours of the index (e.g. the pinned server key in
 * `secure-transport.ts`) live in the same custody boundary.
 */
export const STATEMENTS_DIR = `${FileSystem.documentDirectory}statements/`;
const INDEX_PATH = `${STATEMENTS_DIR}index.json`;

export type StoredStatement = {
    id: string;
    name: string;
    localUri: string;
    mimeType: string;
    storedAt: string;
    processed: boolean;
    /** Backend statement id, set once the server has parsed this file. */
    remoteId?: string;
};

export async function ensureStatementsDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(STATEMENTS_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(STATEMENTS_DIR, { intermediates: true });
    }
}

const ensureDir = ensureStatementsDir;

export async function listStatements(): Promise<StoredStatement[]> {
    await ensureDir();
    const info = await FileSystem.getInfoAsync(INDEX_PATH);
    if (!info.exists) return [];
    try {
        return JSON.parse(await FileSystem.readAsStringAsync(INDEX_PATH));
    } catch {
        return [];
    }
}

async function writeIndex(items: StoredStatement[]): Promise<void> {
    await FileSystem.writeAsStringAsync(INDEX_PATH, JSON.stringify(items));
}

/** Copies a picked file into permanent on-device storage and indexes it. */
export async function storeStatement(
    sourceUri: string,
    name: string,
    mimeType: string
): Promise<StoredStatement> {
    await ensureDir();
    const id = `${Date.now()}`;
    const localUri = `${STATEMENTS_DIR}${id}_${name}`;
    await FileSystem.copyAsync({ from: sourceUri, to: localUri });

    const record: StoredStatement = {
        id,
        name,
        localUri,
        mimeType,
        storedAt: new Date().toISOString(),
        processed: false,
    };
    const items = await listStatements();
    items.unshift(record);
    await writeIndex(items);
    return record;
}

export async function markProcessed(id: string, remoteId: string): Promise<void> {
    const items = await listStatements();
    for (const item of items) {
        if (item.id === id) {
            item.processed = true;
            item.remoteId = remoteId;
        }
    }
    await writeIndex(items);
}

/**
 * Destroys this device's durable copy and drops it from the index.
 *
 * Every other operation here is additive precisely because the phone is the
 * source of truth: once this runs, the file is gone from the custody boundary
 * and only whatever was already extracted survives, on the server. Callers must
 * have said that out loud to the user first — see `confirmDeleteSelected` in
 * `app/upload.tsx`.
 *
 * Deleting the file is idempotent so a half-finished delete (file gone, index
 * entry left behind) still clears on a retry.
 */
export async function forgetStatement(id: string): Promise<void> {
    const items = await listStatements();
    const target = items.find((item) => item.id === id);
    if (!target) return;
    await FileSystem.deleteAsync(target.localUri, { idempotent: true });
    await writeIndex(items.filter((item) => item.id !== id));
}

/**
 * Forgets the backend statement after it has been deleted server-side. The
 * local file stays put, so it can be re-processed later.
 */
export async function markUnprocessed(id: string): Promise<void> {
    const items = await listStatements();
    for (const item of items) {
        if (item.id === id) {
            item.processed = false;
            delete item.remoteId;
        }
    }
    await writeIndex(items);
}
