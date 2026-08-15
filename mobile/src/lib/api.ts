import Constants from "expo-constants";

const API_URL =
    (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ?? "http://localhost:8000";

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

async function del<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { method: "DELETE" });
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
    deleteStatement: (id: string) =>
        del<{ statement_id: string; transactions_deleted: number }>(`/api/statements/${id}`),
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
