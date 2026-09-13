"use client";

import { useMemo, useState } from "react";
import type { RecurringItem } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayLabel, fullDayLabel, mxn } from "@/lib/format";
import { dueColor, dueRamp } from "./dueColor";
import {
    buildDuePair,
    type DayCell,
    type DueLine,
    type Urgency,
} from "./dueMonth";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"] as const;

/**
 * Current month and the next, side by side — the same month grid as the
 * rest of Tomin. Days that still have to land pulse; closer days pulse
 * faster and redder.
 *
 * Below it, one table — not two. "Este mes" and "el que sigue" were a split
 * the calendar already draws, and splitting the rows too meant the reader had
 * to join them back together to answer the only question here: in what order
 * is this money leaving? So the rows run straight through, oldest first, and
 * say where they are by colour: what already left is grey, and what is coming
 * runs from red at the next charge to blue at the furthest one.
 */
export function DueMonthCalendar({
    items,
    className,
}: {
    items: RecurringItem[];
    className?: string;
}) {
    const pair = useMemo(() => buildDuePair(items), [items]);
    const [selected, setSelected] = useState<string | null>(null);

    const lines = useMemo(
        () =>
            [...pair.thisMonth, ...pair.upcoming].sort(
                (a, b) =>
                    a.date.getTime() - b.date.getTime() ||
                    a.label.localeCompare(b.label, "es-MX")
            ),
        [pair]
    );
    const ramp = useMemo(
        () => dueRamp(lines.filter((l) => l.status === "due").map((l) => l.iso)),
        [lines]
    );
    const registeredTotal = lines
        .filter((l) => l.status === "registered")
        .reduce((s, l) => s + l.amount, 0);
    const dueTotal = lines
        .filter((l) => l.status === "due")
        .reduce((s, l) => s + l.amount, 0);

    function pick(iso: string) {
        setSelected((cur) => (cur === iso ? null : iso));
    }

    return (
        <div className={cn("space-y-5", className)}>
            <section className="card space-y-5">
                <header>
                    <h2 className="text-title-sm font-normal text-ink">Calendario de pagos</h2>
                    <p className="mt-1 text-body-sm text-graphite">
                        Mes en curso y el que sigue. El pulso marca lo que está cerca.
                    </p>
                </header>

                <div className="grid gap-8 md:grid-cols-2">
                    <MonthGrid
                        month={pair.currentMonth}
                        cells={pair.currentCells}
                        selected={selected}
                        onPick={pick}
                    />
                    <MonthGrid
                        month={pair.nextMonth}
                        cells={pair.nextCells}
                        selected={selected}
                        onPick={pick}
                    />
                </div>

                <Legend />
            </section>

            <ChargeTable
                lines={lines}
                ramp={ramp}
                registeredTotal={registeredTotal}
                dueTotal={dueTotal}
                selected={selected}
                onPick={pick}
            />
        </div>
    );
}

function MonthGrid({
    month,
    cells,
    selected,
    onPick,
}: {
    month: Date;
    cells: DayCell[];
    selected: string | null;
    onPick: (iso: string) => void;
}) {
    return (
        <div>
            <p className="text-body-sm font-medium text-ink">
                {longMonth(month)}
            </p>
            <div className="mt-3 grid grid-cols-7 gap-px text-center">
                {WEEKDAYS.map((d, i) => (
                    <span
                        key={`${d}-${i}`}
                        className="py-1 text-caption font-medium uppercase text-ash"
                    >
                        {d}
                    </span>
                ))}
                {cells.map((cell) => (
                    <DayButton
                        key={cell.iso + (cell.outside ? "-o" : "")}
                        cell={cell}
                        selected={selected === cell.iso && !cell.outside}
                        onPick={onPick}
                    />
                ))}
            </div>
        </div>
    );
}

function DayButton({
    cell,
    selected,
    onPick,
}: {
    cell: DayCell;
    selected: boolean;
    onPick: (iso: string) => void;
}) {
    const hasDue = cell.due > 0 && !cell.outside;
    const hasReg = cell.registered > 0 && !cell.outside;
    const names = [...cell.dueLabels, ...cell.registeredLabels];
    const label = cell.outside
        ? undefined
        : hasDue
          ? `${fullDayLabel(cell.date)} · pendiente ${mxn(cell.due)}${
                names.length ? ` · ${names.join(", ")}` : ""
            }`
          : hasReg
            ? `${fullDayLabel(cell.date)} · registrado ${mxn(cell.registered)}${
                  names.length ? ` · ${names.join(", ")}` : ""
              }`
            : cell.today
              ? `${fullDayLabel(cell.date)} · hoy`
              : fullDayLabel(cell.date);

    return (
        <button
            type="button"
            disabled={cell.outside}
            aria-label={label}
            aria-pressed={selected || undefined}
            onClick={() => !cell.outside && onPick(cell.iso)}
            className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full",
                "text-label tabular transition-colors duration-100",
                cell.outside && "text-ash",
                !cell.outside && !hasDue && !hasReg && !selected && "text-ink hover:bg-fog",
                cell.today && !selected && !hasDue && "ring-1 ring-inset ring-ink",
                hasReg && !hasDue && !selected && "bg-fog text-ink",
                hasDue && cell.urgency === "urgent" && !selected && "bg-negative text-paper due-pulse-urgent",
                hasDue && cell.urgency === "soon" && !selected && "bg-negative/80 text-paper due-pulse-soon",
                hasDue && cell.urgency === "later" && !selected && "bg-wash text-edge due-pulse-later",
                selected && "bg-soot text-paper"
            )}
        >
            {cell.date.getDate()}
        </button>
    );
}

function Legend() {
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-label text-graphite">
            <LegendItem swatch="ring-1 ring-inset ring-ink bg-paper" label="Hoy" />
            <LegendItem swatch="bg-fog" label="Registrado" />
            <LegendItem swatch="bg-wash due-pulse-later" label="Programado" />
            <LegendItem swatch="bg-negative due-pulse-urgent" label="Urgente" />
        </ul>
    );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
    return (
        <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", swatch)} />
            {label}
        </li>
    );
}

/**
 * Every charge in the two months the calendar draws, in the order the money
 * leaves. Colour carries the reading, so it is stated once, above the rows,
 * rather than left for the user to infer from a legend of dots.
 */
function ChargeTable({
    lines,
    ramp,
    registeredTotal,
    dueTotal,
    selected,
    onPick,
}: {
    lines: DueLine[];
    /** iso -> position on the red→blue ramp, for the charges still ahead. */
    ramp: Map<string, number>;
    registeredTotal: number;
    dueTotal: number;
    selected: string | null;
    onPick: (iso: string) => void;
}) {
    // The rows are in date order, so "already paid" and "still to pay" meet
    // exactly once: that seam is today, and it is worth drawing.
    const firstDue = lines.findIndex((l) => l.status === "due");

    return (
        <section className="min-w-0 overflow-hidden rounded-card border border-mist bg-paper shadow-card">
            <header className="border-b border-mist px-5 py-4 sm:px-6">
                <h2 className="flex flex-wrap items-baseline gap-2 text-title-sm font-normal text-ink">
                    Cargos
                    <span className="text-mist">·</span>
                    <span className="tabular font-sans text-body-sm text-graphite">
                        {lines.length}
                    </span>
                    {dueTotal > 0 && (
                        <>
                            <span className="text-mist">·</span>
                            <span className="tabular font-sans text-body-sm text-ink">
                                {mxn(dueTotal)} por pagar
                            </span>
                        </>
                    )}
                </h2>
                <p className="mt-1 text-body-sm text-graphite">
                    {registeredTotal > 0 && (
                        <>
                            <span className="tabular">{mxn(registeredTotal)}</span> ya
                            cobrados, en gris.{" "}
                        </>
                    )}
                    Lo que viene va de{" "}
                    <span style={{ color: dueColor(0) }}>rojo, lo más próximo</span>, a{" "}
                    <span style={{ color: dueColor(1) }}>azul, lo más lejano</span>.
                </p>
            </header>
            {lines.length === 0 ? (
                <p className="px-5 py-6 text-body text-graphite sm:px-6">
                    Nada cobrado ni programado en estos dos meses.
                </p>
            ) : (
                <ul className="divide-y divide-mist">
                    {lines.map((line, i) => (
                        <ChargeRow
                            key={line.key}
                            line={line}
                            color={
                                line.status === "due"
                                    ? dueColor(ramp.get(line.iso) ?? 0)
                                    : null
                            }
                            today={i === firstDue && firstDue > 0}
                            active={selected === line.iso}
                            onPick={onPick}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

function ChargeRow({
    line,
    color,
    today,
    active,
    onPick,
}: {
    line: DueLine;
    /** Where on the ramp, or null for a charge that already landed. */
    color: string | null;
    /** This row opens the part that has not been paid yet. */
    today: boolean;
    active: boolean;
    onPick: (iso: string) => void;
}) {
    return (
        <li>
            {today && (
                <p className="flex items-center gap-3 bg-fog/60 px-5 py-1.5 text-label text-graphite sm:px-6">
                    Hoy
                    <span aria-hidden className="h-px flex-1 bg-mist" />
                    De aquí en adelante, todavía no se cobra
                </p>
            )}
            <button
                type="button"
                onClick={() => onPick(line.iso)}
                className={cn(
                    "flex w-full items-center justify-between gap-3 px-5 py-3 text-left sm:px-6",
                    "hover:bg-fog",
                    active && "bg-fog"
                )}
            >
                <span className="flex min-w-0 items-center gap-3">
                    <DueDot color={color} urgency={line.urgency} />
                    <span className="min-w-0">
                        <span
                            className={cn(
                                "block truncate text-body",
                                color ? "text-ink" : "text-graphite"
                            )}
                        >
                            {line.label}
                        </span>
                        <span
                            className="text-label"
                            style={color ? { color } : undefined}
                        >
                            <span className={cn(!color && "text-ash")}>
                                {dayLabel(line.date)}
                                <span className={cn(color ? "opacity-50" : "text-mist")}>
                                    {" · "}
                                </span>
                                {line.status === "registered" ? "Registrado" : "Pendiente"}
                            </span>
                        </span>
                    </span>
                </span>
                <span
                    className={cn(
                        "tabular shrink-0 text-body",
                        color ? "text-ink" : "text-graphite"
                    )}
                >
                    {mxn(line.amount)}
                </span>
            </button>
        </li>
    );
}

/** The mark at the head of a row: the ramp colour, or grey for what landed. */
function DueDot({ color, urgency }: { color: string | null; urgency: Urgency | null }) {
    return (
        <span
            aria-hidden
            className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                !color && "bg-muted",
                // Only the charges at the door pulse. A list where everything
                // blinks says nothing about which one is next.
                color && urgency === "urgent" && "due-pulse-urgent",
                color && urgency === "soon" && "due-pulse-soon"
            )}
            style={color ? { backgroundColor: color } : undefined}
        />
    );
}

function longMonth(date: Date): string {
    const raw = date.toLocaleDateString("es-MX", { month: "long" });
    return `${raw.charAt(0).toUpperCase() + raw.slice(1)} ${date.getFullYear()}`;
}
