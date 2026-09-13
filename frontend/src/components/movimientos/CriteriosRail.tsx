"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Transaction } from "@/lib/api";
import {
    AMOUNT_BUCKETS,
    KIND_OPTIONS,
    OTHER_MERCHANT,
    UNCATEGORIZED,
    categoryKeyOf,
    countBy,
    facetCounts,
    merchantSlugOf,
    toggleId,
    type AmountBucketId,
    type MovimientosKind,
    type MovimientosQuery,
} from "@/lib/movimientosQuery";
import { merchantBySlug, merchantLogoUrl } from "@/lib/merchants";
import {
    categoryFamily,
    categoryName,
    type CategoryInfo,
} from "@/lib/categories";
import { FechaCriterio } from "./FechaCriterio";

/**
 * Left rail of the movimientos modal. Fecha first — it is the bound every
 * other criterion counts inside. The rest are checklists over that set.
 */
export function CriteriosRail({
    items,
    query,
    onQuery,
    start,
    end,
    onDates,
    categories,
    calendarResetKey,
    dateAnchor,
}: {
    items: Transaction[] | null;
    query: MovimientosQuery;
    onQuery: (next: MovimientosQuery) => void;
    start: string;
    end: string;
    onDates: (start: string, end: string) => void;
    categories: Map<string, CategoryInfo> | null;
    calendarResetKey?: string | number | boolean;
    /** Newest ledger day — "este mes" is that month. */
    dateAnchor: string;
}) {
    const dated = items ?? [];
    const familyOf = (id: string) => categoryFamily(categories, id);
    const merchants = ranked(
        countBy(facetCounts(dated, query, "merchants", familyOf), merchantSlugOf),
        (slug) => (slug === OTHER_MERCHANT ? "Otros" : (merchantBySlug(slug)?.name ?? slug))
    );
    const cats = nestCategoryFacets(
        ranked(
            countBy(facetCounts(dated, query, "categories", familyOf), categoryKeyOf),
            (id) => (id === UNCATEGORIZED ? "Sin categoría" : categoryName(categories, id))
        ),
        categories
    );
    const amountPool = facetCounts(dated, query, "amount", familyOf);
    const kindPool = facetCounts(dated, query, "kind", familyOf);

    return (
        <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 py-4 lg:w-[252px] lg:shrink-0 lg:border-r lg:border-mist">
            <header className="flex items-baseline justify-between gap-2">
                <p className="text-body-sm font-medium text-ink">Criterios</p>
                <p className="text-label text-ash">Filtros activos</p>
            </header>

            <FechaCriterio
                start={start}
                end={end}
                onChange={onDates}
                anchor={dateAnchor}
                resetKey={calendarResetKey}
            />

            <Facet title="Comercio">
                {merchants.length === 0 ? (
                    <EmptyFacet />
                ) : (
                    merchants.map(({ id, label, count }) => (
                        <CheckRow
                            key={id}
                            checked={query.merchantSlugs.includes(id)}
                            label={label}
                            count={count}
                            onToggle={() =>
                                onQuery({
                                    ...query,
                                    merchantSlugs: toggleId(query.merchantSlugs, id),
                                })
                            }
                            leading={
                                id !== OTHER_MERCHANT && merchantBySlug(id) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={merchantLogoUrl(id)}
                                        alt=""
                                        width={14}
                                        height={14}
                                        className="h-3.5 w-3.5 rounded-[3px] object-contain"
                                    />
                                ) : null
                            }
                        />
                    ))
                )}
            </Facet>

            <Facet title="Categoría">
                {cats.length === 0 ? (
                    <EmptyFacet />
                ) : (
                    cats.map((node) => (
                        <div key={node.id}>
                            <CheckRow
                                checked={query.categoryIds.includes(node.id)}
                                label={node.label}
                                count={node.count}
                                onToggle={() =>
                                    onQuery({
                                        ...query,
                                        categoryIds: toggleId(query.categoryIds, node.id),
                                    })
                                }
                            />
                            {node.children.map((child) => (
                                <CheckRow
                                    key={child.id}
                                    checked={query.categoryIds.includes(child.id)}
                                    label={child.label}
                                    count={child.count}
                                    indent
                                    onToggle={() =>
                                        onQuery({
                                            ...query,
                                            categoryIds: toggleId(query.categoryIds, child.id),
                                        })
                                    }
                                />
                            ))}
                        </div>
                    ))
                )}
            </Facet>

            <Facet title="Monto">
                <div className="flex flex-wrap gap-1.5">
                    {AMOUNT_BUCKETS.map((b) => {
                        const n = amountPool.filter((t) =>
                            b.id === "0-100"
                                ? t.amount <= 100
                                : b.id === "100-300"
                                  ? t.amount > 100 && t.amount <= 300
                                  : t.amount > 300
                        ).length;
                        const on = query.amountBucket === b.id;
                        return (
                            <button
                                key={b.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() =>
                                    onQuery({
                                        ...query,
                                        amountBucket: on ? null : (b.id as AmountBucketId),
                                    })
                                }
                                className={cn(PILL, on ? PILL_ON : PILL_OFF)}
                            >
                                {b.label}
                                <span className="tabular text-ash">{n}</span>
                            </button>
                        );
                    })}
                </div>
            </Facet>

            <Facet title="Tipo">
                <div className="flex flex-wrap gap-1.5">
                    {KIND_OPTIONS.map((k) => {
                        const n =
                            k.id === "all"
                                ? kindPool.length
                                : kindPool.filter((t) => t.type === k.id).length;
                        const on = query.kind === k.id;
                        return (
                            <button
                                key={k.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() =>
                                    onQuery({
                                        ...query,
                                        kind: k.id as MovimientosKind,
                                    })
                                }
                                className={cn(PILL, on ? PILL_ON : PILL_OFF)}
                            >
                                {k.label}
                                <span className="tabular text-ash">{n}</span>
                            </button>
                        );
                    })}
                </div>
            </Facet>
        </aside>
    );
}

function Facet({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <p className="eyebrow">{title}</p>
            <div className="mt-2 space-y-0.5">{children}</div>
        </section>
    );
}

function EmptyFacet() {
    return <p className="text-label text-ash">Nada en este periodo.</p>;
}

function nestCategoryFacets(
    cats: { id: string; label: string; count: number }[],
    map: Map<string, CategoryInfo> | null
): { id: string; label: string; count: number; children: { id: string; label: string; count: number }[] }[] {
    const byId = new Map(cats.map((c) => [c.id, c]));
    const hasParent = cats.some((c) => map?.get(c.id)?.parentId);
    if (!map || !hasParent) {
        return cats.map((c) => ({ ...c, children: [] }));
    }

    for (const c of cats) {
        const parentId = map.get(c.id)?.parentId;
        if (parentId && !byId.has(parentId)) {
            byId.set(parentId, {
                id: parentId,
                label: categoryName(map, parentId),
                count: 0,
            });
        }
    }

    const childrenOf = (parentId: string) =>
        cats.filter((c) => map.get(c.id)?.parentId === parentId);

    const roots = Array.from(byId.values()).filter((c) => {
        const parentId = map.get(c.id)?.parentId;
        return !parentId || !byId.has(parentId);
    });

    return roots
        .map((r) => {
            const children = childrenOf(r.id);
            return {
                ...r,
                count: r.count + children.reduce((s, k) => s + k.count, 0),
                children,
            };
        })
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es-MX"));
}

function CheckRow({
    checked,
    label,
    count,
    onToggle,
    leading,
    indent,
}: {
    checked: boolean;
    label: string;
    count: number;
    onToggle: () => void;
    leading?: ReactNode;
    indent?: boolean;
}) {
    return (
        <button
            type="button"
            aria-pressed={checked}
            onClick={onToggle}
            className={cn(
                "flex w-full items-center gap-2 rounded-control px-1.5 py-1 text-left",
                "hover:bg-fog",
                checked && "bg-fog",
                indent && "pl-6"
            )}
        >
            <span
                aria-hidden
                className={cn(
                    "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border",
                    checked ? "border-soot bg-soot" : "border-muted bg-paper"
                )}
            >
                {checked && <span className="block h-1.5 w-1.5 bg-paper" />}
            </span>
            {leading}
            <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{label}</span>
            <span className="tabular text-label text-ash">{count}</span>
        </button>
    );
}

function ranked(
    counts: Map<string, number>,
    nameOf: (id: string) => string
): { id: string; label: string; count: number }[] {
    return Array.from(counts.entries())
        .map(([id, count]) => ({ id, label: nameOf(id), count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es-MX"));
}

const PILL =
    "inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-label";
const PILL_ON = "border-soot bg-soot text-paper";
const PILL_OFF = "border-mist bg-paper text-ink hover:border-muted";
