/**
 * Which detected series the Cargos recurrentes face shows.
 *
 * The 12-month calculation does not change. Category, comercio and needle
 * only hide rows — same contract as the Stitch caption.
 */

import type { RecurringItem } from "./api";
import { matchMerchant } from "./merchants";
import {
    OTHER_MERCHANT,
    UNCATEGORIZED,
    type AmountBucketId,
    type CategoryLens,
    type MovimientosQuery,
} from "./movimientosQuery";
import type { WindowBounds } from "./window";

function inBucket(amount: number, id: AmountBucketId): boolean {
    if (id === "0-100") return amount <= 100;
    if (id === "100-300") return amount > 100 && amount <= 300;
    return amount > 300;
}

export function seriesMatchesQuery(
    item: RecurringItem,
    q: MovimientosQuery,
    lens?: CategoryLens
): boolean {
    if (q.kind === "income") return false;
    if (q.amountBucket && !inBucket(item.typical_amount, q.amountBucket)) return false;
    if (q.categoryIds.length > 0) {
        // Same keying as the ledger: a series filed under the taxonomy's own
        // «Sin Categoría» is uncategorized, not a category called that.
        const none = lens ? lens.isNone(item.category_id) : !item.category_id;
        const key = none ? UNCATEGORIZED : item.category_id!;
        if (!q.categoryIds.includes(key)) return false;
    }
    if (q.merchantSlugs.length > 0) {
        const slug = matchMerchant(item.label) ?? OTHER_MERCHANT;
        if (!q.merchantSlugs.includes(slug)) return false;
    }
    const needle = q.needle.trim().toLowerCase();
    if (needle && !item.label.toLowerCase().includes(needle)) return false;
    return true;
}

/** A charge of this series landed inside the selected window. */
export function chargedInBounds(item: RecurringItem, bounds: WindowBounds): boolean {
    if (!bounds.start && !bounds.end) return false;
    return (item.charges ?? []).some((c) => {
        if (bounds.start && c.date < bounds.start) return false;
        if (bounds.end && c.date > bounds.end) return false;
        return true;
    });
}
