"use client";

import { createPortal } from "react-dom";
import { useCallback, useMemo, useState } from "react";
import type { RecurringCharge } from "@/lib/api";
import { cn } from "@/lib/cn";
import { chart as chartTokens, colors } from "@/design/tokens";
import { dayLabel, fullDayLabel, monthLabel, mxn2 } from "@/lib/format";
import { parsePeriodKey } from "@/lib/metrics";
import { usePortal } from "@/components/ui/usePortal";

/** A charge to plot. `label` names the series it came from, which only
 *  matters when several are mixed into one grid. */
export type CalendarCharge = RecurringCharge & { label?: string };

/** An expected (future) charge: the date, and which series expects it. */
export type ExpectedCharge = { date: string; label?: string };

/**
 * Charges as a calendar of days — the contribution-graph layout,
 * because the question it answers is the one that layout is best at: *when*
 * does this hit? A row of numbers can tell you "monthly, day 5"; a grid shows
 * you the column of day-5 cells marching down the year, and shows the month it
 * slipped to the 9th just as plainly.
 *
 * Columns are weeks, rows are weekdays (Monday first — es-MX, not Sunday-first
 * GitHub). Cell colour is the day's total against the largest day *in this
 * grid*, so intensity is always relative to what is currently drawn: one
 * series on its own scale in a table row, or the whole selection on a shared
 * scale in the standalone calendar.
 */

const DAY = 86_400_000;
/** Always a year of columns, like the graph this borrows from — the grid is a
 *  fixed calendar you read against, not a window that resizes with the data.
 *  A series that started in May should visibly have started in May, which a
 *  grid cropped to its first charge cannot show. */
const WEEKS = 53;
/** Cell and gap in px. Kept as numbers because the month header spaces its
 *  labels by column count and has to agree with the grid exactly. */
const CELL = 16;
const GAP = 4;
const COLUMN = CELL + GAP;
/** Monday-first labels; the grid shows every other one, as GitHub does. */
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

type Cell = {
    /** Local midnight of the day this cell is. */
    date: Date;
    iso: string;
    amount: number;
    /** 0 = nothing happened, 1..4 = charge, by size within this grid. */
    level: number;
    /** The next charge the detector expects — drawn, not filled. */
    expected: boolean;
    /** Which series expect a charge this day — the tooltip's answer to
     *  "esperado ¿de qué?". */
    expectedLabels: string[];
    /** Outside the span of any charge: a gap, not a "no charge". */
    outside: boolean;
    /** Saturday or Sunday — shaded a breath darker, nothing more. */
    weekend: boolean;
    /** series label -> amount that day, when the grid mixes series. */
    sources: Map<string, number> | null;
};

function isoOf(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    // getDay() is Sunday-first; shift so Monday is 0.
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
}

export function ChargeCalendar({
    charges,
    expected,
    colorFor,
    className,
}: {
    charges: CalendarCharge[];
    /** Expected charges, marked where they land in range. */
    expected?: ExpectedCharge[];
    /**
     * Series label -> colour. Supplying it switches the grid from *magnitude*
     * (one hue, four steps, dark = expensive) to *identity* (a hue per
     * series, so a cell says which charge it was). A day several series share
     * is split between their colours rather than picking a winner.
     *
     * The two encodings are exclusive on purpose: a cell cannot answer "how
     * much" and "which one" with the same channel, and identity is the
     * question a mixed calendar exists to answer.
     */
    colorFor?: (label: string) => string;
    className?: string;
}) {
    // The hovered day and where it sits on screen. Kept here rather than in
    // each cell so only one tooltip can ever exist, and so it can be rendered
    // outside the scroll container that would otherwise clip it.
    const [hover, setHover] = useState<{ cell: Cell; x: number; y: number } | null>(null);
    const mounted = usePortal();

    const onEnter = useCallback((cell: Cell, el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        // Anchored to the cell, not the pointer: the panel stays put while the
        // cursor moves inside the 16px square instead of jittering under it.
        setHover({ cell, x: r.left + r.width / 2, y: r.top });
    }, []);
    const onLeave = useCallback(() => setHover(null), []);

    const { weeks, months, total, span } = useMemo(() => {
        const byDay = new Map<string, number>();
        // Which series landed on a day, for the tooltip. A mixed grid is only
        // useful if a dark cell can say *what* made it dark.
        const labelsByDay = new Map<string, Map<string, number>>();
        const dates: Date[] = [];
        for (const c of charges) {
            const d = parsePeriodKey(c.date);
            if (!d) continue;
            const iso = isoOf(d);
            const amount = Math.abs(c.amount);
            // Several charges on one day are one cell of their sum — the day
            // is what the grid is about.
            byDay.set(iso, (byDay.get(iso) ?? 0) + amount);
            if (c.label) {
                const per = labelsByDay.get(iso) ?? new Map<string, number>();
                per.set(c.label, (per.get(c.label) ?? 0) + amount);
                labelsByDay.set(iso, per);
            }
            dates.push(d);
        }

        if (!dates.length) {
            return { weeks: [] as Cell[][], months: [], total: 0, span: null };
        }

        dates.sort((a, b) => a.getTime() - b.getTime());
        const first = dates[0];
        const last = dates[dates.length - 1];

        const expectedList = (expected ?? [])
            .map((e) => ({ date: parsePeriodKey(e.date), label: e.label }))
            .filter((e): e is { date: Date; label: string | undefined } => e.date !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        // The grid only stretches for the SOONEST expectation; a yearly
        // renewal eleven months out must not blow the year of history away.
        const expectedDate = expectedList[0]?.date ?? null;
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // The grid ends at the later of today and the next expected charge, so
        // the upcoming one is visible; a stale prediction can't stretch it far.
        let end = todayMidnight > last ? todayMidnight : last;
        if (expectedDate && expectedDate > end && expectedDate.getTime() - end.getTime() < 45 * DAY) {
            end = expectedDate;
        }

        // ...and always starts a full year before it.
        const start = startOfWeek(new Date(end.getTime() - (WEEKS * 7 - 1) * DAY));

        const max = Math.max(...Array.from(byDay.values()), 0);
        const expectedLabelsByIso = new Map<string, string[]>();
        for (const e of expectedList) {
            const iso = isoOf(e.date);
            const labels = expectedLabelsByIso.get(iso) ?? [];
            if (e.label && !labels.includes(e.label)) labels.push(e.label);
            expectedLabelsByIso.set(iso, labels);
        }

        const weeks: Cell[][] = [];
        const months: { index: number; label: string }[] = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            const week: Cell[] = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
                const iso = isoOf(date);
                const amount = byDay.get(iso) ?? 0;
                week.push({
                    date,
                    iso,
                    amount,
                    weekend: i >= 5,
                    // Four steps against this grid's own maximum. `ceil` keeps
                    // the smallest real charge visible instead of level 0.
                    level: amount > 0 ? Math.max(1, Math.ceil((amount / max) * 4)) : 0,
                    expected: expectedLabelsByIso.has(iso) && amount === 0,
                    expectedLabels: expectedLabelsByIso.get(iso) ?? [],
                    sources: labelsByDay.get(iso) ?? null,
                    outside: date < first || date > end,
                });
                cursor.setDate(cursor.getDate() + 1);
            }
            // A month labels the first column that contains its first week.
            const firstOfMonth = week.find((c) => c.date.getDate() <= 7);
            if (firstOfMonth) {
                const label = monthLabel(firstOfMonth.date);
                if (months[months.length - 1]?.label !== label) {
                    months.push({ index: weeks.length, label });
                }
            }
            weeks.push(week);
        }

        return {
            weeks,
            months,
            total: charges.length,
            span: { first, last },
        };
    }, [charges, expected]);

    if (!weeks.length) {
        return (
            <p className={cn("text-body-sm text-graphite", className)}>
                Sin fechas para dibujar.
            </p>
        );
    }

    return (
        <div className={className}>
            <div className="scrollbar-none overflow-x-auto pb-1">
                <div className="inline-block min-w-full">
                    {/* Month row: absolute would need measurement, so each label
                        is a spacer-width block starting at its own column. */}
                    <div className="mb-1.5 flex pl-7 text-label text-ash">
                        {months.map((m, i) => {
                            const nextIndex = months[i + 1]?.index ?? weeks.length;
                            return (
                                <span
                                    key={`${m.label}-${m.index}`}
                                    className="shrink-0 overflow-hidden whitespace-nowrap"
                                    style={{ width: (nextIndex - m.index) * COLUMN }}
                                >
                                    {m.label}
                                </span>
                            );
                        })}
                    </div>

                    <div className="flex" style={{ gap: GAP }}>
                        <div
                            className="mr-1 flex w-6 shrink-0 flex-col text-label text-ash"
                            style={{ gap: GAP }}
                        >
                            {WEEKDAYS.map((d, i) => (
                                <span
                                    key={i}
                                    className="flex items-center leading-none"
                                    style={{ height: CELL }}
                                    aria-hidden
                                >
                                    {/* GitHub's rhythm: three labels — lunes,
                                        miércoles, viernes — and quiet rows
                                        between. The grid stays uniform. */}
                                    {i === 0 || i === 2 || i === 4 ? d : ""}
                                </span>
                            ))}
                        </div>

                        <div
                            role="group"
                            aria-label="Calendario de cargos"
                            className="flex"
                            style={{ gap: GAP }}
                        >
                            {weeks.map((week, wi) => (
                                <div
                                    key={wi}
                                    className="flex flex-col"
                                    style={{ gap: GAP }}
                                >
                                    {week.map((cell) => (
                                        <Day
                                            key={cell.iso}
                                            cell={cell}
                                            colorFor={colorFor}
                                            onEnter={onEnter}
                                            onLeave={onLeave}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-body-sm text-graphite">
                    {total} cargo{total === 1 ? "" : "s"}
                    {span && ` · desde ${dayLabel(span.first)}`}
                </p>
            </div>

            {mounted &&
                hover &&
                createPortal(
                    <DayTooltip cell={hover.cell} x={hover.x} y={hover.y} colorFor={colorFor} />,
                    document.body
                )}
        </div>
    );
}

/** Room the panel needs above a cell before it flips below it. */
const TOOLTIP_GAP = 10;

/**
 * The day's detail: what landed, from which series, for how much.
 *
 * A portal with fixed positioning, because the grid lives in a horizontally
 * scrolling box — a panel positioned inside it would be clipped at the edge,
 * which is exactly where the interesting recent days are. It flips below the
 * cell when there is no room above, and never renders past the viewport
 * sides.
 */
function DayTooltip({
    cell,
    x,
    y,
    colorFor,
}: {
    cell: Cell;
    x: number;
    y: number;
    colorFor?: (label: string) => string;
}) {
    const sources = cell.sources ? Array.from(cell.sources.entries()) : [];
    sources.sort((a, b) => b[1] - a[1]);

    const below = y < 160;
    const style: React.CSSProperties = {
        left: Math.min(Math.max(x, 12), (typeof window !== "undefined" ? window.innerWidth : 0) - 12),
        top: below ? y + CELL + TOOLTIP_GAP : y - TOOLTIP_GAP,
        transform: below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
    };

    return (
        <div
            role="tooltip"
            style={style}
            className={cn(
                "pointer-events-none fixed z-modal max-w-[16rem]",
                "rounded-card border border-mist bg-paper px-3 py-2 shadow-card"
            )}
        >
            <div className="text-label text-graphite">{fullDayLabel(cell.date)}</div>

            {cell.expected ? (
                <div className="mt-1">
                    <div className="text-body-sm text-ink">Próximo cargo esperado</div>
                    {cell.expectedLabels.length > 0 && (
                        <ul className="mt-1.5 space-y-1 border-t border-mist pt-1.5">
                            {cell.expectedLabels.map((label) => (
                                <li
                                    key={label}
                                    className="flex items-center gap-1.5 text-body-sm"
                                >
                                    <span
                                        aria-hidden
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{
                                            background: colorFor ? colorFor(label) : colors.ash,
                                        }}
                                    />
                                    <span className="truncate text-graphite">{label}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <>
                    <div className="tabular mt-0.5 font-display text-metric-sm font-normal text-ink">
                        {mxn2(cell.amount)}
                    </div>
                    {sources.length > 0 && (
                        <ul className="mt-1.5 space-y-1 border-t border-mist pt-1.5">
                            {sources.map(([label, amount]) => (
                                <li
                                    key={label}
                                    className="flex items-center justify-between gap-3 text-body-sm"
                                >
                                    <span className="flex min-w-0 items-center gap-1.5">
                                        <span
                                            aria-hidden
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{
                                                background: colorFor
                                                    ? colorFor(label)
                                                    : colors.ash,
                                            }}
                                        />
                                        <span className="truncate text-graphite">{label}</span>
                                    </span>
                                    {/* Only worth splitting out when the day is
                                        more than one charge; otherwise it just
                                        repeats the total above. */}
                                    {sources.length > 1 && (
                                        <span className="tabular shrink-0 text-ink">
                                            {mxn2(amount)}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}

function Day({
    cell,
    colorFor,
    onEnter,
    onLeave,
}: {
    cell: Cell;
    colorFor?: (label: string) => string;
    onEnter: (cell: Cell, el: HTMLElement) => void;
    onLeave: () => void;
}) {
    const who = cell.sources ? sourceSummary(cell.sources) : "";
    // Still the accessible name — the panel is a pointer affordance and a
    // screen reader gets nothing from a `mouseenter`.
    const label = cell.expected
        ? `${dayLabel(cell.date)} · próximo cargo esperado${
              cell.expectedLabels.length ? ` · ${cell.expectedLabels.join(", ")}` : ""
          }`
        : cell.amount > 0
          ? `${dayLabel(cell.date)} · ${mxn2(cell.amount)}${who}`
          : undefined;
    const interactive = cell.amount > 0 || cell.expected;

    return (
        <span
            aria-label={label}
            role={label ? "img" : undefined}
            aria-hidden={label ? undefined : true}
            onMouseEnter={
                interactive ? (e) => onEnter(cell, e.currentTarget) : undefined
            }
            onMouseLeave={interactive ? onLeave : undefined}
            className={cn(
                "block rounded-[4px]",
                // A day worth hovering says so on approach: a soft ring, not a
                // colour change, which would misreport the amount encoded in
                // the fill.
                interactive && "hover:ring-2 hover:ring-ink/15",
                // Days before the series began are absent, not empty: an empty
                // cell claims "no charge that day", which is not a fact we have.
                cell.outside && "opacity-40",
                cell.expected && "border border-dashed border-edge"
            )}
            style={{
                height: CELL,
                width: CELL,
                background:
                    cell.level === 0
                        ? // Weekends at full Mist against the weekday Fog —
                          // a plain band, still two steps below any charge.
                          cell.weekend
                          ? colors.mist
                          : colors.fog
                        : colorFor
                          ? sourceFill(cell.sources, colorFor)
                          : levelColor(cell.level),
                boxShadow:
                    cell.level === 0 && !cell.expected
                        ? `inset 0 0 0 1px ${colors.mist}`
                        : undefined,
            }}
        />
    );
}

/**
 * A day's fill in identity mode. One series is a flat colour; several become
 * hard-stop bands in descending order of amount — no blending, because a
 * blend of two series' colours is a third series that doesn't exist. Bands
 * are equal width rather than proportional: at 12px a proportional sliver
 * would vanish, and "these three landed today" is the fact worth keeping.
 */
function sourceFill(
    sources: Map<string, number> | null,
    colorFor: (label: string) => string
): string {
    if (!sources || sources.size === 0) return colors.ash;
    const ordered = Array.from(sources.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label]) => colorFor(label));
    if (ordered.length === 1) return ordered[0];
    // Cap the bands: past three, slices stop being distinguishable and the
    // tooltip is doing the work anyway.
    const shown = ordered.slice(0, 3);
    const step = 100 / shown.length;
    const stops = shown
        .map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`)
        .join(", ");
    return `linear-gradient(135deg, ${stops})`;
}

/** "· Netflix, Spotify +2" — enough to identify the day without a tooltip
 *  that runs off the screen on a busy one. */
function sourceSummary(sources: Map<string, number>): string {
    const names = Array.from(sources.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
    if (!names.length) return "";
    const shown = names.slice(0, 3).join(", ");
    return ` · ${shown}${names.length > 3 ? ` +${names.length - 3}` : ""}`;
}

/** Level 1..4 → light to dark, the ramp read in the direction of magnitude. */
function levelColor(level: number): string {
    const ramp = chartTokens.signalTint; // index 0 is the darkest
    return ramp[Math.max(0, Math.min(ramp.length - 1, 4 - level))];
}

