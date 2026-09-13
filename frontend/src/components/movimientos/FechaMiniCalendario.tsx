"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { monthLabel } from "@/lib/format";
import { fromIso, toIso } from "@/lib/movimientosQuery";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"] as const;

/**
 * One month, Sunday-first. Click once for a single day; click again to open
 * the range. The desde/hasta fields are the same selection, typed.
 */
export function FechaMiniCalendario({
    start,
    end,
    onChange,
    resetKey,
}: {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
    /** Changing this recentres the grid on the current selection. */
    resetKey?: string | number | boolean;
}) {
    const seed = end || start || toIso(new Date());
    const seedDate = fromIso(seed);
    const [cursor, setCursor] = useState(() => new Date(seedDate.getFullYear(), seedDate.getMonth(), 1));

    useEffect(() => {
        const next = end || start || toIso(new Date());
        const d = fromIso(next);
        setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
        // Only when the dialog reopens, not on every day click.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    const cells = useMemo(() => buildMonth(cursor), [cursor]);
    const today = toIso(new Date());

    function pick(iso: string) {
        if (!start || (start && end && start !== end)) {
            onChange(iso, iso);
            return;
        }
        if (iso === start) {
            onChange(iso, iso);
            return;
        }
        onChange(iso < start ? iso : start, iso < start ? start : iso);
    }

    function shift(delta: number) {
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    }

    return (
        <div>
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => shift(-1)}
                    aria-label="Mes anterior"
                    className="rounded-control p-1 text-graphite hover:bg-fog hover:text-ink"
                >
                    <ChevronLeft size={16} aria-hidden />
                </button>
                <p className="text-body-sm font-medium text-ink">
                    {monthLabel(cursor)} {cursor.getFullYear()}
                </p>
                <button
                    type="button"
                    onClick={() => shift(1)}
                    aria-label="Mes siguiente"
                    className="rounded-control p-1 text-graphite hover:bg-fog hover:text-ink"
                >
                    <ChevronRight size={16} aria-hidden />
                </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-px text-center">
                {WEEKDAYS.map((d, i) => (
                    <span key={`${d}-${i}`} className="py-1 text-caption font-medium uppercase text-ash">
                        {d}
                    </span>
                ))}
                {cells.map((cell) => {
                    const inRange =
                        start &&
                        end &&
                        cell.iso >= start &&
                        cell.iso <= end;
                    const edge = cell.iso === start || cell.iso === end;
                    const isToday = cell.iso === today;
                    return (
                        <button
                            key={cell.iso + (cell.outside ? "-o" : "")}
                            type="button"
                            onClick={() => {
                                if (cell.outside) {
                                    setCursor(new Date(cell.year, cell.month, 1));
                                }
                                pick(cell.iso);
                            }}
                            className={cn(
                                "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-label tabular",
                                "transition-colors duration-100",
                                cell.outside && "text-ash",
                                !cell.outside && !inRange && "text-ink hover:bg-fog",
                                inRange && !edge && "bg-fog text-ink",
                                edge && "bg-soot text-paper",
                                isToday && !edge && "ring-1 ring-inset ring-ink"
                            )}
                        >
                            {cell.day}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
                <DateField
                    label="desde"
                    value={start}
                    max={end || undefined}
                    onChange={(next) => {
                        if (!next) return onChange("", end);
                        onChange(next, !end || next <= end ? end || next : next);
                    }}
                />
                <DateField
                    label="hasta"
                    value={end}
                    min={start || undefined}
                    onChange={(next) => {
                        if (!next) return onChange(start, "");
                        onChange(!start || start <= next ? start || next : next, next);
                    }}
                />
            </div>
        </div>
    );
}

function DateField({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    value: string;
    min?: string;
    max?: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="eyebrow">{label}</span>
            <input
                type="date"
                value={value}
                min={min}
                max={max}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "h-8 rounded-input border border-mist bg-paper px-2",
                    "text-label text-ink outline-none focus:border-ink"
                )}
            />
        </label>
    );
}

type Cell = {
    iso: string;
    day: number;
    year: number;
    month: number;
    outside: boolean;
};

function buildMonth(cursor: Date): Cell[] {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells: Cell[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        cells.push(cellOf(d, true));
    }
    for (let day = 1; day <= days; day++) {
        cells.push(cellOf(new Date(year, month, day), false));
    }
    while (cells.length % 7 !== 0) {
        const last = cells[cells.length - 1]!;
        const d = fromIso(last.iso);
        d.setDate(d.getDate() + 1);
        cells.push(cellOf(d, true));
    }
    return cells;
}

function cellOf(d: Date, outside: boolean): Cell {
    return {
        iso: toIso(d),
        day: d.getDate(),
        year: d.getFullYear(),
        month: d.getMonth(),
        outside,
    };
}
