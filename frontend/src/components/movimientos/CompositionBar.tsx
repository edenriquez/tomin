"use client";

import { cn } from "@/lib/cn";
import { mxn2 } from "@/lib/format";
import { barFill, pct, type CategorySlice } from "@/lib/categoryComposition";

function midpoint(slices: CategorySlice[], key: string): number {
    let acc = 0;
    for (const s of slices) {
        if (s.key === key) return (acc + s.share / 2) * 100;
        acc += s.share;
    }
    return 50;
}

/**
 * The set's cargos as one pill. Legend is name + percent; the open slice
 * takes Signal. Amount lives only on the pin — the bar itself does not
 * compete with a total.
 */
export function CompositionBar({
    slices,
    activeKey,
    onPick,
}: {
    slices: CategorySlice[];
    activeKey: string | null;
    onPick: (key: string) => void;
}) {
    if (slices.length === 0) return null;

    const named = slices.filter((s) => !s.uncategorized);
    const active = slices.find((s) => s.key === activeKey) ?? null;
    const pin = active ? midpoint(slices, active.key) : null;

    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-label text-graphite">
                    {named.map((s, i) => {
                        const on = activeKey === s.key;
                        return (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => onPick(s.key)}
                                className="inline-flex items-center gap-1.5"
                            >
                                <span
                                    aria-hidden
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: barFill(i, false, on) }}
                                />
                                <span className={on ? "text-ink" : undefined}>
                                    {s.name}{" "}
                                    <span className="tabular text-ink">{pct(s.share)}%</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <span className="shrink-0 tabular text-label text-ash">
                    {slices.length} categoría{slices.length === 1 ? "" : "s"} activa
                    {slices.length === 1 ? "" : "s"}
                </span>
            </div>

            <div className="relative pt-9">
                {active && pin !== null && (
                    <div
                        className="pointer-events-none absolute top-0 z-10 flex -translate-x-1/2 flex-col items-center"
                        style={{ left: `${pin}%` }}
                    >
                        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-soot px-2.5 py-1 text-label text-paper shadow-float">
                            <span className="font-medium">{active.name}</span>
                            <span aria-hidden className="text-ash">
                                ·
                            </span>
                            <span className="tabular">{mxn2(active.amount)}</span>
                            <span aria-hidden className="text-ash">
                                ·
                            </span>
                            <span className="tabular">{pct(active.share)}%</span>
                        </div>
                        <span
                            aria-hidden
                            className="h-1.5 w-1.5 -translate-y-0.5 rotate-45 bg-soot"
                        />
                    </div>
                )}

                <div
                    className="flex h-8 overflow-hidden rounded-full bg-fog"
                    role="img"
                    aria-label="Composición del periodo por categoría"
                >
                    {slices.map((s, i) => {
                        const on = activeKey === s.key;
                        return (
                            <button
                                key={s.key}
                                type="button"
                                title={`${s.name} · ${pct(s.share)}%`}
                                aria-pressed={on}
                                onClick={() => onPick(s.key)}
                                style={{
                                    flex: `0 0 ${Math.max(s.share * 100, s.share > 0 ? 0.8 : 0)}%`,
                                    background: barFill(i, s.uncategorized, on),
                                }}
                                className="h-full transition-opacity duration-100 hover:opacity-80"
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
