import Constants from "expo-constants";

const API_URL =
    (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ?? "http://127.0.0.1:8010";

export type Transaction = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    status: string;
};

export type SpendingSummary = {
    total_income: number;
    total_expense: number;
    top_category: string | null;
    by_category: { category_name: string; amount: number; percentage: number }[];
};

export type Statement = {
    id: string;
    source_type: string;
    bank: string | null;
    period_start: string | null;
    period_end: string | null;
    status: string;
    uploaded_at: string | null;
};

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

export type DeleteStatementResult = { statement_id: string; transactions_deleted: number };

/**
 * Deletes a statement server-side, treating "it is not there" as success.
 *
 * The phone's index can outlive the server's copy: `deleteSelected` in
 * `app/upload.tsx` removes the server data before the local file precisely so a
 * network failure leaves the file recoverable, which means a crash in between
 * leaves a `remoteId` pointing at nothing. If that dangling id kept throwing,
 * the row could never be cleaned up from the app again — the delete would fail
 * forever on a statement that is already gone. The caller wants this statement
 * absent from the server; a 404 means it is.
 */
async function deleteStatement(id: string): Promise<DeleteStatementResult> {
    const res = await fetch(`${API_URL}/api/statements/${id}`, { method: "DELETE" });
    if (res.status === 404) return { statement_id: id, transactions_deleted: 0 };
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export const api = {
    baseUrl: API_URL,
    summary: () => get<SpendingSummary>("/api/analytics/summary"),
    transactions: () => get<{ items: Transaction[]; total: number }>("/api/transactions"),
    statements: () => get<{ items: Statement[]; total: number }>("/api/statements"),
    /**
     * Deletes the server-side structured data for a statement. The durable copy
     * on this device is not touched (see lib/storage).
     */
    deleteStatement,
    // NOTE: there is deliberately no `uploadStatement` here any more. Sending a
    // statement now means extracting it on-device and sealing the result — see
    // lib/extract.ts and lib/secure-transport.ts. The raw file never leaves the
    // phone, so no code path should be able to hand it to `POST /api/statements`.
};

export function mxn(value: number): string {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
    }).format(value);
}
