/**
 * A Lectura is a workstation opened from the tab you are already on.
 *
 * The rule is the set — a needle, a category, a union of labels — never a bag
 * of row ids. Exclusions are the escape hatch a text rule always needs. Two
 * drafts that normalize to the same rule are the same lectura, so "Leer
 * conjunto" on «soriana» twice reopens the thread list instead of minting a
 * twin lens.
 */

import {
    clauseHasSubject,
    ruleClauses,
    ruleFromClauses,
    type RuleClause,
    type Workstation,
    type WorkstationDraft,
    type WorkstationRule,
} from "./workstations";

export const MAX_LECTURA_CLAUSES = 10;

export function normalizeClause(clause: RuleClause): RuleClause {
    const out: RuleClause = {};
    const needle = clause.description_contains?.trim();
    if (needle) out.description_contains = needle;
    if (clause.amount_min) out.amount_min = clause.amount_min;
    if (clause.amount_max) out.amount_max = clause.amount_max;
    if (clause.category_id) out.category_id = clause.category_id;
    if (clause.tag_id) out.tag_id = clause.tag_id;
    return out;
}

function clauseKey(clause: RuleClause): string {
    const n = normalizeClause(clause);
    return [
        n.description_contains ?? "",
        n.amount_min ?? "",
        n.amount_max ?? "",
        n.category_id ?? "",
        n.tag_id ?? "",
    ].join("\0");
}

export function rulesEqual(a: WorkstationRule, b: WorkstationRule): boolean {
    const left = ruleClauses(a).map(clauseKey).sort();
    const right = ruleClauses(b).map(clauseKey).sort();
    if (left.length !== right.length) return false;
    return left.every((k, i) => k === right[i]);
}

export function exclusionsEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const right = new Set(b);
    return a.every((id) => right.has(id));
}

export function matchingWorkstation(
    items: Workstation[] | null,
    draft: WorkstationDraft
): Workstation | undefined {
    if (!items) return undefined;
    return items.find((w) => rulesEqual(w.rule, draft.rule));
}

export function draftFromNeedle(
    needle: string,
    excludedTxIds: string[],
    name?: string
): WorkstationDraft | null {
    const description_contains = needle.trim();
    if (!description_contains) return null;
    return {
        name: name?.trim() || `«${description_contains}»`,
        rule: { description_contains },
        excluded_tx_ids: excludedTxIds,
    };
}

export function draftFromClauses(
    clauses: RuleClause[],
    excludedTxIds: string[],
    name: string
): WorkstationDraft | null {
    const cleaned = clauses.map(normalizeClause).filter(clauseHasSubject).slice(0, MAX_LECTURA_CLAUSES);
    if (cleaned.length === 0) return null;
    return {
        name: name.trim() || "Lectura",
        rule: ruleFromClauses(cleaned),
        excluded_tx_ids: excludedTxIds,
    };
}
