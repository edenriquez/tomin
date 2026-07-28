"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Inbox, SearchX } from "lucide-react";
import { api, type Transaction } from "@/lib/api";
import { cn } from "@/lib/cn";
import { mxn2 } from "@/lib/format";
import { createTag, listTags, tagIndex, isDuplicateTagError, type Tag } from "@/lib/tags";
import {
    PAGE_SIZE,
    RANGES,
    filtersFromParams,
    filtersToParams,
    filtersToQuery,
    hasActiveFilters,
    matchRange,
    resolveRange,
    type TxFilters,
} from "@/lib/transactions";
import { UploadButton } from "@/components/UploadButton";
import { BulkTagBar } from "@/components/transactions/BulkTagBar";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import {
    Button,
    Card,
    EmptyState,
    Input,
    PageHeader,
    Pagination,
    SearchInput,
    Table,
    TableSkeleton,
    Tag as TagChip,
    useToast,
    type Column,
} from "@/components/ui";

/**
 * Why there is no "Ingresos / Gastos" control here:
 *
 * `GET /api/transactions` has no `type` parameter. Filtering the 25 rows the
 * server already returned would produce a page showing 4 rows under a footer
 * reading "Mostrando 1–25 de 340", and page 2 of "Ingresos" would be a
 * different, unrelated slice. In a finance app a filter that doesn't reach the
 * total is worse than no filter, so the control waits for the API.
 *
 * The category *name* is a different compromise: there is no
 * `GET /api/categories`, but the all-time summary carries id -> name for every
 * category that has movements, which is every category the user can actually
 * be looking at. So the sheet names the category, and falls back rather than
 * inventing one.
 */

export default function MovimientosPage() {
    // `useSearchParams` opts the tree out of prerendering; without a boundary
    // `next build` fails on this route.
    return (
        <Suspense fallback={<MovimientosFallback />}>
            <Movimientos />
        </Suspense>
    );
}

function MovimientosFallback() {
    return (
        <div className="space-y-12">
            <PageHeader
                title="Movimientos"
                subtitle="Analiza tus ingresos y gastos por categoria y comercio."
            />
            <Card>
                <TableSkeleton columns={5} />
            </Card>
        </div>
    );
}

function Movimientos() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // The URL is the state. Everything below reads from it, so the back button
    // and a pasted link land on exactly the same view.
    const filters = useMemo(
        () => filtersFromParams(new URLSearchParams(searchParams.toString())),
        [searchParams]
    );

    const [items, setItems] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    /** False until the first response lands, so the footer never appears empty. */
    const [loaded, setLoaded] = useState(false);
    /** Bumped after a mutation to refetch the page the user is looking at. */
    const [reloadKey, setReloadKey] = useState(0);

    const [tags, setTags] = useState<Tag[]>([]);
    const [categories, setCategories] = useState<Map<string, string>>(new Map());
    const [selected, setSelected] = useState<string[]>([]);
    const [openId, setOpenId] = useState<string | null>(null);

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    /** Any change other than paging returns to page 1: page 4 of a new filter
     *  is a blank screen the user didn't ask for. */
    const update = useCallback(
        (patch: Partial<TxFilters>) => {
            const next = { ...filtersRef.current, page: 1, ...patch };
            const qs = filtersToParams(next).toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [router, pathname]
    );

    const query = filtersToQuery(filters);
    const reload = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        let stale = false;
        setLoading(true);
        api.transactions(query)
            .then((res) => {
                if (stale) return;
                setItems(res.items);
                setTotal(res.total);
                setError(null);
            })
            .catch((e: Error) => {
                if (stale) return;
                setItems([]);
                setTotal(0);
                setError(e.message);
            })
            .finally(() => {
                if (stale) return;
                setLoading(false);
                setLoaded(true);
            });
        // Responses can land out of order while the user types; only the
        // newest request is allowed to write to state.
        return () => {
            stale = true;
        };
    }, [query, reloadKey]);

    // A selection is a set of rows on screen. When the rows change — new page,
    // new filter — carrying it over would leave the bar claiming "30
    // seleccionados" over movements the user can no longer see.
    useEffect(() => {
        setSelected([]);
    }, [query]);

    // Tags and category names are reference data: fetched once, refreshed only
    // when this page creates a tag itself.
    useEffect(() => {
        let alive = true;
        listTags()
            .then((t) => alive && setTags(t))
            .catch(() => undefined);
        api.summary()
            .then(
                (s) =>
                    alive &&
                    setCategories(
                        new Map(
                            s.by_category
                                .filter((c) => c.category_id)
                                .map((c) => [c.category_id as string, c.category_name])
                        )
                    )
            )
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, []);

    const index = useMemo(() => tagIndex(tags), [tags]);

    const categoryName = useCallback(
        (categoryId: string | null) => {
            if (!categoryId) return "Sin categoria";
            return categories.get(categoryId) ?? "Categoria no disponible";
        },
        [categories]
    );

    /** Creates the tag and folds it into the local list, so the combobox in the
     *  sheet and the one in the bulk bar both see it without a refetch. */
    const onCreateTag = useCallback(
        async (name: string): Promise<Tag | null> => {
            try {
                const tag = await createTag({ name });
                setTags((current) => [...current, tag]);
                return tag;
            } catch (e) {
                toast(
                    isDuplicateTagError(e)
                        ? `Ya tienes una etiqueta llamada "${name}".`
                        : `No se pudo crear la etiqueta: ${(e as Error).message}`,
                    "negative"
                );
                return null;
            }
        },
        [toast]
    );

    const allSelected = items.length > 0 && selected.length === items.length;

    const toggleAll = useCallback(() => {
        setSelected((current) => (current.length === items.length ? [] : items.map((t) => t.id)));
    }, [items]);

    const toggleOne = useCallback((id: string) => {
        setSelected((current) =>
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
        );
    }, []);

    const columns: Column<Transaction>[] = useMemo(
        () => [
            {
                key: "select",
                width: "2.5rem",
                header: (
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Seleccionar todos los de esta pagina"
                        className="h-4 w-4 accent-ember"
                    />
                ),
                cell: (t) => (
                    <input
                        type="checkbox"
                        checked={selected.includes(t.id)}
                        // The row opens the sheet; the checkbox must not.
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleOne(t.id)}
                        aria-label={`Seleccionar ${t.description}`}
                        className="h-4 w-4 accent-ember"
                    />
                ),
            },
            {
                key: "date",
                header: "Fecha",
                width: "7rem",
                cell: (t) => <span className="tabular text-pewter">{t.date}</span>,
            },
            {
                key: "concept",
                header: "Concepto",
                cell: (t) => (
                    <div className="min-w-0">
                        <span title={t.raw_description ?? undefined}>{t.description}</span>
                        {(t.tag_ids?.length ?? 0) > 0 && (
                            <span className="mt-1 flex flex-wrap gap-1">
                                {t.tag_ids?.map((id) => (
                                    <TagChip key={id}>{index.get(id)?.name ?? "etiqueta"}</TagChip>
                                ))}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "status",
                header: "Estado",
                width: "8rem",
                cell: (t) => (
                    <span className="flex flex-wrap gap-1">
                        <TagChip tone={t.status === "completed" ? "positive" : "neutral"}>
                            {t.status === "completed" ? "Completado" : "Pendiente"}
                        </TagChip>
                        {t.excluded_from_stats && <TagChip tone="estimate">Excluido</TagChip>}
                    </span>
                ),
            },
            {
                key: "amount",
                header: "Monto (MXN)",
                numeric: true,
                width: "10rem",
                // Income is the exception and gets the colour; an expense is the
                // default state of a bank statement and stays ink.
                cell: (t) => (
                    <span className={cn(t.type === "income" && "text-positive")}>
                        {t.type === "income" ? "+" : "−"}
                        {mxn2(Math.abs(t.amount))}
                    </span>
                ),
            },
        ],
        [allSelected, toggleAll, toggleOne, selected, index]
    );

    const activeRange = matchRange(filters.start, filters.end);
    const filtered = hasActiveFilters(filters);
    const open = useMemo(() => items.find((t) => t.id === openId) ?? null, [items, openId]);

    // SearchInput owns its text, so clearing the filters from outside it has to
    // remount it. Bumping a key does that; keying on `filters.q` itself would
    // remount mid-typing and steal focus the moment the debounce fired.
    const [searchKey, setSearchKey] = useState(0);

    const clearFilters = useCallback(() => {
        setSearchKey((k) => k + 1);
        router.replace(pathname, { scroll: false });
    }, [router, pathname]);

    return (
        <div className="space-y-12">
            <PageHeader
                title="Movimientos"
                subtitle="Analiza tus ingresos y gastos por categoria y comercio."
                actions={
                    <Button
                        variant="secondary"
                        icon={<Download size={16} />}
                        disabled={total === 0}
                        onClick={() => {
                            // Same filters, no pagination: the file is the whole
                            // filtered set, not the 25 rows currently on screen.
                            window.location.href = api.transactionsExportUrl(
                                filtersToQuery(filters, { paginate: false })
                            );
                        }}
                    >
                        Exportar CSV
                    </Button>
                }
            />

            <Card>
                <div className="mb-6 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <SearchInput
                            key={searchKey}
                            className="min-w-[16rem] flex-1"
                            defaultValue={filters.q}
                            onSearch={(q) => update({ q })}
                            placeholder="Buscar comercio (ej. OXXO, Uber)..."
                            aria-label="Buscar movimientos"
                        />
                        <div
                            role="group"
                            aria-label="Periodo"
                            className="inline-flex rounded-control border border-mist p-0.5"
                        >
                            {RANGES.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    aria-pressed={r.id === activeRange}
                                    onClick={() => update(resolveRange(r.id))}
                                    className={cn(
                                        "rounded-control px-3 py-1.5 text-body-sm font-medium",
                                        r.id === activeRange
                                            ? "bg-fog text-ink"
                                            : "text-graphite hover:text-ink"
                                    )}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-label text-pewter">
                            Desde
                            <Input
                                type="date"
                                className="h-9 w-40"
                                value={filters.start}
                                max={filters.end || undefined}
                                onChange={(e) => update({ start: e.target.value })}
                            />
                        </label>
                        <label className="flex items-center gap-2 text-label text-pewter">
                            Hasta
                            <Input
                                type="date"
                                className="h-9 w-40"
                                value={filters.end}
                                min={filters.start || undefined}
                                onChange={(e) => update({ end: e.target.value })}
                            />
                        </label>
                        {filtered && (
                            <Button size="sm" variant="ghost" onClick={clearFilters}>
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                </div>

                {error && (
                    <p className="mb-4 rounded-control border-l-2 border-ember bg-fog p-3 text-body-sm text-graphite">
                        No se pudieron cargar los movimientos ({error}). Revisa que el backend
                        este corriendo en el puerto 8000.
                    </p>
                )}

                {selected.length > 0 && (
                    <BulkTagBar
                        count={selected.length}
                        transactionIds={selected}
                        tags={tags}
                        onCreateTag={onCreateTag}
                        onDone={reload}
                        onClear={() => setSelected([])}
                    />
                )}

                <Table
                    caption="Movimientos"
                    columns={columns}
                    rows={items}
                    rowKey={(t) => t.id}
                    onRowClick={(t) => setOpenId(t.id)}
                    loading={loading}
                    skeletonRows={8}
                    empty={
                        error ? null : filtered ? (
                            <EmptyState
                                icon={<SearchX size={18} />}
                                title="Sin resultados"
                                description="No hay movimientos con estos filtros."
                                action={
                                    <Button variant="secondary" onClick={clearFilters}>
                                        Limpiar filtros
                                    </Button>
                                }
                            />
                        ) : (
                            <EmptyState
                                icon={<Inbox size={18} />}
                                title="Aun no hay movimientos."
                                description="Sube un estado de cuenta y Tomin extrae los movimientos."
                                action={
                                    <div className="w-56">
                                        <UploadButton onDone={() => router.refresh()} />
                                    </div>
                                }
                            />
                        )
                    }
                />

                {loaded && total > 0 && (
                    <Pagination
                        className="mt-4"
                        label="Mostrando"
                        page={filters.page}
                        pageSize={PAGE_SIZE}
                        total={total}
                        onPageChange={(page) => update({ page })}
                    />
                )}
            </Card>

            {open && (
                // Keyed by id: opening a different row rebuilds the draft state
                // instead of showing the previous movement's unsaved edits.
                <TransactionSheet
                    key={open.id}
                    transaction={open}
                    tags={tags}
                    categoryName={categoryName}
                    onCreateTag={onCreateTag}
                    onSaved={reload}
                    onClose={() => setOpenId(null)}
                />
            )}
        </div>
    );
}
