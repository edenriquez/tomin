/**
 * Thin client for the Tomin backend API.
 *
 * The backend serves aggregates from the DuckDB cube; the web app is purely a
 * display layer. When Supabase auth is enabled, attach the access token here.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Transaction = {
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: string;
    type: "income" | "expense";
    status: "completed" | "pending";
    category_id: string | null;
};

export type CategorySpend = {
    category_id: string | null;
    category_name: string;
    amount: number;
    percentage: number;
};

export type MonthlyPoint = { month: string; income: number; expense: number };

export type SpendingSummary = {
    total_income: number;
    total_expense: number;
    top_category: string | null;
    by_category: CategorySpend[];
    monthly: MonthlyPoint[];
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

export type RecurringItem = {
    label: string;
    average_amount: number;
    frequency: string;
    occurrences: number;
};

export type ForecastPoint = { month_offset: number; baseline: number; optimized: number };

export type Goal = {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
    progress: number;
};

/**
 * The one place a request is made. Exported so `lib/metrics.ts` speaks to the
 * metric endpoints through the same helper instead of growing a second one
 * that drifts on headers, caching or error shape.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        cache: "no-store",
    });
    if (!res.ok) {
        const detail = await res.text();
        throw new Error(`API ${res.status}: ${detail}`);
    }
    return res.json() as Promise<T>;
}

export const api = {
    summary: (params = "") => request<SpendingSummary>(`/api/analytics/summary${params}`),
    transactions: (query = "") =>
        request<{ items: Transaction[]; total: number }>(`/api/transactions${query}`),
    recurring: () => request<{ items: RecurringItem[] }>(`/api/analytics/recurring`),
    forecast: () => request<{ points: ForecastPoint[] }>(`/api/forecast`),
    simulate: (body: Record<string, number>) =>
        request<{ points: ForecastPoint[] }>(`/api/forecast/simulate`, {
            method: "POST",
            body: JSON.stringify(body),
        }),
    goals: () => request<{ items: Goal[] }>(`/api/goals`),
    statements: () => request<{ items: Statement[]; total: number }>(`/api/statements`),
    /**
     * Deletes a statement and every transaction derived from it, in the
     * relational store and in the analytics cube.
     */
    deleteStatement: (id: string) =>
        request<{ statement_id: string; transactions_deleted: number }>(
            `/api/statements/${id}`,
            { method: "DELETE" }
        ),
    uploadStatement: async (file: File) => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_URL}/api/statements`, { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
};
