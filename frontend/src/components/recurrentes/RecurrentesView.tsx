"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, Repeat } from "lucide-react";
import { api, type RecurringItem } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayLabel, mxn, mxn2 } from "@/lib/format";
import { categoryName, useCategories } from "@/lib/categories";
import { useBankScope } from "@/lib/banks";
import { useAppData } from "@/components/AppChrome";
import { parsePeriodKey } from "@/lib/metrics";
import { BackendNotice, EmptyState, NumberField, Skeleton } from "@/components/ui";
import { ChartCard } from "@/components/ChartCard";
import { usePanelSettings } from "@/components/settings/usePanelSettings";
import { ChargeCalendar, type CalendarCharge } from "./ChargeCalendar";
import { LoadTimelineChart } from "./LoadTimelineChart";
import { buildTimeline, isStale, ledgerEnd, type Timeline } from "./projection";
import { buildSeriesColors } from "./seriesColors";
import { rhythmCopy } from "./rhythm";

/**
 * The Recurrentes view: every charge that comes back on a rhythm —
 * subscriptions, fixed bills, memberships — detected over the whole history
 * (a subscription doesn't care which window the dashboard is reading).
 *
 * There are no summary tiles. Every number one would have carried is already
 * somewhere it means more: the monthly load is the height of a stack, the
 * series count sits beside the table heading, the next charge is per-row.
 *
 * What the chart card does own is the one thing no mark can state — the
 * projection. The table's checkboxes choose which series are drawn AND
 * projected, so "what would these three cost me for the next year" is asked
 * by ticking rows and read off the same card.
 *
 * Reading order: pick series → the stacked months (measured, then projected
 * past the dashed rule) → the totals → an opened row for the day-level rhythm.
 */

const FREQUENCY_LABELS: Record<RecurringItem["frequency"], string> = {
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual",
    yearly: "Anual",
};

/** Months of measured history drawn to the left of today. A year is enough to
 *  show an annual charge once, which is the point of drawing one at all. */
const MONTHS_BACK = 12;
/** Dates listed in an expanded row — enough to see the cadence by eye. */
const RECENT_CHARGES = 6;
const MIN_HORIZON = 1;
const MAX_HORIZON = 36;
const DEFAULT_HORIZON = 6;

/** A series has no id of its own; label plus last charge identifies it. */
function seriesKey(i: RecurringItem): string {
    return `${i.label}·${i.last_date}`;
}

export function RecurrentesView() {
    const { dataVersion } = useAppData();
    const [items, setItems] = useState<RecurringItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const categories = useCategories();
    // One series open at a time: two calendars side by side invite comparing
    // intensities that are scaled per-series and don't compare.
    const [openKey, setOpenKey] = useState<string | null>(null);

    // Which series are drawn and projected. Session state, not a setting: it
    // is a question being asked ("what do these three cost me?"), and a
    // question that survived a reload would answer for a user who has moved on.
    // `null` = everything, so series detected after this render are included
    // instead of silently missing from the chart.
    const [picked, setPicked] = useState<Set<string> | null>(null);

    // The horizon IS persisted — "how far ahead do I think" is a habit, not a
    // question, and it costs nothing to remember.
    const [cfg, setCfg] = usePanelSettings("recurrentes.proyeccion", {
        months: DEFAULT_HORIZON,
    });
    const horizon = Number.isFinite(cfg.months)
        ? Math.min(MAX_HORIZON, Math.max(MIN_HORIZON, Math.round(cfg.months)))
        : DEFAULT_HORIZON;

    const { statementIds } = useBankScope(dataVersion);
    const scopeQuery = statementIds
        ? `?${statementIds.map((id) => `statement_id=${id}`).join("&")}`
        : "";

    useEffect(() => {
        let stale = false;
        api.recurring(scopeQuery)
            .then((res) => {
                if (stale) return;
                setItems(res.items);
                setError(null);
            })
            .catch((e) => {
                if (stale) return;
                setError((e as Error).message);
                setItems([]);
            });
        return () => {
            stale = true;
        };
    }, [dataVersion, scopeQuery]);

    const loading = items === null;

    const isPicked = (i: RecurringItem) => picked === null || picked.has(seriesKey(i));
    const selected = useMemo(
        () => (items ?? []).filter(isPicked),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items, picked]
    );

    // A colour per series, from the category taxonomy — the same colours the
    // charts use, so a series looks the same everywhere. Built from ALL series
    // rather than the selection, so toggling one off never repaints the rest.
    const colorOf = useMemo(
        () => buildSeriesColors(items ?? [], categories),
        [items, categories]
    );

    // The ledger's last day, from ALL series rather than the selection: what
    // counts as "still alive" must not change when a row is unticked.
    const ledgerAsOf = useMemo(() => ledgerEnd(items ?? []), [items]);

    // Every selected series' charges in one pile, each tagged with the series
    // it came from so a day can say what made it up.
    const allCharges: CalendarCharge[] = useMemo(
        () =>
            selected.flatMap((i) =>
                (i.charges ?? []).map((c) => ({ ...c, label: i.label }))
            ),
        [selected]
    );
    const allExpected = useMemo(
        () =>
            selected
                .filter((i) => !isStale(i, ledgerAsOf))
                .map((i) => ({ date: i.next_expected, label: i.label })),
        [selected, ledgerAsOf]
    );

    // History, projection and the numbers under the chart come from one call,
    // so a bar and the total below it cannot disagree.
    const timeline = useMemo(
        () => buildTimeline(selected, MONTHS_BACK, horizon),
        [selected, horizon]
    );

    function togglePicked(i: RecurringItem) {
        const key = seriesKey(i);
        setPicked((cur) => {
            const base = cur ?? new Set((items ?? []).map(seriesKey));
            const next = new Set(base);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function pickAll(on: boolean) {
        setPicked(on ? null : new Set());
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {error && <BackendNotice what="tus cargos recurrentes" detail={error} />}

            {!loading && items.length === 0 && !error ? (
                <EmptyState icon={Repeat} title="Aún no detectamos cargos recurrentes">
                    Se necesitan al menos tres cobros del mismo lugar con un ritmo
                    reconocible. Sube más estados de cuenta y aparecen solos.
                </EmptyState>
            ) : (
                <>
                    <ChartCard title="Mes a mes, y lo que viene">
                        {loading ? (
                            <Skeleton className="h-[300px]" />
                        ) : (
                            <>
                                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-body-sm">
                                    <span className="text-graphite">Proyectar</span>
                                    <NumberField
                                        aria-label="Meses a proyectar"
                                        value={horizon}
                                        min={MIN_HORIZON}
                                        max={MAX_HORIZON}
                                        onChange={(months) => setCfg({ months })}
                                    />
                                    <span className="text-graphite">
                                        {horizon === 1 ? "mes" : "meses"} ·{" "}
                                        {selected.length} de {items.length} series
                                    </span>
                                </div>

                                <LoadTimelineChart
                                    timeline={timeline}
                                    colorFor={colorOf}
                                />

                                <Projection
                                    timeline={timeline}
                                    horizon={horizon}
                                    empty={selected.length === 0}
                                />
                            </>
                        )}
                    </ChartCard>

                    <ChartCard title="El año en días">
                        {loading ? (
                            <Skeleton className="h-40" />
                        ) : selected.length === 0 ? (
                            <p className="py-8 text-body text-graphite">
                                Marca al menos una serie en la tabla para dibujarla.
                            </p>
                        ) : (
                            <>
                                <p className="mb-3 text-body-sm text-graphite">
                                    El último año, día por día. Cada serie lleva el color
                                    de su categoría; un día que comparten varias se parte
                                    entre ellas.
                                </p>
                                {/* The table's checkboxes drive this too, but
                                    they are a screen away: what is mixed into
                                    the grid has to be legible — and editable —
                                    beside the grid itself. */}
                                <SeriesChips
                                    items={items}
                                    isPicked={isPicked}
                                    onToggle={togglePicked}
                                    onAll={() => pickAll(true)}
                                    colorOf={colorOf}
                                />
                                <ChargeCalendar
                                    charges={allCharges}
                                    expected={allExpected}
                                    colorFor={colorOf}
                                    className="mt-4"
                                />
                            </>
                        )}
                    </ChartCard>

                    <div className="min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                        <h2 className="font-display text-title-sm font-normal text-ink">
                            Cada serie
                        </h2>
                        <p className="mt-1 text-body-sm text-graphite">
                            Abre una serie para ver en qué días cae.
                        </p>
                        <div className="mt-4">
                            {loading ? (
                                <div className="space-y-2">
                                    {[0, 1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-12" />
                                    ))}
                                </div>
                            ) : (
                                <SeriesList items={items} />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    function toggle(i: RecurringItem) {
        const key = seriesKey(i);
        setOpenKey((cur) => (cur === key ? null : key));
    }

    function SeriesList({ items }: { items: RecurringItem[] }) {
        return (
            <>
                {/* Phone: cards */}
                <ul className="space-y-2 sm:hidden">
                    {items.map((i) => {
                        const key = seriesKey(i);
                        const open = openKey === key;
                        return (
                            <li
                                key={key}
                                className="rounded-card border border-mist bg-paper p-4"
                            >
                                <div className="flex items-start gap-2">
                                <button
                                    type="button"
                                    onClick={() => toggle(i)}
                                    aria-expanded={open}
                                    aria-controls={`serie-${key}`}
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <Caret open={open} />
                                            <SeriesDot item={i} />
                                            <span className="truncate text-body text-ink">
                                                {i.label}
                                            </span>
                                        </span>
                                        <Amount item={i} />
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-body-sm text-graphite">
                                        <span>
                                            {FREQUENCY_LABELS[i.frequency]} · {i.occurrences}×
                                        </span>
                                        <NextExpected item={i} asOf={ledgerAsOf} />
                                    </div>
                                </button>
                                </div>
                                {open && (
                                    <div id={`serie-${key}`} className="mt-4">
                                        <SeriesDetail item={i} />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {/* Desktop: table */}
                <table className="hidden w-full border-collapse text-body-sm sm:table">
                    <thead>
                        <tr className="border-b border-mist text-left text-label text-graphite">
                            <th className="py-2 pr-4 font-medium">Cargo</th>
                            <th className="py-2 pr-4 font-medium">Frecuencia</th>
                            <th className="py-2 pr-4 text-right font-medium">Monto típico</th>
                            <th className="py-2 pr-4 text-right font-medium">Al mes</th>
                            <th className="py-2 pr-4 font-medium">Último</th>
                            <th className="py-2 font-medium">Próximo esperado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((i) => {
                        const key = seriesKey(i);
                        const open = openKey === key;
                        return (
                        <Fragment key={key}>
                            <tr
                                onClick={() => toggle(i)}
                                className={cn(
                                    "cursor-pointer border-b border-mist last:border-0",
                                    "transition-colors duration-100 hover:bg-fog/60",
                                    open && "bg-fog/60"
                                )}
                            >
                                <td className="max-w-0 truncate py-2.5 pr-4 text-ink" title={i.label}>
                                    {/* The button carries the accessible name
                                        and the expanded state; the row is just
                                        a bigger hit target for the mouse. */}
                                    <button
                                        type="button"
                                        aria-expanded={open}
                                        aria-controls={`serie-${key}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggle(i);
                                        }}
                                        className="flex w-full items-center gap-2 text-left"
                                    >
                                        <Caret open={open} />
                                        <SeriesDot item={i} />
                                        <span className="truncate">{i.label}</span>
                                    </button>
                                </td>
                                <td className="whitespace-nowrap py-2.5 pr-4 text-graphite">
                                    {FREQUENCY_LABELS[i.frequency]} · {i.occurrences}×
                                </td>
                                <td className="tabular whitespace-nowrap py-2.5 pr-4 text-right text-ink">
                                    <Amount item={i} />
                                </td>
                                <td className="tabular whitespace-nowrap py-2.5 pr-4 text-right text-graphite">
                                    {mxn(i.monthly_equivalent)}
                                </td>
                                <td className="whitespace-nowrap py-2.5 pr-4 text-graphite">
                                    {isoToLabel(i.last_date)}
                                </td>
                                <td className="whitespace-nowrap py-2.5">
                                    <NextExpected item={i} asOf={ledgerAsOf} />
                                </td>
                            </tr>
                            {open && (
                                <tr className="border-b border-mist last:border-0">
                                    <td id={`serie-${key}`} colSpan={6} className="bg-fog/40 px-4 py-5">
                                        <SeriesDetail item={i} />
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                        );
                        })}
                    </tbody>
                </table>
            </>
        );
    }

    /** The dot beside a series in the table is that series' own colour — the
     *  one it wears in the calendar and in the stacked columns. Its category
     *  is still what the colour means, so the title says so. */
    function SeriesDot({ item }: { item: RecurringItem }) {
        return (
            <span
                aria-hidden
                title={categoryName(categories, item.category_id)}
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: colorOf(item.label) }}
            />
        );
    }
}

/**
 * One chip per series, pressed when it is in the calendar. The same state the
 * table's checkboxes write — two affordances, one answer — because the chart
 * and the table are too far apart to share a control.
 */
function SeriesChips({
    items,
    isPicked,
    onToggle,
    onAll,
    colorOf,
}: {
    items: RecurringItem[];
    isPicked: (i: RecurringItem) => boolean;
    onToggle: (i: RecurringItem) => void;
    onAll: () => void;
    /** The same resolver the grid paints with — the dot IS the legend. */
    colorOf: (label: string) => string;
}) {
    const allOn = items.every(isPicked);
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {items.map((i) => {
                const on = isPicked(i);
                return (
                    <button
                        key={seriesKey(i)}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onToggle(i)}
                        title={i.label}
                        className={cn(
                            "inline-flex max-w-[14rem] items-center gap-1.5 rounded-control px-2.5 py-1",
                            "text-body-sm transition-colors duration-100",
                            on
                                ? "bg-soot font-medium text-paper"
                                : "border border-mist text-graphite hover:text-ink"
                        )}
                    >
                        <span
                            aria-hidden
                            className={cn("h-2 w-2 shrink-0 rounded-full", !on && "opacity-40")}
                            style={{ background: colorOf(i.label) }}
                        />
                        <span className="truncate">{i.label}</span>
                    </button>
                );
            })}
            {!allOn && (
                <button
                    type="button"
                    onClick={onAll}
                    className="rounded-control px-2 py-1 text-body-sm text-graphite underline-offset-2 hover:text-ink hover:underline"
                >
                    Todas
                </button>
            )}
        </div>
    );
}

/**
 * What the selection will cost. These are the only numbers on the page that
 * aren't visible in a mark somewhere — a projection is a claim about a future
 * the chart can only draw, not total — which is why they sit inside the chart
 * card, reading off the same `timeline` the bars are drawn from.
 *
 * "Próximos N meses" counts simulated charges rather than multiplying the
 * monthly rate: an annual renewal either lands inside the horizon or it
 * doesn't, and the difference is the whole reason to ask.
 */
function Projection({
    timeline,
    horizon,
    empty,
}: {
    timeline: Timeline;
    horizon: number;
    empty: boolean;
}) {
    if (empty) return null;
    const { totals } = timeline;
    const stale = daysBetween(timeline.asOf, new Date());

    return (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-mist pt-4">
            <Reading
                label={`Próximos ${horizon} ${horizon === 1 ? "mes" : "meses"}`}
                value={mxn(totals.projected)}
                detail={`${totals.projectedCount} cargo${
                    totals.projectedCount === 1 ? "" : "s"
                } de ${totals.activeSeries} serie${
                    totals.activeSeries === 1 ? "" : "s"
                } activa${totals.activeSeries === 1 ? "" : "s"}`}
                strong
            />
            <Reading
                label="En 12 meses"
                value={mxn(totals.yearly)}
                detail={`ritmo actual: ${mxn(totals.monthlyRate)}/mes`}
            />
            <Reading
                label={`Pagado en ${MONTHS_BACK} meses`}
                value={mxn(totals.spent)}
                detail="medido, no estimado"
            />

            {/* A projection of zero is a claim, and the user deserves the
                reason rather than a blank number to distrust. */}
            {(totals.endedSeries > 0 || (totals.projected === 0 && stale > 30)) && (
                <p className="w-full text-body-sm text-graphite">
                    {totals.endedSeries > 0 && (
                        <>
                            {totals.endedSeries} serie
                            {totals.endedSeries === 1 ? "" : "s"} sin cargos desde antes del
                            último movimiento; no {totals.endedSeries === 1 ? "se proyecta" : "se proyectan"}.{" "}
                        </>
                    )}
                    {stale > 30 && (
                        <>
                            Tu último movimiento es del {isoDayLabel(timeline.asOf)} — sube un
                            estado de cuenta más reciente para afinar la proyección.
                        </>
                    )}
                </p>
            )}
        </dl>
    );
}

/** Whole days between two local-midnight dates. */
function daysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function isoDayLabel(d: Date): string {
    return dayLabel(d);
}

function Reading({
    label,
    value,
    detail,
    strong = false,
}: {
    label: string;
    value: string;
    detail?: string;
    strong?: boolean;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-caption uppercase text-ash">{label}</dt>
            <dd
                className={cn(
                    "tabular mt-0.5 font-display font-normal",
                    strong ? "text-metric-sm text-ink" : "text-title-sm text-ink"
                )}
            >
                {value}
            </dd>
            {detail && <p className="text-label text-graphite">{detail}</p>}
        </div>
    );
}

/**
 * The expanded row: the rhythm in one sentence, then the days it was inferred
 * from. The sentence is the answer; the calendar is the evidence, and being
 * able to check the claim is what makes the claim worth making.
 */
function SeriesDetail({ item }: { item: RecurringItem }) {
    const charges = item.charges ?? [];
    const rhythm = rhythmCopy(charges, item.frequency);

    if (!charges.length) {
        return (
            <p className="text-body-sm text-graphite">
                Este cargo se detectó antes de que guardáramos sus fechas. Vuelve a subir
                el estado de cuenta para verlas.
            </p>
        );
    }

    // The calendar used to live here as well, which meant the same grid twice
    // on one screen at two different scales. It belongs to the card above,
    // where every series shares one axis; the row keeps the reading a grid is
    // bad at — the sentence, and the exact recent dates behind it.
    const recent = [...charges]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, RECENT_CHARGES);

    return (
        <div className="min-w-0">
            <p className="text-body text-ink">
                {rhythm ?? "Sin un día fijo — el ritmo es regular, el día no."}
            </p>
            <p className="mt-2 text-body-sm text-graphite">
                Últimos cargos:{" "}
                <span className="tabular text-ink">
                    {recent.map((c) => isoToLabel(c.date)).join(" · ")}
                </span>
                {charges.length > RECENT_CHARGES &&
                    ` · y ${charges.length - RECENT_CHARGES} más`}
            </p>
        </div>
    );
}

/** The disclosure marker. Rotation, not two icons: the same shape turning is
 *  what tells the eye it is the same row in a different state. */
function Caret({ open }: { open: boolean }) {
    return (
        <ChevronRight
            size={14}
            aria-hidden
            className={cn(
                "shrink-0 text-ash transition-transform duration-100",
                open && "rotate-90"
            )}
        />
    );
}

/** "~" marks a series that recurs on a rhythm but varies in amount (CFE). */
function Amount({ item }: { item: RecurringItem }) {
    return (
        <span className="tabular whitespace-nowrap text-body-sm text-ink">
            {item.amount_stable ? "" : "~"}
            {mxn2(item.typical_amount)}
        </span>
    );
}

function isoToLabel(iso: string): string {
    const d = parsePeriodKey(iso);
    return d ? dayLabel(d) : iso;
}

/** Days until the next expected charge, in words a person plans with. */
/** Whole days from today to the expected charge; null if it won't parse. */
function daysUntil(item: RecurringItem): number | null {
    const next = parsePeriodKey(item.next_expected);
    if (!next) return null;
    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((next.getTime() - midnight.getTime()) / 86_400_000);
}

function expectedCopy(item: RecurringItem): string {
    const days = daysUntil(item);
    if (days === null) return item.next_expected;
    if (days < -1) return `esperado hace ${-days} días`;
    if (days === -1) return "esperado ayer";
    if (days === 0) return "hoy";
    if (days === 1) return "mañana";
    return `en ${days} días`;
}

/**
 * The next charge, per row. This is where "próximo cargo" lives now that the
 * tile is gone — and it says more here, because it says it about *this*
 * series. What the tile did carry was urgency, so the imminent ones (today,
 * tomorrow, the next few days) darken to Ink: the soonest charge finds the
 * eye by weight, on the row that explains it, without a chip announcing it.
 */
function NextExpected({ item, asOf }: { item: RecurringItem; asOf: Date }) {
    const copy = expectedCopy(item);
    const overdue = copy.startsWith("esperado");
    const days = daysUntil(item);
    const imminent = !overdue && days !== null && days <= 3;
    // A series whose charge stopped arriving *while the ledger kept going* is
    // treated as ended and contributes nothing to the projection. Judged
    // against the same ledger end the totals use — two different answers to
    // "is this alive?" on one screen is worse than either answer.
    const ended = isStale(item, asOf);
    return (
        <span
            className={cn(
                "text-body-sm",
                overdue ? "text-ash" : imminent ? "font-medium text-ink" : "text-graphite"
            )}
        >
            {isoToLabel(item.next_expected)} · {copy}
            {ended && <span className="text-ash"> · sin proyección</span>}
        </span>
    );
}
