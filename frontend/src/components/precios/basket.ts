/**
 * The tickets' lines as one bar: what the money in the baskets went to.
 *
 * The same partition Por categoría draws for a period, over products instead
 * of categories. A line is filed under its reference term when it has one —
 * `GV DETE 7L` and `DETERGENTE GV 7L` are one product to the bar — and under
 * the printed text when nobody has named it yet.
 */

import type { CategorySlice } from "@/lib/categoryComposition";
import type { Receipt, ReferenceTerm } from "@/lib/prices";

/** Past this many named slices the tail folds into one, the lightest step. */
const NAMED_MAX = 6;

export const RESTO = "__resto__";

export type Basket = {
    slices: CategorySlice[];
    total: number;
    lines: number;
    stores: number;
};

export function composeBasket(
    receipts: Receipt[],
    terms: Record<string, ReferenceTerm>
): Basket {
    const bags = new Map<string, { name: string; amount: number; count: number }>();
    let total = 0;
    let lines = 0;
    const stores = new Set<string>();

    for (const r of receipts) {
        if (r.store) stores.add(fold(r.store));
        for (const item of r.items) {
            const term = terms[item.product_key];
            const key = term ? `term:${fold(term.term)}` : `key:${item.product_key}`;
            const name = term ? term.term : item.description;
            const bag = bags.get(key);
            if (bag) {
                bag.amount += item.amount;
                bag.count += 1;
            } else {
                bags.set(key, { name, amount: item.amount, count: 1 });
            }
            total += item.amount;
            lines += 1;
        }
    }

    const ranked = Array.from(bags.entries())
        .map(([key, b]) => ({ key, ...b }))
        .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "es-MX"));

    const head = ranked.slice(0, NAMED_MAX);
    const tail = ranked.slice(NAMED_MAX);
    const slices: CategorySlice[] = head.map((b) => ({
        key: b.key,
        name: b.name,
        amount: b.amount,
        count: b.count,
        share: total > 0 ? b.amount / total : 0,
        uncategorized: false,
        groups: [],
    }));
    if (tail.length > 0) {
        const amount = tail.reduce((s, b) => s + b.amount, 0);
        slices.push({
            key: RESTO,
            name: "resto",
            amount,
            count: tail.reduce((s, b) => s + b.count, 0),
            share: total > 0 ? amount / total : 0,
            // The lightest step, and out of the legend: it is what is left,
            // not a product.
            uncategorized: true,
            groups: [],
        });
    }

    return { slices, total, lines, stores: stores.size };
}

export function fold(text: string): string {
    return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
