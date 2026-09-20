"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Shapes } from "lucide-react";
import { useAppData } from "@/components/AppChrome";
import { BackendNotice, EmptyState, Skeleton } from "@/components/ui";
import { useBankScope } from "@/lib/banks";
import { useCategories } from "@/lib/categories";
import { composeCategories, repeatedCharges } from "@/lib/categoryComposition";
import { mxn2 } from "@/lib/format";
import { applyQuery, categoryLens, UNCATEGORIZED } from "@/lib/movimientosQuery";
import { track } from "@/lib/telemetry";
import { WINDOW_LABELS } from "@/lib/window";
import { useMovimientosSearch } from "./MovimientosSearchProvider";
import { useAttention } from "./useAttention";
import { useTransactions } from "./useTransactions";
import { CompositionBar } from "./CompositionBar";
import { CategoryAccordion } from "./CategoryAccordion";

/**
 * Entender el conjunto, in two beats down the page: the same cargos as one
 * bar, then every category under it, openable all the way down to the charge.
 *
 * There used to be a third beat above both — a card stating the reading in a
 * sentence, with the period, the totals and a "por revisar" badge. It said
 * nothing the bar and the list below did not already say in their own terms,
 * and it pushed the actual reading a screenful down. The work it carried is
 * where the work is: "Sin categoría" is pinned at the top of the list with
 * its own Revisar button.
 *
 * Lista is still the modal — a group here opens it already filtered.
 */
export function PorCategoriaView({
    tabs,
    onLoadingChange,
}: {
    tabs?: ReactNode;
    /** Told to the host each time this face starts or stops waiting on data:
     *  it holds the page's height while a face it has never shown loads. */
    onLoadingChange?: (loading: boolean) => void;
} = {}) {
    const { bounds, dataVersion, window: timeWindow } = useAppData();
    const { statementIds, labels: bankLabels } = useBankScope(dataVersion);
    const categories = useCategories();
    const { query, openModal } = useMovimientosSearch();
    const { items, error, loading } = useTransactions(bounds, dataVersion, statementIds);
    // The same rings the scatter draws, in the same scope: a charge flagged
    // here and flagged there is the one charge, not two opinions.
    const { items: attention } = useAttention(bounds, dataVersion, statementIds);
    const [openKey, setOpenKey] = useState<string | null>(null);

    const listed = useMemo(
        () =>
            items === null ? null : applyQuery(items, query, categoryLens(categories)),
        [items, query, categories]
    );
    const composition = useMemo(
        () => (listed ? composeCategories(listed, categories) : null),
        [listed, categories]
    );
    const repeats = useMemo(() => (listed ? repeatedCharges(listed) : new Set<string>()), [listed]);
    const attentionByRow = useMemo(
        () => new Map(attention.map((a) => [a.transaction_id, a.kind])),
        [attention]
    );

    const waiting = !error && (loading || listed === null || composition === null);
    const report = useRef(onLoadingChange);
    report.current = onLoadingChange;
    useEffect(() => {
        report.current?.(waiting);
    }, [waiting]);

    function toggle(key: string) {
        setOpenKey((cur) => (cur === key ? null : key));
        track("movimientos.category_expand", { open: openKey !== key });
    }

    function verMas(key: string) {
        const next = {
            ...query,
            // `key` is already the canonical id — the accordion's
            // uncategorized slice is keyed UNCATEGORIZED, same as the rail's
            // option and the same as what applyQuery matches on.
            categoryIds: [key],
        };
        openModal("revisar", next);
    }

    /** "30 DÍAS · BANAMEX, NU" — the scope the reading is true under. Banks
     *  only when a filter is on; "todos" would be a word for the default. */
    const scope = [
        timeWindow.kind === "preset" ? WINDOW_LABELS[timeWindow.id] : "periodo elegido",
        ...(bankLabels.length ? [bankLabels.join(", ")] : []),
    ].join(" · ");

    if (error) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">{tabs}</div>
                <BackendNotice what="tus categorías" detail={error} />
            </div>
        );
    }

    if (loading || listed === null || composition === null) {
        return (
            <div className="space-y-5">
                <section className="card space-y-3">
                    <div className="flex justify-end">{tabs}</div>
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-10 w-full rounded-card" />
                </section>
                <div className="rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="my-3 h-11" />
                    ))}
                </div>
            </div>
        );
    }

    if (composition.spendCount === 0 && composition.incomeCount === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">{tabs}</div>
                <EmptyState icon={Shapes} title="Ningún cargo en este periodo">
                    Prueba con un periodo más amplio, o quita criterios.
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <section className="card">
                {/* The two faces ride on the bar's card. They used to sit in a
                    reading card of their own above it, and a card holding only
                    a caption and a pair of tabs is furniture: the switch
                    belongs on the first thing it changes. */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="eyebrow">Periodo · {scope}</p>
                    {tabs}
                </div>
                <div className="mb-5 min-w-0">
                    <h2 className="text-title-sm font-normal text-ink">Por categoría</h2>
                    <p className="mt-1 text-body-sm text-graphite">
                        {composition.bar.length} categoría{composition.bar.length === 1 ? "" : "s"} ·{" "}
                        {composition.spendCount} cargo{composition.spendCount === 1 ? "" : "s"} ·{" "}
                        <span className="tabular text-ink">{mxn2(composition.spend)}</span> en el
                        periodo
                    </p>
                </div>
                <CompositionBar
                    slices={composition.bar}
                    activeKey={openKey}
                    onPick={toggle}
                />
                <p className="mt-3 text-label text-ash">
                    Base: cargos del periodo, sin «Entre mis cuentas» ni excluidos.
                </p>
            </section>

            <section className="min-w-0 overflow-hidden rounded-card border border-mist bg-paper shadow-card">
                <CategoryAccordion
                    slices={composition.slices}
                    barOrder={composition.bar}
                    openKey={openKey}
                    onToggle={toggle}
                    onVerMas={verMas}
                    attention={attentionByRow}
                    repeats={repeats}
                    spend={composition.spend}
                    movementCount={composition.movementCount}
                    aux={{
                        abonos: composition.abonos,
                        income: composition.income,
                        aparte: composition.aparte,
                        aparteTotal: composition.aparteTotal,
                    }}
                />
            </section>
        </div>
    );
}
