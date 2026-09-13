"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Shapes } from "lucide-react";
import { useAppData } from "@/components/AppChrome";
import { BackendNotice, EmptyState, Skeleton } from "@/components/ui";
import { useBankScope } from "@/lib/banks";
import { categoryFamily, useCategories } from "@/lib/categories";
import { composeCategories } from "@/lib/categoryComposition";
import { applyQuery, UNCATEGORIZED } from "@/lib/movimientosQuery";
import { track } from "@/lib/telemetry";
import { useMovimientosSearch } from "./MovimientosSearchProvider";
import { useTransactions } from "./useTransactions";
import { CompositionBar } from "./CompositionBar";
import { CategoryAccordion } from "./CategoryAccordion";

/**
 * Entender el conjunto: one bar, then an accordion. The list itself is the
 * modal — a group here opens it already filtered.
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
    const { bounds, dataVersion } = useAppData();
    const { statementIds } = useBankScope(dataVersion);
    const categories = useCategories();
    const { query, openModal } = useMovimientosSearch();
    const { items, error, loading } = useTransactions(bounds, dataVersion, statementIds);
    const [openKey, setOpenKey] = useState<string | null>(null);

    const listed = useMemo(
        () =>
            items === null ? null : applyQuery(items, query, (id) => categoryFamily(categories, id)),
        [items, query, categories]
    );
    const composition = useMemo(
        () => (listed ? composeCategories(listed, categories) : null),
        [listed, categories]
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
            categoryIds: [key === UNCATEGORIZED ? UNCATEGORIZED : key],
        };
        openModal("revisar", next);
    }

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
            <div className="space-y-4">
                <div className="flex justify-end">{tabs}</div>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full rounded-full" />
                <div className="rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                    {Array.from({ length: 6 }).map((_, i) => (
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
            <section className="card space-y-4">
                {tabs && <div className="flex justify-end">{tabs}</div>}
                <CompositionBar
                    slices={composition.bar}
                    activeKey={openKey}
                    onPick={toggle}
                />
                <p className="text-label text-ash">
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
                />
            </section>
        </div>
    );
}
