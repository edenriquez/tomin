"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SearchX, Inbox, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppData } from "@/components/AppChrome";
import { BackendNotice, ChartSkeleton, EmptyState, Skeleton, Switch } from "@/components/ui";
import { ChartCard } from "@/components/ChartCard";
import {
    PanelChoice,
    PanelControl,
    PanelControls,
    PanelNumber,
} from "@/components/settings/PanelControls";
import { usePanelSettings } from "@/components/settings/usePanelSettings";
import {
    CHART_MODE_LABELS,
    CHART_MODES,
    COLOR_MODE_LABELS,
    COLOR_MODES,
    TransactionsChart,
    type ChartMode,
    type ColorMode,
} from "@/components/charts/TransactionsChart";
import { useCategories } from "@/lib/categories";
import { useBankScope } from "@/lib/banks";
import { FETCH_CAP, useTransactions } from "./useTransactions";
import { TransactionsList } from "./TransactionsList";

/** Rows revealed per "show more" step, and the initial page — a list setting.
 *  Any size in range is valid; the cap is the fetch cap, since asking for more
 *  rows than the app ever loads is not a setting. */
const DEFAULT_PAGE = 50;
const MIN_PAGE = 1;
const MAX_PAGE = FETCH_CAP;

/**
 * The Movimientos view: the window's transactions as a scatter (outlier
 * hunting) over the same rows as a list (detail reading). One dataset feeds
 * both, so they cannot disagree; selection travels in both directions.
 */
export function MovimientosView() {
    const { windowId, bounds, dataVersion } = useAppData();
    const { statementIds } = useBankScope(dataVersion);
    const { items, total, error, reload, patchItem } = useTransactions(
        bounds,
        dataVersion,
        statementIds
    );
    const categories = useCategories();

    // Each panel owns its settings, keyed by its own id: the chart's are the
    // chart's, the list's are the list's, and both outlive this mount.
    const [chartCfg, setChartCfg] = usePanelSettings("movimientos.scatter", {
        showIncome: false,
        mode: "scatter" as string,
        colorMode: "neutral" as string,
    });
    // Stored values are user data; one this build doesn't know (a future
    // mode, a hand-edited store) falls back rather than blanking the chart.
    const mode: ChartMode = (CHART_MODES as readonly string[]).includes(chartCfg.mode)
        ? (chartCfg.mode as ChartMode)
        : "scatter";
    const colorMode: ColorMode = (COLOR_MODES as readonly string[]).includes(chartCfg.colorMode)
        ? (chartCfg.colorMode as ColorMode)
        : "neutral";
    const [listCfg, setListCfg] = usePanelSettings("movimientos.lista", {
        pageSize: DEFAULT_PAGE,
    });
    // Clamp on read too: the stored value is user-entered and, once the store
    // is a backend, not necessarily written by this build of the app.
    const page = Number.isFinite(listCfg.pageSize)
        ? Math.min(MAX_PAGE, Math.max(MIN_PAGE, Math.round(listCfg.pageSize)))
        : DEFAULT_PAGE;

    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(page);
    // The work queue: only machine-categorized rows. Session state, not a
    // setting — a filter you leave on forever is a different view.
    const [onlyAuto, setOnlyAuto] = useState(false);

    // A new window, search or page size is a new reading: selection and paging
    // reset.
    useEffect(() => {
        setSelectedId(null);
        setVisibleCount(page);
    }, [windowId, search, dataVersion, page, onlyAuto, statementIds]);

    const filtered = useMemo(() => {
        if (items === null) return null;
        const q = search.trim().toLowerCase();
        let out = items;
        if (onlyAuto) out = out.filter((t) => t.category_source === "auto");
        if (q) {
            out = out.filter(
                (t) =>
                    t.description.toLowerCase().includes(q) ||
                    (t.raw_description ?? "").toLowerCase().includes(q)
            );
        }
        return out;
    }, [items, search, onlyAuto]);

    // The queue size ignores the search — it is a fact about the window.
    const pendingCount = useMemo(
        () => (items ?? []).filter((t) => t.category_source === "auto").length,
        [items]
    );

    // Chart → list: make sure the selected row is inside the visible page
    // before the list tries to scroll to it.
    function handleSelect(id: string | null) {
        setSelectedId(id);
        if (id && filtered) {
            const index = filtered.findIndex((t) => t.id === id);
            if (index >= visibleCount) {
                setVisibleCount(Math.ceil((index + 1) / page) * page);
            }
        }
    }

    const loading = filtered === null;

    return (
        <div className="space-y-4 sm:space-y-6">
            {error && <BackendNotice what="tus movimientos" detail={error} />}

            <ChartCard
                title="Cada movimiento"
                controls={
                    <>
                        <PanelChoice<ChartMode>
                            label="Gráfica"
                            value={mode}
                            options={CHART_MODES.map((m) => ({
                                value: m,
                                label: CHART_MODE_LABELS[m],
                            }))}
                            onChange={(m) => setChartCfg({ mode: m })}
                        />
                        <PanelChoice<ColorMode>
                            label="Color"
                            value={colorMode}
                            options={COLOR_MODES.map((c) => ({
                                value: c,
                                label: COLOR_MODE_LABELS[c],
                            }))}
                            onChange={(c) => setChartCfg({ colorMode: c })}
                        />
                        <PanelControl label="Mostrar ingresos">
                            <Switch
                                aria-label="Mostrar ingresos en la gráfica"
                                checked={chartCfg.showIncome}
                                onChange={(showIncome) => setChartCfg({ showIncome })}
                            />
                        </PanelControl>
                    </>
                }
            >
                {loading ? (
                    <ChartSkeleton height={320} />
                ) : filtered.length === 0 ? (
                    <EmptyNote
                        search={search}
                        filtered={onlyAuto}
                        onClear={() => {
                            setSearch("");
                            setOnlyAuto(false);
                        }}
                    />
                ) : (
                    <TransactionsChart
                        transactions={filtered}
                        mode={mode}
                        colorMode={colorMode}
                        categories={categories}
                        showIncome={chartCfg.showIncome}
                        windowId={windowId}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                    />
                )}
            </ChartCard>

            <div className="min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h2 className="flex items-baseline gap-2 font-display text-title-sm font-normal text-ink">
                            Movimientos
                            {filtered && (
                                <span className="tabular font-sans text-body-sm text-graphite">
                                    {filtered.length.toLocaleString("es-MX")}
                                </span>
                            )}
                        </h2>
                        {pendingCount > 0 && (
                            <button
                                type="button"
                                aria-pressed={onlyAuto}
                                title="Movimientos categorizados automáticamente, sin revisar"
                                onClick={() => setOnlyAuto((v) => !v)}
                                className={cn(
                                    "tabular rounded-control px-2.5 py-1 text-label font-medium",
                                    "transition-colors duration-100",
                                    onlyAuto
                                        ? "bg-soot text-paper"
                                        : "bg-fog text-graphite ring-1 ring-inset ring-mist hover:text-ink"
                                )}
                            >
                                {pendingCount} por revisar
                            </button>
                        )}
                    </div>
                    <label
                        className={cn(
                            "flex h-9 flex-1 items-center gap-2 rounded-control border border-mist bg-paper px-3.5",
                            "transition-colors duration-100 focus-within:border-signal sm:max-w-64"
                        )}
                    >
                        <Search size={14} aria-hidden className="shrink-0 text-ash" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setSearch("");
                            }}
                            placeholder="Buscar movimiento"
                            aria-label="Buscar movimiento"
                            className={cn(
                                "w-full bg-transparent text-body-sm text-ink outline-none placeholder:text-ash",
                                // The browser's own clear glyph doubles ours.
                                "[&::-webkit-search-cancel-button]:hidden"
                            )}
                        />
                        {search && (
                            <button
                                type="button"
                                aria-label="Limpiar búsqueda"
                                onClick={() => setSearch("")}
                                className="-mr-1 rounded-full p-0.5 text-ash transition-colors duration-100 hover:text-ink"
                            >
                                <X size={14} aria-hidden />
                            </button>
                        )}
                    </label>
                </div>

                <PanelControls>
                    <PanelNumber
                        label="Mostrar"
                        unit="filas por página"
                        value={page}
                        min={MIN_PAGE}
                        max={MAX_PAGE}
                        onChange={(pageSize) => setListCfg({ pageSize })}
                    />
                </PanelControls>

                {items !== null && total > items.length && (
                    <p className="mt-2 text-label text-graphite">
                        Mostrando los {FETCH_CAP.toLocaleString("es-MX")} movimientos más
                        recientes de {total.toLocaleString("es-MX")}.
                    </p>
                )}

                <div className="mt-4">
                    {loading ? (
                        <div aria-hidden className="-mx-5 divide-y divide-mist border-t border-mist sm:-mx-6">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3.5 w-2/5" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <div className="flex flex-col items-end space-y-2">
                                        <Skeleton className="h-3.5 w-20" />
                                        <Skeleton className="h-3 w-28" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyNote
                            search={search}
                            filtered={onlyAuto}
                            onClear={() => {
                                setSearch("");
                                setOnlyAuto(false);
                            }}
                        />
                    ) : (
                        <TransactionsList
                            items={filtered}
                            visibleCount={visibleCount}
                            onShowMore={() => setVisibleCount((c) => c + page)}
                            selectedId={selectedId}
                            onSelect={handleSelect}
                            editing={{
                                onPatch: (t, patch) => patchItem(t.id, patch),
                                onBulkApplied: reload,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyNote({
    search,
    filtered,
    onClear,
}: {
    search: string;
    /** The "por revisar" filter is on — the emptiness may be its doing. */
    filtered: boolean;
    onClear: () => void;
}) {
    const narrowed = Boolean(search.trim()) || filtered;
    return (
        <EmptyState
            icon={narrowed ? SearchX : Inbox}
            title={
                search.trim()
                    ? `Nada coincide con «${search.trim()}»`
                    : filtered
                      ? "Nada por revisar aquí"
                      : "Sin movimientos en este periodo"
            }
            action={
                narrowed && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="rounded-control px-3 py-1.5 text-body-sm text-graphite underline decoration-mist underline-offset-4 transition-colors duration-100 hover:text-ink"
                    >
                        Limpiar filtros
                    </button>
                )
            }
        >
            {narrowed
                ? "Los filtros están reduciendo lo que se dibuja."
                : "Prueba con un periodo más amplio, o sube un estado de cuenta que lo cubra."}
        </EmptyState>
    );
}
