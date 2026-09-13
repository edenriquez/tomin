/**
 * The Por categoría reading: the same dated+filtered set, grouped.
 *
 * Transfers and rows left out of stats stay in the modal; they do not take
 * a slice of the bar. Percents are of this set's cargos, never of "all time".
 */

import type { Transaction } from "./api";
import {
    categoryName,
    isUncategorizedId,
    isUncategorizedName,
    rootCategoryId,
    type CategoryInfo,
} from "./categories";
import { chart, colors } from "@/design/tokens";
import { UNCATEGORIZED } from "./movimientosQuery";

export const PREVIEW_CHARGES = 5;

export type CategorySlice = {
    key: string;
    name: string;
    amount: number;
    count: number;
    /** Share of the set's cargos, 0–1. */
    share: number;
    uncategorized: boolean;
    /** Newest cargos, capped — the rest live in the modal. */
    preview: Transaction[];
};

export type Composition = {
    slices: CategorySlice[];
    /** Slices in bar order: biggest first, uncategorized last. */
    bar: CategorySlice[];
    spend: number;
    income: number;
    spendCount: number;
    incomeCount: number;
    movementCount: number;
};

const spendable = (t: Transaction) =>
    t.type === "expense" && !t.is_transfer && !t.excluded_from_stats;

const incoming = (t: Transaction) =>
    t.type === "income" && !t.is_transfer && !t.excluded_from_stats;

export function composeCategories(
    items: Transaction[],
    categories: Map<string, CategoryInfo> | null
): Composition {
    const spendTx = items.filter(spendable);
    const incomeTx = items.filter(incoming);
    const spend = spendTx.reduce((s, t) => s + t.amount, 0);
    const income = incomeTx.reduce((s, t) => s + t.amount, 0);

    const bags = new Map<string, Transaction[]>();
    for (const t of spendTx) {
        const root = rootCategoryId(categories, t.category_id);
        const key =
            !t.category_id || isUncategorizedId(categories, root)
                ? UNCATEGORIZED
                : (root ?? t.category_id);
        const bag = bags.get(key);
        if (bag) bag.push(t);
        else bags.set(key, [t]);
    }

    const slices: CategorySlice[] = Array.from(bags.entries()).map(([key, txs]) => {
        const amount = txs.reduce((s, t) => s + t.amount, 0);
        const named = categoryName(categories, key === UNCATEGORIZED ? null : key);
        const uncategorized = isUncategorized(key, named);
        return {
            key,
            name: uncategorized ? "Sin categoría" : named,
            amount,
            count: txs.length,
            share: spend > 0 ? amount / spend : 0,
            uncategorized,
            preview: [...txs]
                .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
                .slice(0, PREVIEW_CHARGES),
        };
    });

    const ranked = slices
        .filter((s) => !s.uncategorized)
        .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "es-MX"));
    const none = slices.filter((s) => s.uncategorized);
    const accordion = [...none, ...ranked];
    const bar = [...ranked, ...none];

    return {
        slices: accordion,
        bar,
        spend,
        income,
        spendCount: spendTx.length,
        incomeCount: incomeTx.length,
        movementCount: items.length,
    };
}

function isUncategorized(key: string, name: string): boolean {
    if (key === UNCATEGORIZED) return true;
    return isUncategorizedName(name);
}

/** Stone ramp by rank. Hue is not the category channel — Signal marks the
 *  selected slice only. Leftover is the lightest step. */
export function barFill(rank: number, uncategorized: boolean, selected = false): string {
    if (selected) return colors.signal;
    if (uncategorized) return chart.neutral[chart.neutral.length - 1]!;
    return chart.neutral[Math.min(rank, chart.neutral.length - 1)]!;
}

export function pct(share: number): number {
    return Math.round(share * 100);
}
