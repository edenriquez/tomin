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

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

export const api = {
    baseUrl: API_URL,
    summary: () => get<SpendingSummary>("/api/analytics/summary"),
    transactions: () => get<{ items: Transaction[]; total: number }>("/api/transactions"),
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
