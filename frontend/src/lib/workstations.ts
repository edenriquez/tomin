/**
 * Typed client for a user's saved lenses over the ledger.
 *
 * The shape worth noticing is `filters`: the backend ships the rule already
 * translated into a metric query, and this client never rebuilds it. A second
 * implementation of "between 10 and 300" is a second chance to disagree with
 * the first, and the whole point of the workstation design is that the tiles,
 * the chart and the chat all read exactly the same set.
 */

import { request } from "./api";
import type { CategoryInfo } from "./categories";
import type { MetricParams } from "./metrics";

/** The conditions one filter can state. All optional; they compose as AND. */
export type RuleClause = {
    /** Case- and accent-insensitive substring of the movement's display name. */
    description_contains?: string;
    /** Inclusive bounds, over the unsigned magnitude. Strings, not numbers —
     *  JSON's float will not carry a peso bound back unchanged, and a bound
     *  that drifts by a centavo changes which movements are in the set. */
    amount_min?: string;
    amount_max?: string;
    category_id?: string;
    tag_id?: string;
};

/**
 * A rule is one filter, or the union of several.
 *
 * The two shapes are one type on purpose. A rule with a single filter stays
 * **flat** — exactly what every lens saved before groups existed looks like,
 * and what the backend still compiles to a plain query — while `any_of` appears
 * only when the user actually built a group. Nothing has to migrate, and the
 * common case never pays for the general one.
 */
export type WorkstationRule = RuleClause & { any_of?: RuleClause[] };

/** The conditions of one filter, in the order the editor shows them. */
export const RULE_FIELDS = [
    "description_contains",
    "amount_min",
    "amount_max",
    "category_id",
    "tag_id",
] as const satisfies readonly (keyof RuleClause)[];

/** A rule as the list of filters it unions. One-filter rules read as one. */
export function ruleClauses(rule: WorkstationRule): RuleClause[] {
    if (rule.any_of?.length) return rule.any_of;
    return [stripUnion(rule)];
}

/** The inverse: filters back into whichever shape the backend expects. */
export function ruleFromClauses(clauses: RuleClause[]): WorkstationRule {
    return clauses.length === 1 ? { ...clauses[0] } : { any_of: clauses.map((c) => ({ ...c })) };
}

/** Whether this filter says anything at all. An empty one matches everything,
 *  which is never what a filter meant — the backend refuses to save it. */
export function clauseHasSubject(clause: RuleClause): boolean {
    return Boolean(clause.description_contains?.trim() || clause.category_id || clause.tag_id);
}

function stripUnion(rule: WorkstationRule): RuleClause {
    const { any_of: _ignored, ...clause } = rule;
    return clause;
}

export type Workstation = {
    id: string;
    name: string;
    rule: WorkstationRule;
    /** Movements struck out by hand. The escape hatch a text rule always needs. */
    excluded_tx_ids: string[];
    /** The rule compiled to metric-query filters. Derived server-side; never
     *  rebuild it here. Pass it straight to `queryMetrics`. */
    filters: MetricParams & Record<string, unknown>;
    created_at: string | null;
    updated_at: string | null;
};

export type WorkstationDraft = {
    name: string;
    rule: WorkstationRule;
    excluded_tx_ids?: string[];
};

/** Only the fields the backend declares patchable; an omitted key is left alone. */
export type WorkstationPatch = Partial<WorkstationDraft>;

export const workstationsApi = {
    list: () => request<{ items: Workstation[]; total: number }>("/api/workstations"),

    get: (id: string) => request<Workstation>(`/api/workstations/${id}`),

    create: (draft: WorkstationDraft) =>
        request<Workstation>("/api/workstations", {
            method: "POST",
            body: JSON.stringify(draft),
        }),

    /** Note: a `rule` is replaced wholesale, never merged. It is one thought. */
    update: (id: string, patch: WorkstationPatch) =>
        request<Workstation>(`/api/workstations/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        }),

    remove: (id: string) =>
        request<{ workstation_id: string; deleted: boolean }>(`/api/workstations/${id}`, {
            method: "DELETE",
        }),
};

/* -------------------------------------------------------------------------- */
/* Conversations                                                               */
/* -------------------------------------------------------------------------- */

/** One persisted chat thread under a workstation. */
export type Conversation = {
    id: string;
    workstation_id: string;
    title: string;
    created_at: string | null;
    updated_at: string | null;
};

export type ConversationMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string | null;
};

export const conversationsApi = {
    list: (workstationId: string) =>
        request<{ items: Conversation[]; total: number }>(
            `/api/workstations/${workstationId}/conversations`
        ),

    /** The thread with its full transcript, oldest message first. */
    get: (conversationId: string) =>
        request<Conversation & { messages: ConversationMessage[] }>(
            `/api/workstations/conversations/${conversationId}`
        ),

    remove: (conversationId: string) =>
        request<{ conversation_id: string; deleted: boolean }>(
            `/api/workstations/conversations/${conversationId}`,
            { method: "DELETE" }
        ),
};

/* -------------------------------------------------------------------------- */
/* The profile row                                                             */
/* -------------------------------------------------------------------------- */

/**
 * One row of `cohort_profile`. Every field is nullable and that is the contract,
 * not sloppiness: the backend withholds a rate it cannot state honestly rather
 * than printing a number that will move by 300% on the next statement. Render
 * an em dash and the reason, never a zero.
 */
export type CohortProfile = {
    count: number;
    total: string | null;
    mean: string | null;
    median: string | null;
    min: string | null;
    max: string | null;
    days_covered: number | null;
    months_covered: string | null;
    per_week: string | null;
    per_month: string | null;
    median_days_between: string | null;
};

/** Reads the single row `cohort_profile` returns. */
export function readProfile(rows: Record<string, unknown>[] | undefined): CohortProfile | null {
    const row = rows?.[0];
    if (!row) return null;
    return {
        count: Number(row.count ?? 0),
        total: str(row.total),
        mean: str(row.mean),
        median: str(row.median),
        min: str(row.min),
        max: str(row.max),
        days_covered: row.days_covered == null ? null : Number(row.days_covered),
        months_covered: str(row.months_covered),
        per_week: str(row.per_week),
        per_month: str(row.per_month),
        median_days_between: str(row.median_days_between),
    };
}

function str(value: unknown): string | null {
    return value === null || value === undefined ? null : String(value);
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                        */
/* -------------------------------------------------------------------------- */

/** The rule as one line of Spanish, for the collapsed header. */
export function describeRule(
    w: Workstation,
    /** From `useCategories()`; without it a category condition shows as the
     *  generic "una categoría" rather than its name. */
    categories?: Map<string, CategoryInfo> | null
): string {
    // Filters joined by "o", conditions inside one joined by "·": the two
    // separators carry the two different meanings, so a group reads as a group
    // at a glance instead of as one long list of conditions.
    const parts = ruleClauses(w.rule)
        .map((clause) => describeClause(clause, categories))
        .filter(Boolean);
    let line = parts.join(" o ");
    if (w.excluded_tx_ids.length) {
        const excluded =
            w.excluded_tx_ids.length === 1
                ? "1 excluido"
                : `${w.excluded_tx_ids.length} excluidos`;
        line = line ? `${line} · ${excluded}` : excluded;
    }
    return line;
}

/** One filter as its conditions, joined. Exported for the editor's headers. */
export function describeClause(
    clause: RuleClause,
    categories?: Map<string, CategoryInfo> | null
): string {
    const parts: string[] = [];
    if (clause.description_contains) parts.push(`«${clause.description_contains}»`);
    if (clause.category_id) {
        parts.push(categories?.get(clause.category_id)?.name ?? "una categoría");
    }
    if (clause.amount_min && clause.amount_max) {
        parts.push(`$${clause.amount_min}–$${clause.amount_max}`);
    } else if (clause.amount_min) {
        parts.push(`desde $${clause.amount_min}`);
    } else if (clause.amount_max) {
        parts.push(`hasta $${clause.amount_max}`);
    }
    return parts.join(" · ");
}

/**
 * The frequency in whichever unit reads honestly.
 *
 * A habit with a sub-weekly rhythm is "3.8 por semana"; a monthly one is "1.1
 * al mes". Handing the user one unit and making them divide is how a reading
 * becomes homework. `null` when the set is too small to have a rate at all.
 */
export function frequencyLabel(profile: CohortProfile): { value: string; unit: string } | null {
    const gap = profile.median_days_between;
    const weekly = gap !== null && Number(gap) <= 10;
    const figure = weekly ? profile.per_week : profile.per_month;
    if (figure === null) return null;
    return { value: trimZeros(figure), unit: weekly ? "por semana" : "al mes" };
}

/** "cada 1.8 días" / "varias veces al día". `null` when there is no rhythm. */
export function rhythmLabel(profile: CohortProfile): string | null {
    const gap = profile.median_days_between;
    if (gap === null) return null;
    const days = Number(gap);
    if (days === 0) return "varias el mismo día";
    if (days < 1) return "menos de un día";
    return `cada ${trimZeros(gap)} ${days === 1 ? "día" : "días"}`;
}

/** "1.10" -> "1.1", "3.00" -> "3". A trailing zero is noise in a rate. */
function trimZeros(value: string): string {
    return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
