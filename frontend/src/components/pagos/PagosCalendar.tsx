"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RecurringItem } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayLabel, fullDayLabel, mxn } from "@/lib/format";
import { today } from "@/components/recurrentes/projection";
import {
    buildDueMonth,
    isoOf,
    shiftMonth,
    startOfMonth,
    withCardPayment,
    type CardPayment,
    type DayCell,
    type DueLine,
} from "./dueMonth";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const FREQUENCY: Record<RecurringItem["frequency"], string> = {
    weekly: "semanal",
    biweekly: "quincenal",
    monthly: "mensual",
    bimonthly: "bimestral",
    yearly: "anual",
};

/** How far back the month can be turned: a year of landed charges. */
const BACK_MONTHS = 12;

/**
 * One month, and the day you are looking at.
 *
 * The grid is a calendar and nothing more: Monday first, today filled, a dot
 * under every day that has a charge, the chosen day ringed. No pulse, no
 * ramp from red to blue — what is due is a date and an amount, and both are
 * written in the column beside the grid, where words go. Red is the colour
 * of money leaving in a ledger, not of a Tuesday.
 *
 * The column reads the chosen day first, then everything after it, in the
 * order the money leaves: the rest of this month and the first landing of
 * each series in the next one. Turning the month moves both.
 */
export function PagosCalendar({
    items,
    card,
}: {
    items: RecurringItem[];
    card: CardPayment | null;
}) {
    const [offset, setOffset] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);

    const now = today();
    const month = shiftMonth(startOfMonth(now), offset);
    const view = useMemo(
        () => withCardPayment(buildDueMonth(items, month), card),
        [items, month, card]
    );

    // The day the column opens on: the one you picked, else the next charge
    // still ahead in this month, else today when the month is the current one.
    const selected = useMemo(() => {
        if (picked && view.cells.some((w) => w.some((c) => c.iso === picked && !c.outside))) {
            return picked;
        }
        const next = view.dueThisMonth.find((l) => l.date >= now);
        if (next) return next.iso;
        return offset === 0 ? isoOf(now) : null;
    }, [picked, view, now, offset]);

    const dayLines = useMemo(() => {
        if (!selected) return [];
        return [...view.registered, ...view.dueThisMonth]
            .filter((l) => l.iso === selected)
            .sort((a, b) => a.label.localeCompare(b.label, "es-MX"));
    }, [view, selected]);

    const after = useMemo(() => {
        const from = selected ?? isoOf(now);
        return [...view.dueThisMonth.filter((l) => l.iso > from), ...view.upcoming];
    }, [view, selected, now]);

    const canBack = offset > -(BACK_MONTHS - 1);
    const canForward = offset < 1;

    function turn(delta: number) {
        setOffset((cur) => cur + delta);
        setPicked(null);
    }

    return (
        <div className="grid gap-8 md:grid-cols-[minmax(0,56fr)_minmax(0,44fr)]">
            <div>
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => turn(-1)}
                        disabled={!canBack}
                        aria-label="Mes anterior"
                        className="rounded-control p-1 text-ash transition-colors duration-100 hover:bg-fog hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft size={16} aria-hidden />
                    </button>
                    <p className="text-body-sm font-medium text-ink">{monthTitle(month)}</p>
                    <button
                        type="button"
                        onClick={() => turn(1)}
                        disabled={!canForward}
                        aria-label="Mes siguiente"
                        className="rounded-control p-1 text-ash transition-colors duration-100 hover:bg-fog hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        <ChevronRight size={16} aria-hidden />
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-7 text-center">
                    {WEEKDAYS.map((d, i) => (
                        <span key={`${d}-${i}`} className="py-1 text-label text-ash">
                            {d}
                        </span>
                    ))}
                    {view.cells.flat().map((cell) => (
                        <Day
                            key={cell.iso}
                            cell={cell}
                            selected={selected === cell.iso && !cell.outside}
                            onPick={() => setPicked(cell.iso)}
                        />
                    ))}
                </div>
            </div>

            <div className="min-w-0">
                <p className="text-body font-medium text-ink">
                    {selected ? fullDay(selected) : monthTitle(month)}
                </p>
                {selected && (
                    <ul className="mt-2 divide-y divide-mist border-b border-mist">
                        {dayLines.length === 0 ? (
                            <li className="py-3 text-body-sm text-graphite">Nada ese día.</li>
                        ) : (
                            dayLines.map((line) => <Row key={line.key} line={line} withDate={false} />)
                        )}
                    </ul>
                )}

                {after.length > 0 && (
                    <>
                        <p className="eyebrow mt-4">Después</p>
                        <ul className="mt-1 divide-y divide-mist border-b border-mist">
                            {after.map((line) => (
                                <Row key={line.key} line={line} withDate />
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}

function Day({
    cell,
    selected,
    onPick,
}: {
    cell: DayCell;
    selected: boolean;
    onPick: () => void;
}) {
    const hasDue = cell.due > 0 && !cell.outside;
    const hasReg = cell.registered > 0 && !cell.outside;
    const names = [...cell.dueLabels, ...cell.registeredLabels];
    const label = cell.outside
        ? undefined
        : `${fullDayLabel(cell.date)}${cell.today ? " · hoy" : ""}${
              hasDue ? ` · programado ${mxn(cell.due)}` : ""
          }${hasReg ? ` · registrado ${mxn(cell.registered)}` : ""}${
              names.length ? ` · ${names.join(", ")}` : ""
          }`;

    return (
        <button
            type="button"
            disabled={cell.outside}
            aria-label={label}
            aria-pressed={selected || undefined}
            onClick={onPick}
            className="flex h-9 flex-col items-center justify-start pt-0.5"
        >
            <span
                className={cn(
                    "tabular flex h-7 w-7 items-center justify-center rounded-full text-body-sm transition-colors duration-100",
                    cell.outside && "text-muted",
                    !cell.outside && cell.weekend && "text-graphite",
                    !cell.outside && !cell.weekend && "text-ink",
                    !cell.outside && !cell.today && !selected && "hover:bg-fog",
                    selected && !cell.today && "bg-mist text-ink",
                    cell.today && "bg-soot text-paper"
                )}
            >
                {cell.date.getDate()}
            </span>
            {/* One dot, whichever kind of charge the day holds: a projected one
                in Ink, a landed one in Muted. A day with both shows the one
                still ahead — that is the one that can still be acted on. */}
            {(hasDue || hasReg) && (
                <span
                    aria-hidden
                    className={cn("mt-0.5 h-1 w-1 rounded-full", hasDue ? "bg-ink" : "bg-muted")}
                />
            )}
        </button>
    );
}

function Row({ line, withDate }: { line: DueLine; withDate: boolean }) {
    const landed = line.status === "registered";
    const meta = [
        withDate ? dayLabel(line.date) : null,
        landed ? "registrado" : line.frequency ? FREQUENCY[line.frequency] : null,
        !landed && line.stable === false ? "varía" : null,
    ]
        .filter(Boolean)
        .join(" · ");
    return (
        <li className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span className="min-w-0">
                <span className={cn("block truncate text-body", landed ? "text-graphite" : "text-ink")}>
                    {line.label}
                </span>
                {meta && <span className="block text-label text-ash">{meta}</span>}
            </span>
            <span className={cn("tabular shrink-0 text-body", landed ? "text-graphite" : "text-ink")}>
                {!landed && line.stable === false ? "~" : ""}
                {mxn(line.amount)}
            </span>
        </li>
    );
}

function monthTitle(date: Date): string {
    return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

/** "28 de septiembre". */
function fullDay(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
    });
}
