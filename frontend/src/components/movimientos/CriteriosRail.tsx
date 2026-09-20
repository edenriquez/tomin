"use client";

import type { ReactNode } from "react";
import { PanelLeftClose, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Transaction } from "@/lib/api";
import {
    AMOUNT_BUCKETS,
    KIND_OPTIONS,
    OTHER_MERCHANT,
    UNCATEGORIZED,
    categoryKeyOf,
    categoryLens,
    countBy,
    facetCounts,
    merchantSlugOf,
    queryChips,
    toggleId,
    type AmountBucketId,
    type MovimientosKind,
    type MovimientosQuery,
} from "@/lib/movimientosQuery";
import { merchantBySlug, merchantLogoUrl } from "@/lib/merchants";
import { categoryName, type CategoryInfo } from "@/lib/categories";
import { FechaCriterio } from "./FechaCriterio";

export const RAIL_ID = "movimientos-criterios";

/**
 * Left rail of the movimientos modal. Fecha first — it is the bound every
 * other criterion counts inside. The rest are checklists over that set.
 *
 * It collapses, because the rail and the list compete for the same screen:
 * once the criteria are chosen, what the user wants is the movements, and on
 * a laptop the rail was taking a quarter of the width to show checkboxes
 * nobody was going to touch again. Collapsed it keeps a spine — the word, and
 * how many criteria are still on — so a filtered list never looks unfiltered.
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
    open,
    onToggle,
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
    open: boolean;
    onToggle: () => void;
}) {
    const activeCount = queryChips(query, (id) => categoryName(categories, id)).length;
    if (!open) {
        return <RailSpine activeCount={activeCount} onToggle={onToggle} />;
    }

    const dated = items ?? [];
    const lens = categoryLens(categories);
    const merchants = ranked(
        countBy(facetCounts(dated, query, "merchants", lens), merchantSlugOf),
        (slug) => (slug === OTHER_MERCHANT ? "Otros" : (merchantBySlug(slug)?.name ?? slug))
    );
    const cats = nestCategoryFacets(
        ranked(
            countBy(facetCounts(dated, query, "categories", lens), (t) =>
                categoryKeyOf(t, lens)
            ),
            (id) => (id === UNCATEGORIZED ? "Sin categoría" : categoryName(categories, id))
        ),
        categories
    );
    const amountPool = facetCounts(dated, query, "amount", lens);
    const kindPool = facetCounts(dated, query, "kind", lens);

    return (
        <aside
            id={RAIL_ID}
            className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 py-4 lg:w-[252px] lg:shrink-0 lg:border-r lg:border-mist"
        >
            <header className="flex items-center justify-between gap-2">
                <p className="text-body-sm font-medium text-ink">Criterios</p>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded
                    aria-controls={RAIL_ID}
                    title="Ocultar criterios"
                    className={cn(
                        "-mr-1 inline-flex h-7 w-7 items-center justify-center rounded-control",
                        "text-graphite transition-colors duration-100 hover:bg-fog hover:text-ink"
                    )}
                >
                    <PanelLeftClose size={15} aria-hidden />
                    <span className="sr-only">Ocultar criterios</span>
                </button>
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

/**
 * The rail, folded. On a phone it is a row above the list; on a laptop a
 * 40px spine down the left edge with the word running vertically — the same
 * gesture as a drawer, and it keeps the count of active criteria visible so
 * the collapse never hides *that* the list is filtered.
 */
function RailSpine({
    activeCount,
    onToggle,
}: {
    activeCount: number;
    onToggle: () => void;
}) {
    const label = activeCount > 0
        ? `Mostrar criterios · ${activeCount} activo${activeCount === 1 ? "" : "s"}`
        : "Mostrar criterios";

    return (
        <div className="lg:h-full lg:w-10 lg:shrink-0 lg:border-r lg:border-mist">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={false}
                aria-controls={RAIL_ID}
                title={label}
                className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-body-sm text-graphite",
                    "transition-colors duration-100 hover:bg-fog hover:text-ink",
                    "lg:h-full lg:flex-col lg:justify-start lg:gap-3 lg:px-0 lg:py-4"
                )}
            >
                <SlidersHorizontal size={15} aria-hidden className="shrink-0" />
                <span className="lg:[writing-mode:vertical-rl]">Criterios</span>
                {activeCount > 0 && (
                    <span
                        className={cn(
                            "tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
                            "bg-soot text-caption font-medium text-paper"
                        )}
                    >
                        {activeCount}
                    </span>
                )}
                <span className="sr-only">{label}</span>
            </button>
        </div>
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
