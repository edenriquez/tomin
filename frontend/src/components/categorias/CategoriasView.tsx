"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shapes } from "lucide-react";
import {
    categoryName,
    UNCATEGORIZED_COLOR,
    useCategories,
} from "@/lib/categories";
import { useBankScope } from "@/lib/banks";
import { monthLabel, mxn } from "@/lib/format";
import {
    isMetricError,
    num,
    parsePeriodKey,
    queryMetrics,
    type MetricEntry,
} from "@/lib/metrics";
import { resolveWindow, windowToPeriod } from "@/lib/window";
import { useAppData } from "@/components/AppChrome";
import { BackendNotice, EmptyState, Skeleton } from "@/components/ui";
import { ChartCard } from "@/components/ChartCard";
import { RangeBrush, type BucketRange } from "@/components/charts/RangeBrush";
import { TransactionsList } from "@/components/movimientos/TransactionsList";
import { useTransactions } from "@/components/movimientos/useTransactions";
import { CategorySpendChart, type MonthlyCategoryPoint } from "./CategorySpendChart";
import { CategoryFilterBar, type CategoryChip } from "./CategoryFilterBar";

/**
 * The Categorías view: one stacked column per month of the selected period,
 * layered by category — each month's height is what it cost, its layers say
 * on what — and, under it, the movements those layers are made of.
 *
 * The chart is an aggregate and the list is its evidence. Clicking a layer
 * filters the list to that category *and* that month; the chips do the same
 * for a category across the whole period. Without this the view could only
 * ever be admired, never checked — and "¿qué fue ese mes de Comida?" is the
 * first question the chart provokes.
 *
 * Two sources feed this screen and they are reconciled deliberately: the
 * columns come from the metrics cube (aggregated server-side, keyed by
 * category NAME), the rows come from the transactions API (keyed by category
 * ID). `sameCategory` is the seam — see the note there.
 */

/** Rows revealed per page in the evidence list. */
const PAGE = 50;

/**
 * The cube labels the unlabelled bucket "Sin Categoria"; the frontend says
 * "Sin categoría". Comparing raw strings would silently drop every
 * uncategorized movement out of its own filter, so names are compared
 * accent- and case-insensitively.
 */
function normalize(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function sameCategory(a: string, b: string): boolean {
    return normalize(a) === normalize(b);
}

export function CategoriasView() {
    const { windowId, dataVersion } = useAppData();
    const categories = useCategories();
    const [entry, setEntry] = useState<MetricEntry | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Bumped when an edit here changes a category: the cube has to be asked
    // again, or the columns would keep showing the category the user just
    // corrected.
    const [edits, setEdits] = useState(0);

    // What the list is showing. Both come from the chart or the chips, and
    // both are session state — a filter is a question, not a preference.
    // Months are a RANGE ("2026-02".."2026-04"): a layer click asks about one
    // month (start === end), a drag across the columns asks about several.
    const [pickedCategory, setPickedCategory] = useState<string | null>(null);
    const [pickedMonths, setPickedMonths] = useState<{ start: string; end: string } | null>(
        null
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE);

    const { statementIds } = useBankScope(dataVersion);
    const scopeKey = statementIds?.join("|") ?? "";

    const period = useMemo(() => windowToPeriod(windowId), [windowId]);
    const bounds = useMemo(() => resolveWindow(windowId), [windowId]);

    useEffect(() => {
        let stale = false;
        setEntry(null);
        queryMetrics(period, [
            // Month grain alongside the category dimension: rows arrive as
            // {month, category, expense_amount} — the stacked reading's shape.
            {
                key: "cats",
                metric: "spend_by_category",
                grain: "month",
                ...(statementIds ? { filters: { statement: statementIds } } : {}),
            },
        ])
            .then((batch) => {
                if (stale) return;
                setEntry(batch.results.cats);
                setError(null);
            })
            .catch((e) => {
                if (!stale) setError((e as Error).message);
            });
        return () => {
            stale = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, dataVersion, edits, scopeKey]);

    // The rows behind the columns. Same window, same cap as Movimientos.
    const {
        items,
        error: txError,
        reload,
        patchItem,
    } = useTransactions(bounds, dataVersion, statementIds);

    // A new period is a new reading: filters and paging reset rather than
    // silently applying to data the user hasn't looked at yet.
    useEffect(() => {
        setPickedCategory(null);
        setPickedMonths(null);
        setSelectedId(null);
        setVisibleCount(PAGE);
    }, [windowId]);

    const result = entry && !isMetricError(entry) ? entry : null;
    const loading = entry === null && !error;

    const points: MonthlyCategoryPoint[] = useMemo(() => {
        if (!result) return [];
        return (
            result.rows
                .map((row) => {
                    const month = String(row.month ?? "");
                    const date = parsePeriodKey(month);
                    return {
                        month,
                        monthLabel: date ? monthLabel(date, true) : month,
                        category: String(row.category ?? "Sin Categoria"),
                        amount: num(row.expense_amount),
                    };
                })
                // The API orders breakdowns by measure; the month axis must be
                // chronological regardless.
                .sort((a, b) => a.month.localeCompare(b.month))
        );
    }, [result]);

    // The metric rows carry the category NAME (the cube's dimension); colors
    // come from the taxonomy, matched by name.
    const categoryColors = useMemo(() => {
        const map = new Map<string, string>();
        categories?.forEach((info) => map.set(info.name, info.color ?? UNCATEGORIZED_COLOR));
        return map;
    }, [categories]);

    /** One chip per category the period actually touched, biggest first —
     *  the stack's own order, so chart and chips agree on what matters. */
    const chips: CategoryChip[] = useMemo(() => {
        const totals = new Map<string, number>();
        for (const p of points) totals.set(p.category, (totals.get(p.category) ?? 0) + p.amount);
        return Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, amount]) => ({
                name,
                amount,
                color: categoryColors.get(name) ?? UNCATEGORIZED_COLOR,
            }));
    }, [points, categoryColors]);

    // Taxonomy entries the period never touched.
    const untouched = useMemo(() => {
        if (!categories) return [];
        const spent = new Set(points.map((p) => p.category));
        return Array.from(categories.values())
            .map((c) => c.name)
            .filter((name) => !spent.has(name));
    }, [categories, points]);

    const filtered = useMemo(() => {
        if (items === null) return null;
        // Expenses only: the columns are spend, so an income row in the list
        // would be evidence for a mark that isn't there.
        let out = items.filter((t) => t.type === "expense");
        if (pickedCategory) {
            out = out.filter((t) =>
                sameCategory(categoryName(categories, t.category_id), pickedCategory)
            );
        }
        if (pickedMonths) {
            out = out.filter((t) => {
                const m = t.date.slice(0, 7);
                return m >= pickedMonths.start && m <= pickedMonths.end;
            });
        }
        return out;
    }, [items, categories, pickedCategory, pickedMonths]);

    const filteredTotal = useMemo(
        () => (filtered ?? []).reduce((sum, t) => sum + t.amount, 0),
        [filtered]
    );

    // Clicking the layer that is already filtered clears it: the gesture that
    // asked the question takes it back, so there is no dead-end selection.
    const handlePick = useCallback(
        (category: string, month: string) => {
            const same =
                pickedCategory !== null &&
                sameCategory(pickedCategory, category) &&
                pickedMonths?.start === month &&
                pickedMonths?.end === month;
            setPickedCategory(same ? null : category);
            setPickedMonths(same ? null : { start: month, end: month });
            setSelectedId(null);
            setVisibleCount(PAGE);
        },
        [pickedCategory, pickedMonths]
    );

    function pickCategory(name: string | null) {
        setPickedCategory(name);
        setSelectedId(null);
        setVisibleCount(PAGE);
    }

    // The chart answers the same filter the list does: one category picked →
    // its own monthly columns; a month range dragged → only those months, a
    // zoom-in. The click or drag that narrows the question narrows the
    // drawing — chart and list always describe the same set.
    const chartPoints = useMemo(() => {
        let out = points;
        if (pickedCategory) out = out.filter((pt) => sameCategory(pt.category, pickedCategory));
        if (pickedMonths) {
            out = out.filter(
                (pt) => pt.month >= pickedMonths.start && pt.month <= pickedMonths.end
            );
        }
        return out;
    }, [points, pickedCategory, pickedMonths]);

    // The drawn chart's month axis, chronological — the brush maps drag
    // pixels to indices into exactly this.
    const monthKeys = useMemo(() => {
        const keys: string[] = [];
        for (const p of chartPoints) if (!keys.includes(p.month)) keys.push(p.month);
        return keys;
    }, [chartPoints]);

    const handleBrush = useCallback(
        (r: BucketRange) => {
            const start = monthKeys[r.start];
            const end = monthKeys[r.end];
            if (!start || !end) return;
            setPickedMonths({ start, end });
            setSelectedId(null);
            setVisibleCount(PAGE);
        },
        [monthKeys]
    );

    const pickedMonthLabel = useMemo(() => {
        if (!pickedMonths) return undefined;
        const label = (key: string) => {
            const d = parsePeriodKey(key);
            return d ? monthLabel(d, true) : key;
        };
        return pickedMonths.start === pickedMonths.end
            ? label(pickedMonths.start)
            : `${label(pickedMonths.start)} – ${label(pickedMonths.end)}`;
    }, [pickedMonths]);

    return (
        <div className="space-y-4 sm:space-y-6">
            {error && <BackendNotice what="el gasto por categoría" detail={error} />}

            {!loading && points.length === 0 && !error ? (
                <EmptyState icon={Shapes} title="Sin gasto en este periodo">
                    Prueba con un periodo más amplio, o sube un estado de cuenta que lo cubra.
                </EmptyState>
            ) : (
                <>
                    <ChartCard title="Gasto por categoría, mes a mes">
                        {loading ? (
                            <Skeleton className="h-[360px]" />
                        ) : (
                            <>
                                {/* The zoom IS the feedback: the axis narrows
                                    to the dragged months, so no persistent
                                    highlight is drawn (range={null}) — it
                                    would cover the whole plot. A drag inside
                                    the zoom narrows further; the month chip
                                    below is the way back out. */}
                                <RangeBrush
                                    buckets={monthKeys.length}
                                    range={null}
                                    onRange={handleBrush}
                                >
                                    <CategorySpendChart
                                        // Keyed by the filters: react-apexcharts
                                        // mutates the mounted chart and keeps
                                        // stale colors and axes when the series
                                        // or month set changes — a different
                                        // selection is a different chart.
                                        key={`${pickedCategory ?? "todas"}-${pickedMonths?.start ?? ""}-${pickedMonths?.end ?? ""}`}
                                        points={chartPoints}
                                        categoryColors={categoryColors}
                                        onPick={handlePick}
                                    />
                                </RangeBrush>
                                <p className="text-label text-ash">
                                    Haz clic en una capa para ver sus movimientos, o
                                    arrastra sobre los meses para acotar un rango.
                                    {untouched.length > 0 &&
                                        ` · Sin gasto: ${untouched.join(" · ")}`}
                                </p>
                            </>
                        )}
                    </ChartCard>

                    <section className="min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <h2 className="font-display text-title-sm font-normal text-ink">
                                Movimientos
                                {filtered && (
                                    <span className="ml-2 text-body-sm text-graphite">
                                        {filtered.length}
                                    </span>
                                )}
                            </h2>
                            {filtered && filtered.length > 0 && (
                                <span className="tabular text-body-sm text-graphite">
                                    {mxn(filteredTotal)}
                                </span>
                            )}
                        </div>

                        <div className="mt-3">
                            <CategoryFilterBar
                                chips={chips}
                                picked={pickedCategory}
                                onPick={pickCategory}
                                month={pickedMonths?.start ?? null}
                                monthLabel={pickedMonthLabel}
                                onClearMonth={() => setPickedMonths(null)}
                            />
                        </div>

                        {txError && (
                            <p className="mt-3 text-body-sm text-graphite">
                                No pudimos cargar los movimientos ({txError}).
                            </p>
                        )}

                        <div className="mt-4">
                            {filtered === null ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Skeleton key={i} className="h-11" />
                                    ))}
                                </div>
                            ) : filtered.length === 0 ? (
                                <p className="py-6 text-body text-graphite">
                                    {pickedCategory || pickedMonths
                                        ? "Ningún movimiento con este filtro."
                                        : "Sin movimientos en este periodo."}
                                </p>
                            ) : (
                                <TransactionsList
                                    items={filtered}
                                    visibleCount={visibleCount}
                                    onShowMore={() => setVisibleCount((c) => c + PAGE)}
                                    selectedId={selectedId}
                                    onSelect={setSelectedId}
                                    editing={{
                                        onPatch: async (t, patch) => {
                                            await patchItem(t.id, patch);
                                            // Recategorizing from here moves a
                                            // peso between two columns above;
                                            // ask the cube again.
                                            if ("category_id" in patch) {
                                                setEdits((e) => e + 1);
                                            }
                                        },
                                        onBulkApplied: () => {
                                            reload();
                                            setEdits((e) => e + 1);
                                        },
                                    }}
                                />
                            )}
                        </div>
                    </section>
                </>
            )}

        </div>
    );
}
