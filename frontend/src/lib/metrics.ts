/**
 * Typed client for the generic metric surface (docs/redesign-plan.md §1).
 *
 * Four calls, no more: the catalog, one batched query, and the two halves of
 * the home layout. Nothing here knows what a metric *means* — that is the
 * widget registry's job. This file only knows the envelope.
 *
 * Money arrives as strings (the backend refuses to round a Decimal through
 * JSON's float). `num()` is the single place that turns one into a number, so
 * a `null` never becomes a confident `0` by accident anywhere else.
 */

import { request } from "./api";

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

export type MetricShape = "breakdown" | "series" | "scalar";

/** The declared requirements a metric can carry. Open-ended on purpose: the
 *  backend may add one before the frontend knows its copy. */
export type Requirement = "transactions" | "cfdi" | "tags" | "balance" | (string & {});

export type MetricParamDef = {
    name: string;
    type: string;
    required: boolean;
    default: string | null;
    minimum: number | null;
    maximum: number | null;
};

export type MetricSpec = {
    id: string;
    title: string;
    description: string;
    group: string;
    shape: MetricShape;
    unit: string;
    dimensions: string[];
    filters: string[];
    grains: string[];
    default_dimensions: string[];
    default_grain: string | null;
    cumulative: boolean;
    requires: Requirement[];
    params: MetricParamDef[];
    /** The backend's own judgement about how much the number can be trusted.
     *  Authoritative: a metric that becomes exact stops being an estimate
     *  server-side and the badge disappears without a frontend release. */
    quality?: "estimate" | "beta" | null;
    /** Declared by metrics whose answer spans the whole history. The period
     *  selector still moves; this metric's result does not, and the widget has
     *  to say so rather than let the user infer a period that never applied. */
    ignores_period?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Query                                                                       */
/* -------------------------------------------------------------------------- */

export type Period = { start: string; end: string };

export type MetricParams = Record<string, string | number>;

export type MetricQuery = {
    /** The widget *instance* id, not the metric id: two widgets may render the
     *  same metric with different params and each needs its own result. */
    key: string;
    metric: string;
    params?: MetricParams;
    dimensions?: string[];
    filters?: Record<string, unknown>;
    grain?: string;
    period?: Period;
};

export type MetricRow = Record<string, string | number | null>;

export type MetricMeta = {
    currency: string | null;
    overlapping: boolean;
    partial: boolean;
    /** `null` for computed metrics, which do not rest on transactions at all —
     *  distinct from `0`, which means "we looked and found none". */
    source_txn_count: number | null;
};

export type MetricResult = {
    metric: string;
    shape: MetricShape;
    unit: string;
    value: string | null;
    rows: MetricRow[];
    meta: MetricMeta;
};

export type MetricErrorEntry = {
    error: { metric?: string; code: string; message: string };
};

export type MetricEntry = MetricResult | MetricErrorEntry;

export function isMetricError(entry: MetricEntry): entry is MetricErrorEntry {
    return "error" in entry;
}

export type MetricBatch = { results: Record<string, MetricEntry> };

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

export type WidgetSize = "sm" | "md" | "lg";

export type DashboardWidget = {
    id: string;
    metric_id: string;
    position: number;
    size: WidgetSize;
    params: MetricParams;
    title_override: string | null;
};

export type Dashboard = {
    id: string;
    name: string;
    is_default: boolean;
    widgets: DashboardWidget[];
};

/** The PUT body: no ids, no positions — order is the array. */
export type DashboardWidgetInput = {
    metric_id: string;
    params: MetricParams;
    size: WidgetSize;
    title_override?: string | null;
};

/* -------------------------------------------------------------------------- */
/* Calls                                                                       */
/* -------------------------------------------------------------------------- */

export const metricsApi = {
    fetchCatalog: () => request<{ items: MetricSpec[] }>("/api/metrics").then((r) => r.items),

    /**
     * One HTTP request for every visible widget. N widgets × one round trip per
     * period change is not a design; the endpoint is batched precisely so the
     * grid can re-query as a unit.
     */
    queryMetrics: (period: Period, queries: MetricQuery[]) =>
        request<MetricBatch>("/api/metrics/query", {
            method: "POST",
            body: JSON.stringify({ period, queries }),
        }),

    getHomeDashboard: () => request<Dashboard>("/api/dashboards/home"),

    saveHomeDashboard: (widgets: DashboardWidgetInput[]) =>
        request<Dashboard>("/api/dashboards/home", {
            method: "PUT",
            body: JSON.stringify({ widgets }),
        }),
};

export const { fetchCatalog, queryMetrics, getHomeDashboard, saveHomeDashboard } = metricsApi;

/* -------------------------------------------------------------------------- */
/* Value helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Money string -> number. `null`/absent/garbage collapse to 0 *for arithmetic
 *  only*; whether a widget has data at all is decided before this is called. */
export function num(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
}

/** "2026-01" or "2026-01-14" -> a Date at local midnight on day 1. */
export function parsePeriodKey(key: string | number | null): Date | null {
    if (typeof key !== "string") return null;
    const [y, m, d] = key.split("-").map(Number);
    if (!y || !m) return null;
    return new Date(y, m - 1, d || 1);
}
