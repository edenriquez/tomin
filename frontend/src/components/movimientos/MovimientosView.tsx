"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, SearchX, Inbox, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppData } from "@/components/AppChrome";
import { useSearchParams } from "next/navigation";
import { useTimeWindow } from "@/components/TimeWindowProvider";
import { msToIso } from "@/lib/window";
import { track } from "@/lib/telemetry";
import { PanelSettingsToggle } from "@/components/settings/PanelSettingsToggle";
import { BackendNotice, Button, ChartSkeleton, EmptyState, Skeleton, Switch } from "@/components/ui";
import { ChartCard } from "@/components/ChartCard";
import { LecturaDock } from "@/components/lectura/LecturaDock";
import { useLectura } from "@/components/lectura/LecturaProvider";
import { draftFromNeedle } from "@/lib/lectura";
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
    dateToMs,
    type ChartMode,
    type ColorMode,
} from "@/components/charts/TransactionsChart";
import { useCategories } from "@/lib/categories";
import { useBankScope } from "@/lib/banks";
import { dayLabel, mxn, mxn2 } from "@/lib/format";
import {
    ChartLens,
    LensChips,
    LENS_KIND_LABELS,
    type Lectura,
    type LensFocus,
    type LensGroup,
} from "@/components/charts/lens";
import { FETCH_CAP, useTransactions } from "./useTransactions";
import { useAttention } from "./useAttention";
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
    const { windowKey, window: timeWindow, bounds, grain, dataVersion } = useAppData();
    const { selectCustom, clearCustom } = useTimeWindow();
    const { statementIds } = useBankScope(dataVersion);
    const { items, total, error, reload, patchItem, loading: fetching } = useTransactions(
        bounds,
        dataVersion,
        statementIds
    );
    const categories = useCategories();
    // The rings: charges in this window worth a second look, judged by the
    // backend against the whole ledger. Same scope as the rows above, so a
    // ring always has its dot.
    const { items: attention, dismiss: dismissAttention } = useAttention(
        bounds,
        dataVersion,
        statementIds
    );
    const [lensFocus, setLensFocus] = useState<LensFocus>(null);

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

    // `?buscar=` seeds the search once, so another view can hand over a
    // filtered ledger ("revisa las transferencias") as a link.
    const seeded = useSearchParams().get("buscar") ?? "";
    const [search, setSearch] = useState(seeded);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(page);
    const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
    const { openDraft, opening } = useLectura();
    // A new window, search or page size is a new reading: selection and paging
    // reset.
    useEffect(() => {
        setSelectedId(null);
        setVisibleCount(page);
        setExcluded(new Set());
        setLensFocus(null);
    }, [windowKey, search, dataVersion, page, statementIds]);

    const filtered = useMemo(() => {
        if (items === null) return null;
        const q = search.trim().toLowerCase();
        let out = items;
        if (q) {
            out = out.filter(
                (t) =>
                    t.description.toLowerCase().includes(q) ||
                    (t.raw_description ?? "").toLowerCase().includes(q)
            );
        }
        return out;
    }, [items, search]);

    // Lecturas for the scatter: one chip per kind, each a tour of its
    // charges. Anchored on the rows actually drawn — a flagged charge the
    // search filtered out has no dot, so it has no ring either. Only the
    // scatter has per-charge marks; the flujo aggregate shows none.
    const lensGroups: LensGroup[] = useMemo(() => {
        if (!filtered || mode !== "scatter") return [];
        const byId = new Map(filtered.map((t) => [t.id, t]));
        const byKind = new Map<string, Lectura[]>();
        for (const a of attention) {
            const t = byId.get(a.transaction_id);
            if (!t || t.type !== "expense") continue;
            const l: Lectura = {
                id: a.transaction_id,
                kind: a.kind,
                anchor: { x: dateToMs(t.date), y: t.amount },
                title: `${t.description} · ${mxn2(t.amount)} · ${dayLabel(new Date(dateToMs(t.date)))}`,
                detail: a.reason,
                severity: a.severity,
                ref: t.id,
            };
            byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), l]);
        }
        return Array.from(byKind.entries()).map(([kind, lecturas]) => {
            const label = LENS_KIND_LABELS[lecturas[0]!.kind];
            // The chip shows the count itself; the label only pluralises.
            return { id: kind, label: lecturas.length === 1 ? label : plural(label), lecturas };
        });
    }, [filtered, attention, mode]);

    const attentionByRow = useMemo(
        () => new Map(attention.map((a) => [a.transaction_id, a.kind])),
        [attention]
    );

    const onLensFocus = useCallback((next: LensFocus) => {
        if (next) track("lens.open", { chart: "movimientos", kind: next.groupId, index: next.index });
        setLensFocus(next);
    }, []);

    // A range dragged over the chart is not a local zoom any more: it becomes
    // the app's time window. The list, the chart and every other view then
    // answer for the same days, and the header shows the dates it covers.
    const listed = filtered;

    // Chart → list: make sure the selected row is inside the visible page
    // before the list tries to scroll to it. Indexed against what the list
    // actually shows — a dot outside the dragged range has no row to reveal.
    function handleSelect(id: string | null) {
        setSelectedId(id);
        if (id && listed) {
            const index = listed.findIndex((t) => t.id === id);
            if (index >= visibleCount) {
                setVisibleCount(Math.ceil((index + 1) / page) * page);
            }
        }
    }

    const loading = filtered === null || listed === null;
    // A refetch with data already on screen: keep it, dim it, let the chart
    // tween into the new series when it arrives. Only the first load blanks.
    const refreshing = fetching && !loading;

    // One sentence before the dots: what left, in how many charges, over which
    // days. Built from the rows on screen so it cannot disagree with the chart
    // or the list, and absent while there are no rows — a total of $0 over an
    // empty window would be a claim, not a fact.
    const orientation = useMemo(() => {
        if (!filtered || filtered.length === 0) return null;
        const expenses = filtered.filter((t) => t.type === "expense");
        const spent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const span =
            bounds.start && bounds.end
                ? `del ${dayLabel(fromIso(bounds.start))} al ${dayLabel(fromIso(bounds.end))}`
                : "en todo tu historial";
        const needle = search.trim() ? ` que contienen «${search.trim()}»` : "";
        if (expenses.length === 0) {
            return `Sin cargos ${span}${needle}; ${filtered.length.toLocaleString("es-MX")} abono${filtered.length === 1 ? "" : "s"}.`;
        }
        return `Salieron ${mxn(spent)} en ${expenses.length.toLocaleString("es-MX")} cargo${expenses.length === 1 ? "" : "s"} ${span}${needle}.`;
    }, [filtered, bounds.start, bounds.end, search]);
    const filtering = Boolean(search.trim()) && Boolean(listed && listed.length > 0);

    return (
        <div className="space-y-4 sm:space-y-6">
            {error && <BackendNotice what="tus movimientos" detail={error} />}

            <ChartCard
                title="Cada movimiento"
                subtitle={orientation}
                action={<PanelSettingsToggle />}
                controls={
                    <>
                        <PanelChoice<ChartMode>
                            label="Gráfica"
                            value={mode}
                            options={CHART_MODES.map((m) => ({
                                value: m,
                                label: CHART_MODE_LABELS[m],
                            }))}
                            onChange={(m) => {
                                track("movimientos.chart_mode", { mode: m });
                                setChartCfg({ mode: m });
                            }}
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
                        onClear={() => {
                            setSearch("");
                        }}
                    />
                ) : (
                    <div className={cn("transition-opacity duration-300", refreshing && "opacity-50")}>
                    <LensChips
                        groups={lensGroups}
                        focus={lensFocus}
                        onFocus={onLensFocus}
                        className="mb-3"
                    />
                    <ChartLens
                        groups={lensGroups}
                        focus={lensFocus}
                        onFocus={onLensFocus}
                        actions={(l) => (
                            <>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        track("movimientos.row_select", { source: "lens" });
                                        handleSelect(l.ref ?? null);
                                    }}
                                >
                                    Ver
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        track("lens.dismiss", { chart: "movimientos", kind: l.kind });
                                        if (l.ref) dismissAttention(l.ref);
                                        setLensFocus(null);
                                    }}
                                >
                                    Es mío
                                </Button>
                            </>
                        )}
                    >
                        <TransactionsChart
                            transactions={filtered}
                            mode={mode}
                            colorMode={colorMode}
                            categories={categories}
                            showIncome={chartCfg.showIncome}
                            grain={grain}
                            selectedId={selectedId}
                            onSelect={(id) => {
                                if (id) track("movimientos.row_select", { source: "chart" });
                                handleSelect(id);
                            }}
                            onRangeSelect={(r) =>
                                r && selectCustom(msToIso(r.start), msToIso(r.end), "drag:movimientos")
                            }
                        />
                    </ChartLens>
                    </div>
                )}
            </ChartCard>

            <div className="min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                <h2 className="flex items-baseline gap-2 text-title-sm font-normal text-ink">
                    Movimientos
                    {listed && (
                        <span className="tabular font-sans text-body-sm text-graphite">
                            {listed.length.toLocaleString("es-MX")}
                        </span>
                    )}
                </h2>

                <label
                    className={cn(
                        "mt-4 flex h-11 w-full items-center gap-2.5 rounded-control border border-muted bg-paper px-4",
                        "transition-colors duration-100 focus-within:border-ink",
                        search.trim() && "border-ink"
                    )}
                >
                    <Search size={18} aria-hidden className="shrink-0 text-graphite" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                            if (!search && e.target.value) track("movimientos.search");
                            setSearch(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setSearch("");
                        }}
                        placeholder="Buscar movimiento"
                        aria-label="Buscar movimiento"
                        className={cn(
                            "w-full bg-transparent text-body text-ink outline-none placeholder:text-ash",
                            // The browser's own clear glyph doubles ours.
                            "[&::-webkit-search-cancel-button]:hidden"
                        )}
                    />
                    {search && (
                        <button
                            type="button"
                            aria-label="Limpiar búsqueda"
                            onClick={() => setSearch("")}
                            className="-mr-1 rounded-full p-1 text-ash transition-colors duration-100 hover:text-ink"
                        >
                            <X size={16} aria-hidden />
                        </button>
                    )}
                </label>
                {filtering && (
                    <p className="mt-2 text-label text-graphite">
                        El conjunto es la búsqueda, no solo las filas visibles. Destilda
                        las excepciones.
                    </p>
                )}

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
                    ) : listed.length === 0 ? (
                        <EmptyNote
                            search={search}
                            ranged={timeWindow.kind === "custom"}
                            onClear={() => {
                                setSearch("");
                                clearCustom();
                            }}
                        />
                    ) : (
                        <TransactionsList
                            items={listed}
                            visibleCount={visibleCount}
                            onShowMore={() => {
                                track("movimientos.show_more", { visible: visibleCount + page });
                                setVisibleCount((c) => c + page);
                            }}
                            selectedId={selectedId}
                            onSelect={(id) => {
                                if (id) track("movimientos.row_select", { source: "list" });
                                handleSelect(id);
                            }}
                            attention={attentionByRow}
                            editing={{
                                onPatch: (t, patch) => patchItem(t.id, patch),
                                onBulkApplied: reload,
                            }}
                            membership={
                                filtering
                                    ? {
                                          excluded,
                                          onToggle: (id, inSet) => {
                                              setExcluded((cur) => {
                                                  const next = new Set(cur);
                                                  if (inSet) next.delete(id);
                                                  else next.add(id);
                                                  return next;
                                              });
                                          },
                                      }
                                    : undefined
                            }
                        />
                    )}
                </div>
            </div>

            {filtering && listed && (
                <LecturaDock
                    summary={`${(listed.length - excluded.size).toLocaleString("es-MX")} movimientos · contiene «${search.trim()}»`}
                    chips={[
                        search.trim(),
                        ...(excluded.size
                            ? [
                                  excluded.size === 1
                                      ? "1 fuera"
                                      : `${excluded.size} fuera`,
                              ]
                            : []),
                    ]}
                    busy={opening}
                    onRead={() => {
                        const draft = draftFromNeedle(search, Array.from(excluded));
                        if (draft) void openDraft(draft);
                    }}
                    onClear={() => {
                        setSearch("");
                        setExcluded(new Set());
                    }}
                />
            )}
        </div>
    );
}


function EmptyNote({
    search,
    ranged = false,
    onClear,
}: {
    search: string;
    /** A chart-dragged range is on — the emptiness may be its doing. */
    ranged?: boolean;
    onClear: () => void;
}) {
    const narrowed = Boolean(search.trim()) || ranged;
    return (
        <EmptyState
            icon={narrowed ? SearchX : Inbox}
            title={
                search.trim()
                    ? `Nada coincide con «${search.trim()}»`
                    : ranged
                      ? "Sin movimientos en ese rango"
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

/** Local midnight, so the label is the day in the window and not the one before. */
function fromIso(day: string): Date {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** "Cargo inusual" → "Cargos inusuales"; the other labels pluralise by a plain s. */
function plural(label: string): string {
    const known: Record<string, string> = {
        "Cargo inusual": "Cargos inusuales",
        "Posible duplicado": "Posibles duplicados",
        "Comercio nuevo": "Comercios nuevos",
    };
    return known[label] ?? `${label}s`;
}
