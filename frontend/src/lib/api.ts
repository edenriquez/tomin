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
    /** Derived at ingest: self-transfer wording ("pago tarjeta", "cajita",
     *  "su abono"). The Flujo aggregate honors it like the cube does. */
    is_transfer?: boolean;
    is_cash_withdrawal?: boolean;
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




/** The user-declarable account kinds. Mirrors the backend `AccountKind` enum. */
export const ACCOUNT_KINDS = ["debit", "credit", "savings", "investment", "payroll"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/** Display names for the account kinds — one copy, both pickers. */
export const KIND_LABELS: Record<AccountKind, string> = {
    debit: "Débito",
    credit: "Crédito",
    savings: "Ahorro",
    investment: "Inversión",
    payroll: "Nómina",
};

/** Display names for statement sources — one copy, one wording. */
export const SOURCE_LABELS: Record<string, string> = {
    bank_pdf: "Estado de cuenta",
    sat_xml: "Factura SAT",
};

export type Statement = {
    id: string;
    source_type: string;
    bank: string | null;
    period_start: string | null;
    period_end: string | null;
    status: string;
    /** User-declared; null until they label the document. */
    account_kind: AccountKind | null;
    uploaded_at: string | null;
    /**
     * Where the reading happened: "web" (the file was uploaded here and
     * discarded) or "device" (the phone extracted the text and only the text
     * travelled — the custody promise). Optional and widened to `string`
     * deliberately: every statement ingested before the column existed answers
     * without it, so the UI must treat "absent" as "unknown", never as "web".
     */
    source?: "web" | "device" | string;
};

/** A row of the global category taxonomy. */
export type Category = {
    id: string;
    name: string;
    /** Hex, from the seed data. May be null; charts fall back to Ash. */
    color: string | null;
    icon: string | null;
};

/** The user-editable surface of a statement. Omitted key = leave alone. */
export type StatementPatch = {
    account_kind?: AccountKind | null;
    bank?: string | null;
};

/** What POST /api/statements answers: the parse outcome plus the statement
 *  itself, so the onboarding review can show what the OCR understood. */
export type UploadResult = {
    statement_id: string;
    template: string;
    transactions_created: number;
    statement: Statement;
};

/** One detected recurring series (subscription, fixed bill). */
export type RecurringItem = {
    label: string;
    occurrences: number;
    frequency: "weekly" | "biweekly" | "monthly" | "yearly";
    /** Median charge. */
    typical_amount: number;
    /** What the series costs per 30 days — the ranking measure. */
    monthly_equivalent: number;
    /** false = recurs on a rhythm but the amount varies (a utility bill). */
    amount_stable: boolean;
    last_date: string;
    next_expected: string;
    category_id: string | null;
    /** Every charge in the series, oldest first — the evidence the rhythm was
     *  inferred from, and what the calendar view is drawn from. */
    charges: RecurringCharge[];
};

/** One occurrence of a recurring series. */
export type RecurringCharge = {
    /** ISO date, no time. */
    date: string;
    amount: number;
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
    transactions: (query = "") => request<TransactionPage>(`/api/transactions${query}`),
    /** The global category taxonomy: names and colors for charts and pickers. */
    categories: () => request<{ items: Category[] }>(`/api/categories`),
    /**
     * Apply a category to every similar machine-categorized movement.
     * `dry_run` reports the blast radius without writing; the real run also
     * teaches the label so future uploads categorize themselves.
     */
    recategorize: (body: { category_id: string; label: string; dry_run?: boolean }) =>
        request<{ matched: number; updated: number; label: string }>(
            `/api/transactions/recategorize`,
            { method: "POST", body: JSON.stringify(body) }
        ),
    /**
     * Rename every similar machine-named movement and remember the alias, so
     * ingest renames future uploads too. Hand-typed names are never touched.
     */
    realias: (body: { label: string; alias: string; dry_run?: boolean }) =>
        request<{ matched: number; updated: number; label: string }>(
            `/api/transactions/realias`,
            { method: "POST", body: JSON.stringify(body) }
        ),
    /** Returns the updated transaction, so the caller never has to guess what
     *  the server made of the patch. */
    updateTransaction: (id: string, patch: TransactionPatch) =>
        request<Transaction>(`/api/transactions/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        }),
    recurring: (query = "") =>
        request<{ items: RecurringItem[] }>(`/api/analytics/recurring${query}`),
    statements: () => request<{ items: Statement[]; total: number }>(`/api/statements`),
    /**
     * The two user-editable statement fields: what kind of account it is and
     * (for statements the parser couldn't identify) which bank. Explicit null
     * clears a field; an omitted key leaves it alone.
     */
    updateStatement: (id: string, patch: StatementPatch) =>
        request<Statement>(`/api/statements/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        }),
    /**
     * Deletes a statement and every transaction derived from it, in the
     * relational store and in the analytics cube.
     */
    deleteStatement: (id: string) =>
        request<{ statement_id: string; transactions_deleted: number }>(
            `/api/statements/${id}`,
            { method: "DELETE" }
        ),
    uploadStatement: async (file: File): Promise<UploadResult> => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_URL}/api/statements`, { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<UploadResult>;
    },
};
