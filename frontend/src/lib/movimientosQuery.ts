/**
 * The Movimientos modal's selection — everything that is not the time window.
 *
 * Date is the TimeWindow (and the first criterion in the rail). It hits the
 * API. These fields then filter that already-dated set. Closing the modal
 * writes them here; the face underneath reads the same object, so the chips
 * and the list cannot disagree.
 */

import type { Transaction } from "./api";
import { dayLabel } from "./format";
import { matchMerchant, merchantBySlug } from "./merchants";

export const OTHER_MERCHANT = "__other__";
export const UNCATEGORIZED = "__none__";

export const AMOUNT_BUCKETS = [
    { id: "0-100", label: "$0–100", min: 0, max: 100 },
    { id: "100-300", label: "$100–300", min: 100, max: 300 },
    { id: "300+", label: "+ $300", min: 300, max: null },
] as const;

export type AmountBucketId = (typeof AMOUNT_BUCKETS)[number]["id"];
export type MovimientosKind = "all" | "expense" | "income";

export const KIND_OPTIONS: { id: MovimientosKind; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "expense", label: "Cargos" },
    { id: "income", label: "Abonos" },
];

export type MovimientosQuery = {
    needle: string;
    merchantSlugs: string[];
    categoryIds: string[];
    amountBucket: AmountBucketId | null;
    kind: MovimientosKind;
};

export const EMPTY_QUERY: MovimientosQuery = {
    needle: "",
    merchantSlugs: [],
    categoryIds: [],
    amountBucket: null,
    kind: "all",
};

export function queryIsActive(q: MovimientosQuery): boolean {
    return (
        q.needle.trim().length > 0 ||
        q.merchantSlugs.length > 0 ||
        q.categoryIds.length > 0 ||
        q.amountBucket !== null ||
        q.kind !== "all"
    );
}

export function merchantSlugOf(t: Transaction): string {
    return matchMerchant(t.description) ?? OTHER_MERCHANT;
}

export function categoryKeyOf(t: Transaction): string {
    return t.category_id ?? UNCATEGORIZED;
}

function inBucket(amount: number, id: AmountBucketId): boolean {
    if (id === "0-100") return amount <= 100;
    if (id === "100-300") return amount > 100 && amount <= 300;
    return amount > 300;
}

/** Every criterion except date. Date has already been applied by the fetch.
 *  `familyOf` expands a parent id to its descendants so checking Transporte
 *  also lists Gasolina. */
export function applyQuery(
    items: Transaction[],
    q: MovimientosQuery,
    familyOf?: (id: string) => Iterable<string>
): Transaction[] {
    const needle = q.needle.trim().toLowerCase();
    const allowed =
        q.categoryIds.length > 0
            ? new Set(
                  q.categoryIds.flatMap((id) => (familyOf ? [...familyOf(id)] : [id]))
              )
            : null;
    return items.filter((t) => {
        if (q.kind !== "all" && t.type !== q.kind) return false;
        if (q.amountBucket && !inBucket(t.amount, q.amountBucket)) return false;
        if (q.merchantSlugs.length > 0 && !q.merchantSlugs.includes(merchantSlugOf(t))) {
            return false;
        }
        if (allowed && !allowed.has(categoryKeyOf(t))) {
            return false;
        }
        if (needle) {
            const hay = `${t.description} ${t.raw_description ?? ""}`.toLowerCase();
            if (!hay.includes(needle)) return false;
        }
        return true;
    });
}

/**
 * Facet counts. Date is already in `items`. Each facet ignores itself so a
 * checked comercio still shows the other comercios' numbers; the caption
 * ("la fecha acota…") is the only constraint that is never lifted.
 */
export function facetCounts(
    items: Transaction[],
    q: MovimientosQuery,
    ignore: "merchants" | "categories" | "amount" | "kind" | "none" = "none",
    familyOf?: (id: string) => Iterable<string>
): Transaction[] {
    return applyQuery(
        items,
        {
            ...q,
            merchantSlugs: ignore === "merchants" ? [] : q.merchantSlugs,
            categoryIds: ignore === "categories" ? [] : q.categoryIds,
            amountBucket: ignore === "amount" ? null : q.amountBucket,
            kind: ignore === "kind" ? "all" : q.kind,
        },
        familyOf
    );
}

export function countBy<T extends string>(
    items: Transaction[],
    keyOf: (t: Transaction) => T
): Map<T, number> {
    const out = new Map<T, number>();
    for (const t of items) {
        const k = keyOf(t);
        out.set(k, (out.get(k) ?? 0) + 1);
    }
    return out;
}

export function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function fromIso(day: string): Date {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function toIso(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

export function periodChipLabel(start?: string, end?: string): string {
    if (!start && !end) return "Periodo · Todo";
    if (start && end) {
        const a = dayLabel(fromIso(start));
        const b = dayLabel(fromIso(end));
        return start === end ? `Periodo · ${a}` : `Periodo · ${a} – ${b}`;
    }
    if (start) return `Periodo · desde ${dayLabel(fromIso(start))}`;
    return `Periodo · hasta ${dayLabel(fromIso(end!))}`;
}

export type QueryChip = {
    key: string;
    label: string;
    /** Which field to clear. Period is owned by the time window, not the query. */
    clear: "needle" | "merchant" | "category" | "amount" | "kind" | "period";
    id?: string;
};

export function queryChips(
    q: MovimientosQuery,
    categoryNameOf: (id: string) => string
): QueryChip[] {
    const chips: QueryChip[] = [];
    const needle = q.needle.trim();
    if (needle) chips.push({ key: "needle", label: `«${needle}»`, clear: "needle" });
    for (const slug of q.merchantSlugs) {
        const name =
            slug === OTHER_MERCHANT ? "Otros" : (merchantBySlug(slug)?.name ?? slug);
        chips.push({ key: `m:${slug}`, label: `Comercio · ${name}`, clear: "merchant", id: slug });
    }
    for (const id of q.categoryIds) {
        const name = id === UNCATEGORIZED ? "Sin categoría" : categoryNameOf(id);
        chips.push({ key: `c:${id}`, label: `Categoría · ${name}`, clear: "category", id });
    }
    if (q.amountBucket) {
        const bucket = AMOUNT_BUCKETS.find((b) => b.id === q.amountBucket);
        if (bucket) {
            chips.push({ key: "amount", label: `Monto · ${bucket.label}`, clear: "amount" });
        }
    }
    if (q.kind !== "all") {
        const label = q.kind === "expense" ? "Cargos" : "Abonos";
        chips.push({ key: "kind", label: `Tipo · ${label}`, clear: "kind" });
    }
    return chips;
}

export function clearChip(q: MovimientosQuery, chip: QueryChip): MovimientosQuery {
    if (chip.clear === "needle") return { ...q, needle: "" };
    if (chip.clear === "merchant") {
        return { ...q, merchantSlugs: q.merchantSlugs.filter((s) => s !== chip.id) };
    }
    if (chip.clear === "category") {
        return { ...q, categoryIds: q.categoryIds.filter((id) => id !== chip.id) };
    }
    if (chip.clear === "amount") return { ...q, amountBucket: null };
    if (chip.clear === "kind") return { ...q, kind: "all" };
    return q;
}
