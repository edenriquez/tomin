"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Inbox, Search, SearchX, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTimeWindow } from "@/components/TimeWindowProvider";
import { useBankScope } from "@/lib/banks";
import { categoryFamily, categoryName, useCategories } from "@/lib/categories";
import { track } from "@/lib/telemetry";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { useOverlay } from "@/components/ui/useOverlay";
import { usePortal } from "@/components/ui/usePortal";
import {
    EMPTY_QUERY,
    applyQuery,
    clearChip,
    periodChipLabel,
    queryChips,
    queryIsActive,
    type MovimientosQuery,
} from "@/lib/movimientosQuery";
import { useMovimientosSearch } from "./MovimientosSearchProvider";
import { CriteriosRail } from "./CriteriosRail";
import { ReclasificacionPanel } from "./ReclasificacionPanel";
import { TransactionsList } from "./TransactionsList";
import { useTransactions } from "./useTransactions";

const PAGE = 50;
type Phase = "enter" | "open" | "leave";

/**
 * The list, as a dialog. Grows from the header field; Escape commits and
 * collapses. Date is edited here and written to the TimeWindow only on close,
 * so the face underneath does not refetch while the user is still choosing.
 */
export function MovimientosModal({
    dataVersion,
    refresh,
}: {
    dataVersion: number;
    refresh: () => void;
}) {
    const { open, closeModal, query, setQuery, seedGen, openingSeed, searchInputRef } =
        useMovimientosSearch();
    const { bounds: windowBounds, selectCustom, selectPreset, anchor } = useTimeWindow();
    const { statementIds } = useBankScope(dataVersion);
    const categories = useCategories();
    const mounted = usePortal();

    const [render, setRender] = useState(false);
    const [phase, setPhase] = useState<Phase>("enter");
    const [draft, setDraft] = useState<MovimientosQuery>(query);
    const [start, setStart] = useState(windowBounds.start ?? "");
    const [end, setEnd] = useState(windowBounds.end ?? "");
    const [datesDirty, setDatesDirty] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE);
    const patched = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const appliedGen = useRef(-1);

    if (open && !render) {
        setRender(true);
        setPhase("enter");
    }

    // Same render as `open`/`seedGen` — an effect can still see the previous
    // draft if React splits the context update.
    if (open && appliedGen.current !== seedGen) {
        appliedGen.current = seedGen;
        setDraft(openingSeed ?? query);
        setStart(windowBounds.start ?? "");
        setEnd(windowBounds.end ?? "");
        setDatesDirty(false);
        setSelectedId(null);
        setVisibleCount(PAGE);
        patched.current = false;
    }
    if (!open) appliedGen.current = -1;

    useLayoutEffect(() => {
        if (!render) return;
        if (open) {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduce) {
                setPhase("open");
                return;
            }
            const force = window.setTimeout(() => setPhase("open"), 280);
            return () => window.clearTimeout(force);
        }
        setPhase("leave");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const t = window.setTimeout(() => setRender(false), reduce ? 80 : 200);
        return () => window.clearTimeout(t);
    }, [open, render]);

    const fetchBounds = useMemo(() => {
        if (start && end) return start <= end ? { start, end } : { start: end, end: start };
        if (start) return { start, end: start };
        if (end) return { start: end, end };
        return {};
    }, [start, end]);

    const { items, total, error, reload, patchItem, loading } = useTransactions(
        fetchBounds,
        dataVersion,
        statementIds
    );

    const listed = useMemo(
        () =>
            items === null ? null : applyQuery(items, draft, (id) => categoryFamily(categories, id)),
        [items, draft, categories]
    );

    useEffect(() => {
        setSelectedId(null);
        setVisibleCount(PAGE);
    }, [draft, start, end]);

    const commitAndClose = useCallback(() => {
        setQuery(draft);
        if (datesDirty) {
            if (start && end) {
                const a = start <= end ? start : end;
                const b = start <= end ? end : start;
                selectCustom(a, b, "modal");
            } else {
                selectPreset("all");
            }
        }
        if (patched.current) refresh();
        track("movimientos.modal_close", {
            needle: Boolean(draft.needle.trim()),
            merchants: draft.merchantSlugs.length,
            categories: draft.categoryIds.length,
            amount: draft.amountBucket ?? "",
            kind: draft.kind,
            date_changed: datesDirty,
        });
        closeModal();
    }, [draft, datesDirty, start, end, setQuery, selectCustom, selectPreset, refresh, closeModal]);

    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;
    const onEscape = useCallback(() => {
        if (selectedIdRef.current) {
            setSelectedId(null);
            return;
        }
        commitAndClose();
    }, [commitAndClose]);

    useOverlay(render, onEscape, panelRef);

    const selected = listed?.find((t) => t.id === selectedId) ?? null;

    const chips = queryChips(draft, (id) => categoryName(categories, id));
    const extra = queryIsActive(draft);
    const periodLabel = periodChipLabel(fetchBounds.start, fetchBounds.end);
    const shortcut = isApple() ? "⌘K" : "Ctrl K";

    if (!mounted || !render) return null;

    const count = listed?.length ?? 0;

    return createPortal(
        <div className="fixed inset-0 z-modal flex items-center justify-center p-0 sm:p-6">
            <div
                onClick={commitAndClose}
                aria-hidden
                className={cn(
                    "movimientos-modal-scrim absolute inset-0 bg-soot/40",
                    phase === "enter" && "modal-enter",
                    phase === "leave" && "modal-leave",
                    phase === "open" && "is-open"
                )}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Buscar un movimiento"
                tabIndex={-1}
                className={cn(
                    "movimientos-modal-panel relative flex h-dvh w-full flex-col overflow-hidden",
                    "bg-paper outline-none sm:h-[min(860px,90dvh)] sm:max-w-[min(1280px,94vw)] sm:rounded-panel sm:border sm:border-mist sm:shadow-float",
                    phase === "enter" && "modal-enter",
                    phase === "leave" && "modal-leave",
                    phase === "open" && "is-open"
                )}
            >
                <header className="shrink-0 border-b border-mist px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-3">
                        <label
                            className={cn(
                                "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-control border bg-paper px-4",
                                draft.needle.trim() ? "border-ink" : "border-muted",
                                "focus-within:border-ink"
                            )}
                        >
                            <Search size={18} aria-hidden className="shrink-0 text-graphite" />
                            <input
                                ref={searchInputRef}
                                type="search"
                                value={draft.needle}
                                onChange={(e) => {
                                    if (!draft.needle && e.target.value) track("movimientos.search");
                                    setDraft({ ...draft, needle: e.target.value });
                                }}
                                placeholder="Buscar un movimiento"
                                aria-label="Buscar un movimiento"
                                className={cn(
                                    "w-full bg-transparent text-body text-ink outline-none placeholder:text-ash",
                                    "[&::-webkit-search-cancel-button]:hidden"
                                )}
                            />
                            {draft.needle && (
                                <button
                                    type="button"
                                    aria-label="Limpiar búsqueda"
                                    onClick={() => setDraft({ ...draft, needle: "" })}
                                    className="-mr-1 rounded-full p-1 text-ash hover:text-ink"
                                >
                                    <X size={16} aria-hidden />
                                </button>
                            )}
                        </label>
                        <kbd className="hidden rounded-[4px] border border-mist bg-fog px-1.5 py-0.5 font-sans text-label font-medium text-graphite sm:inline">
                            {shortcut}
                        </kbd>
                        <span className="hidden text-label text-ash sm:inline">Esc cierra</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-graphite">
                        <span className="font-medium text-ink">La fecha tiene prioridad</span>
                        <span aria-hidden>·</span>
                        <span>
                            {loading && listed === null
                                ? "Leyendo el periodo…"
                                : `${count.toLocaleString("es-MX")} movimiento${count === 1 ? "" : "s"} en el periodo`}
                        </span>
                        {extra && (
                            <button
                                type="button"
                                onClick={() => setDraft(EMPTY_QUERY)}
                                className="ml-auto underline decoration-mist underline-offset-4 hover:text-ink"
                            >
                                Quitar criterios
                            </button>
                        )}
                    </div>
                </header>

                <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
                    <div className="max-h-64 shrink-0 overflow-y-auto border-b border-mist lg:max-h-none lg:border-b-0">
                        <CriteriosRail
                            items={items}
                            query={draft}
                            onQuery={setDraft}
                            start={start}
                            end={end}
                            onDates={(a, b) => {
                                setStart(a);
                                setEnd(b);
                                setDatesDirty(true);
                            }}
                            categories={categories}
                            calendarResetKey={open}
                            dateAnchor={anchor}
                        />
                    </div>

                    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                        <div className="flex flex-wrap items-center gap-1.5 px-5 pt-4">
                            <Chip
                                label={periodLabel}
                                onClear={
                                    datesDirty
                                        ? () => {
                                              setStart(windowBounds.start ?? "");
                                              setEnd(windowBounds.end ?? "");
                                              setDatesDirty(false);
                                          }
                                        : undefined
                                }
                            />
                            {chips.map((chip) => (
                                <Chip
                                    key={chip.key}
                                    label={chip.label}
                                    onClear={() => setDraft(clearChip(draft, chip))}
                                />
                            ))}
                        </div>

                        <div className="mt-3 flex items-baseline justify-between px-5">
                            <h2 className="flex items-baseline gap-2 text-title-sm font-normal text-ink">
                                Movimientos
                                {listed && (
                                    <span className="tabular font-sans text-body-sm text-graphite">
                                        {listed.length.toLocaleString("es-MX")}
                                    </span>
                                )}
                                {selectedId && (
                                    <span className="font-sans text-body-sm text-ash">
                                        · 1 en edición
                                    </span>
                                )}
                            </h2>
                            <p className="text-label text-ash">
                                {selected
                                    ? "Reclasificación abierta"
                                    : "Elige un movimiento para reclasificar"}
                            </p>
                        </div>

                        {error && (
                            <p className="px-5 pt-3 text-body-sm text-negative">{error}</p>
                        )}

                        {items !== null && total > items.length && (
                            <p className="px-5 pt-2 text-label text-graphite">
                                Mostrando los {items.length.toLocaleString("es-MX")} más recientes
                                de {total.toLocaleString("es-MX")}.
                            </p>
                        )}

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
                            {listed === null ? (
                                <ListSkeleton />
                            ) : listed.length === 0 ? (
                                <EmptyState
                                    icon={extra ? SearchX : Inbox}
                                    title={
                                        extra
                                            ? "Nada coincide con estos criterios"
                                            : "Sin movimientos en este periodo"
                                    }
                                    action={
                                        extra ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDraft(EMPTY_QUERY)}
                                            >
                                                Quitar criterios
                                            </Button>
                                        ) : undefined
                                    }
                                >
                                    {extra
                                        ? "Los criterios están reduciendo lo que se lista."
                                        : "Prueba con un periodo más amplio, o sube un estado de cuenta que lo cubra."}
                                </EmptyState>
                            ) : (
                                <TransactionsList
                                    items={listed}
                                    visibleCount={visibleCount}
                                    onShowMore={() => setVisibleCount((c) => c + PAGE)}
                                    selectedId={selectedId}
                                    onSelect={(id) => {
                                        if (id) track("movimientos.row_select", { source: "modal" });
                                        setSelectedId(id);
                                    }}
                                    expandEditor={false}
                                    editing={{
                                        onPatch: (t, patch) => {
                                            patched.current = true;
                                            void patchItem(t.id, patch);
                                        },
                                        onBulkApplied: () => {
                                            patched.current = true;
                                            reload();
                                        },
                                    }}
                                />
                            )}
                        </div>
                    </section>

                    {selected && (
                        <div className="absolute inset-0 z-10 flex justify-end lg:static lg:z-auto lg:w-[380px] lg:shrink-0 lg:border-l lg:border-mist">
                            <button
                                type="button"
                                aria-label="Cerrar reclasificación"
                                onClick={() => setSelectedId(null)}
                                className="absolute inset-0 bg-soot/20 lg:hidden"
                            />
                            <div className="relative h-full w-full max-w-md border-l border-mist bg-paper lg:max-w-none lg:border-l-0">
                                <ReclasificacionPanel
                                    key={selected.id}
                                    transaction={selected}
                                    onPatch={(patch) => {
                                        patched.current = true;
                                        void patchItem(selected.id, patch);
                                    }}
                                    onBulkApplied={() => {
                                        patched.current = true;
                                        reload();
                                    }}
                                    onClose={() => setSelectedId(null)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <footer className="shrink-0 border-t border-mist px-5 py-2.5 text-label text-ash">
                    Al cerrar, el periodo se aplica a la vista. El resto de criterios vive
                    dentro de esa fecha.
                </footer>
            </div>
        </div>,
        document.body
    );
}

function Chip({ label, onClear }: { label: string; onClear?: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-tag bg-fog py-0.5 pl-2 pr-1 text-label text-ink ring-1 ring-inset ring-mist">
            {label}
            {onClear && (
                <button
                    type="button"
                    aria-label={`Quitar ${label}`}
                    onClick={onClear}
                    className="rounded-full p-0.5 text-ash hover:text-ink"
                >
                    <X size={12} aria-hidden />
                </button>
            )}
        </span>
    );
}

function ListSkeleton() {
    return (
        <div aria-hidden className="-mx-5 divide-y divide-mist border-t border-mist">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 px-5 py-3.5">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-2/5" />
                        <Skeleton className="h-5 w-28 rounded-tag" />
                    </div>
                    <div className="space-y-2 text-right">
                        <Skeleton className="ml-auto h-3.5 w-20" />
                        <Skeleton className="ml-auto h-3 w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function isApple(): boolean {
    if (typeof navigator === "undefined") return true;
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}
