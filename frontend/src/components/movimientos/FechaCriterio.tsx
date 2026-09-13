"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
    FECHA_PRESETS,
    fechaPresetBounds,
    matchFechaPreset,
    parseAnchor,
    type FechaPresetId,
} from "@/lib/fechaCriterio";
import { FechaMiniCalendario } from "./FechaMiniCalendario";

/**
 * Stitch's date criterion: four pills, then desde/hasta. The month grid
 * only appears for Personalizado — the calendar was crowding the rail.
 */
export function FechaCriterio({
    start,
    end,
    onChange,
    anchor,
    resetKey,
}: {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
    /** Newest day on the ledger — "este mes" is that month, not the wall clock. */
    anchor: string;
    resetKey?: string | number | boolean;
}) {
    const at = parseAnchor(anchor);
    const matched = matchFechaPreset(start, end, at);
    const [wantCustom, setWantCustom] = useState(false);

    useEffect(() => {
        setWantCustom(false);
    }, [resetKey]);

    const custom = wantCustom || matched === "custom";
    const active: FechaPresetId | null = custom ? "custom" : matched;

    function pick(id: FechaPresetId) {
        if (id === "custom") {
            setWantCustom(true);
            if (!start && !end) {
                const b = fechaPresetBounds("month", at);
                onChange(b.start, b.end);
            }
            return;
        }
        setWantCustom(false);
        if (matched === id) {
            onChange("", "");
            return;
        }
        const b = fechaPresetBounds(id, at);
        onChange(b.start, b.end);
    }

    return (
        <section>
            <p className="eyebrow text-ink">Fecha</p>
            <div className="mt-2 grid grid-cols-2 gap-1">
                {FECHA_PRESETS.map((p) => {
                    const on = p.id === "custom" ? active === "custom" : active === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => pick(p.id)}
                            className={cn(
                                "truncate rounded-control px-2 py-1 text-left text-label",
                                "transition-colors duration-100",
                                on
                                    ? "border border-soot bg-soot font-medium text-paper"
                                    : "border border-mist bg-paper text-graphite hover:border-muted hover:text-ink"
                            )}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {custom ? (
                <div className="mt-2">
                    <FechaMiniCalendario
                        start={start}
                        end={end}
                        onChange={onChange}
                        resetKey={resetKey}
                    />
                </div>
            ) : (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <DateField
                        label="Desde"
                        value={start}
                        max={end || undefined}
                        onChange={(next) => {
                            if (!next) return onChange("", end);
                            onChange(next, !end || next <= end ? end || next : next);
                        }}
                    />
                    <DateField
                        label="Hasta"
                        value={end}
                        min={start || undefined}
                        onChange={(next) => {
                            if (!next) return onChange(start, "");
                            onChange(!start || start <= next ? start || next : next, next);
                        }}
                    />
                </div>
            )}
            <p className="mt-2 text-label text-ash">
                La fecha acota comercio, categoría y monto.
            </p>
        </section>
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
        <label className="flex flex-col gap-0.5">
            <span className="text-caption text-ash">{label}</span>
            <input
                type="date"
                value={value}
                min={min}
                max={max}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "h-8 rounded-input border border-mist bg-paper px-2",
                    "font-mono text-label text-ink outline-none focus:border-ink"
                )}
            />
        </label>
    );
}
