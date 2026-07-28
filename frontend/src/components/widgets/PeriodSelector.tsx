"use client";

import { cn } from "@/lib/cn";
import { PERIODS, type PeriodId } from "@/lib/period";

/** Segmented control. Four fixed periods beat a date-range picker nobody opens. */
export function PeriodSelector({
    value,
    onChange,
}: {
    value: PeriodId;
    onChange: (id: PeriodId) => void;
}) {
    return (
        <div
            role="group"
            aria-label="Periodo"
            className="inline-flex rounded-control border border-mist p-0.5"
        >
            {PERIODS.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    aria-pressed={p.id === value}
                    onClick={() => onChange(p.id)}
                    className={cn(
                        "rounded-control px-3 py-1.5 text-body-sm font-medium",
                        p.id === value
                            ? "bg-fog text-ink"
                            : "text-graphite hover:text-ink"
                    )}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
