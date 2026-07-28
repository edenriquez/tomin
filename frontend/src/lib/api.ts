/**
 * Thin client for the Tomin backend API.
 *
 * The backend serves aggregates from the DuckDB cube; the web app is purely a
 * display layer. When Supabase auth is enabled, attach the access token here.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Transaction = {
    id: string;
    statement_id?: string | null;
    date: string;
    description: string;
    /** Untouched bank text, before normalisation. Useful as a title attribute. */
    raw_description?: string | null;
    amount: number;
    currency: string;
    type: "income" | "expense";
    status: "completed" | "pending";
    category_id: string | null;
    /** "auto" when the classifier assigned it, "manual" once a human did. */
    category_source?: string | null;
    merchant_id?: string | null;
    /** Free text the user wrote. Never derived from the statement. */
    notes?: string | null;
    /** Kept in the ledger, left out of every metric. For the transfer between
     *  your own accounts that would otherwise show up as both income and spend. */
    excluded_from_stats?: boolean;
    /** Ids only — resolve names against the tag list (see `lib/tags.ts`). */
    tag_ids?: string[];
};

/** The editable surface of a transaction. Everything else on it is bank data
 *  and stays read-only: a description the user can rewrite is a label, the
 *  original text survives in `raw_description`. */
export type TransactionPatch = {
    category_id?: string | null;
    description?: string;
    notes?: string | null;
    excluded_from_stats?: boolean;
};

export type TransactionPage = {
    items: Transaction[];
    total: number;
    limit: number;
    offset: number;
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
    transactions: (query = "") => request<TransactionPage>(`/api/transactions${query}`),
    /** Returns the updated transaction, so the caller never has to guess what
     *  the server made of the patch. */
    updateTransaction: (id: string, patch: TransactionPatch) =>
        request<Transaction>(`/api/transactions/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        }),
    /**
     * Absolute URL, not a fetch: the browser has to navigate to it for the
     * Content-Disposition attachment to become a download. Takes the same
     * query string the table was loaded with, so the file matches the screen.
     */
    transactionsExportUrl: (query = "") => `${API_URL}/api/transactions/export.csv${query}`,
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
