"use client";

import { cn } from "@/lib/cn";
import type { LensFocus, LensGroup } from "./types";

/**
 * The lecturas a chart has to offer, as chips above it. One chip active at a
 * time; clicking the active chip again steps to its next mark, so "3
 * inusuales" is a tour, not a toggle. Nothing to read → nothing rendered: an
 * empty chip strip would be a promise the chart cannot keep.
 */
export function LensChips({
    groups,
    focus,
    onFocus,
    className,
}: {
    groups: LensGroup[];
    focus: LensFocus;
    onFocus: (next: LensFocus) => void;
    className?: string;
}) {
    const visible = groups.filter((g) => g.lecturas.length > 0);
    if (visible.length === 0) return null;
    return (
        <div role="group" aria-label="Lecturas" className={cn("flex flex-wrap items-center gap-2", className)}>
            {visible.map((g) => {
                const active = focus?.groupId === g.id;
                const n = g.lecturas.length;
                return (
                    <button
                        key={g.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                            onFocus(
                                active
                                    ? { groupId: g.id, index: ((focus?.index ?? 0) + 1) % n }
                                    : { groupId: g.id, index: 0 }
                            )
                        }
                        className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-control border px-3 text-body-sm transition-colors duration-100",
                            active
                                ? "border-soot bg-soot text-paper"
                                : "border-mist bg-transparent text-ink hover:border-muted hover:bg-paper"
                        )}
                    >
                        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-signal" : "bg-signal/70")} />
                        {g.label}
                        {n > 1 && (
                            <span className={cn("tabular", active ? "text-paper/70" : "text-graphite")}>
                                {active ? `${(focus?.index ?? 0) + 1}/${n}` : n}
                            </span>
                        )}
                    </button>
                );
            })}
            {focus && (
                <button
                    type="button"
                    onClick={() => onFocus(null)}
                    className="text-body-sm text-graphite underline decoration-mist underline-offset-4 hover:text-ink"
                >
                    Quitar
                </button>
            )}
        </div>
    );
}
