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
    /**
     * Uploads a transient copy of an on-device statement for processing.
     * The durable copy stays on the phone (see lib/storage).
     */
    uploadStatement: async (uri: string, name: string, mimeType: string) => {
        const form = new FormData();
        // React Native FormData file shape.
        form.append("file", { uri, name, type: mimeType } as unknown as Blob);
        const res = await fetch(`${API_URL}/api/statements`, { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{
            statement_id: string;
            template: string;
            transactions_created: number;
        }>;
    },
};

export function mxn(value: number): string {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
    }).format(value);
}
