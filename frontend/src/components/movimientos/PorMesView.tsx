"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { useAppData } from "@/components/AppChrome";
import { useTimeWindow } from "@/components/TimeWindowProvider";
import { BackendNotice, EmptyState, Skeleton } from "@/components/ui";
import { useBankScope } from "@/lib/banks";
import { useCategories } from "@/lib/categories";
import { mxn } from "@/lib/format";
import { applyQuery, categoryLens } from "@/lib/movimientosQuery";
import {
    composeMonths,
    monthBounds,
    SPAN_MONTHS,
    spanBounds,
    spanMonthKeys,
} from "@/lib/porMes";
import { track } from "@/lib/telemetry";
import { useMovimientosSearch } from "./MovimientosSearchProvider";
import { useTransactions } from "./useTransactions";
import { MesesList } from "./MesesList";
import { PorMesChart } from "./PorMesChart";

/**
 * The run of the last months, in two beats: the months as columns with the
 * mean across them, then every month as a row, openable down to its
 * categories.
 *
 * It reads a fixed span — six calendar months ending on the newest movement
 * on record — not the app's time window. The window is a lens for one period;
 * this face is about the sequence, and a "30 días" lens holds one month.
 * Banks still apply: the scope is which accounts, the span is when.
 *
 * "Ver en transacciones" moves the app's window to that month and opens the
 * modal, so the list, the chart and the header all answer for the same span
 * — the same idiom as a drag across the Categorías chart.
 */
export function PorMesView({
    tabs,
    onLoadingChange,
}: {
    tabs?: ReactNode;
    /** Told to the host each time this face starts or stops waiting on data:
     *  it holds the page's height while a face it has never shown loads. */
    onLoadingChange?: (loading: boolean) => void;
} = {}) {
    const { dataVersion } = useAppData();
    const { anchor, selectCustom } = useTimeWindow();
    const { statementIds, labels: bankLabels } = useBankScope(dataVersion);
    const categories = useCategories();
    const { query, openModal } = useMovimientosSearch();
    const [openKey, setOpenKey] = useState<string | null>(null);

    const keys = useMemo(() => spanMonthKeys(anchor), [anchor]);
    const bounds = useMemo(() => spanBounds(anchor), [anchor]);
    const { items, error, loading } = useTransactions(bounds, dataVersion, statementIds);

    const listed = useMemo(
        () => (items === null ? null : applyQuery(items, query, categoryLens(categories))),
        [items, query, categories]
    );
    const reading = useMemo(
        () => (listed ? composeMonths(listed, categories, keys) : null),
        [listed, categories, keys]
    );

    const waiting = !error && (loading || reading === null);
    const report = useRef(onLoadingChange);
    report.current = onLoadingChange;
    useEffect(() => {
        report.current?.(waiting);
    }, [waiting]);

    // Stable on purpose: it is part of the chart's options, and a new options
    // object on every render means Apex tearing the chart down and redrawing
    // it for nothing.
    const openRef = useRef(openKey);
    openRef.current = openKey;
    const toggle = useCallback((key: string) => {
        track("movimientos.month_expand", { open: openRef.current !== key });
        setOpenKey((cur) => (cur === key ? null : key));
    }, []);

    function verMes(key: string) {
        const range = monthBounds(key);
        selectCustom(range.start, range.end, "por-mes");
        openModal("por-mes", query);
    }

    function verCategoria(monthKey: string, categoryKey: string) {
        const range = monthBounds(monthKey);
        selectCustom(range.start, range.end, "por-mes");
        openModal("por-mes", { ...query, categoryIds: [categoryKey] });
    }

    /** "6 MESES · BANAMEX, NU" — the scope the reading is true under. */
    const scope = [
        `${SPAN_MONTHS} meses`,
        ...(bankLabels.length ? [bankLabels.join(", ")] : []),
    ].join(" · ");

    const head = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Periodo · {scope}</p>
            {tabs}
        </div>
    );

    if (error) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">{tabs}</div>
                <BackendNotice what="tus movimientos" detail={error} />
            </div>
        );
    }

    if (reading === null) {
        return (
            <div className="space-y-5">
                <section className="card space-y-4">
                    {head}
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-[280px] w-full" />
                </section>
                <div className="rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="my-3 h-11" />
                    ))}
                </div>
            </div>
        );
    }

    if (reading.listed.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">{tabs}</div>
                <EmptyState icon={CalendarDays} title="Ningún cargo en los últimos meses">
                    Sube un estado de cuenta y el mes aparece aquí.
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <section className="card space-y-5">
                {head}
                <div className="min-w-0">
                    <h2 className="text-title-sm font-normal text-ink">Por mes</h2>
                    <p className="mt-1 text-body-sm text-graphite">
                        Promedio mensual:{" "}
                        <span className="tabular text-ink">{mxn(reading.average)}</span>
                    </p>
                </div>
                <PorMesChart
                    months={reading.months}
                    average={reading.average}
                    openKey={openKey}
                    onPick={toggle}
                />
                <p className="text-label text-ash">
                    Base: cargos del periodo, sin «Entre mis cuentas» ni excluidos.
                </p>
            </section>

            <section className="min-w-0 overflow-hidden rounded-card border border-mist bg-paper shadow-card">
                <MesesList
                    months={reading.listed}
                    total={reading.total}
                    count={reading.count}
                    openKey={openKey}
                    onToggle={toggle}
                    onVerMes={verMes}
                    onVerCategoria={verCategoria}
                />
            </section>
        </div>
    );
}
