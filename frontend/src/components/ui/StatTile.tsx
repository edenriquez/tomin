import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

export type StatTone = "neutral" | "positive" | "negative";

const DELTA_TONE: Record<StatTone, string> = {
    neutral: "text-pewter",
    positive: "text-positive",
    negative: "text-negative",
};

export type StatTileProps = {
    label: string;
    /** Already formatted. Pass `undefined` for "no data" — never pass "$0". */
    value?: string;
    /** Secondary line: a delta, a comparison, or a qualifier. */
    delta?: string;
    /** Semantic meaning of `delta`. A tone, not a className — call sites should
     *  not be choosing hex values. */
    tone?: StatTone;
    /** A 40px sparkline, a Tag, whatever the tile is annotated with. */
    aside?: ReactNode;
    loading?: boolean;
    className?: string;
};

export function StatTile({
    label,
    value,
    delta,
    tone = "neutral",
    aside,
    loading = false,
    className,
}: StatTileProps) {
    return (
        <div className={cn("min-w-0 rounded-card border border-mist bg-paper p-5", className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-body-sm text-pewter">{label}</div>
                    {loading ? (
                        <Skeleton className="mt-2 h-8 w-32" />
                    ) : (
                        <div className="tabular mt-1 truncate text-metric font-semibold text-ink">
                            {/* An em dash, not $0. A zero is a claim about
                                someone's finances; absence of data isn't. */}
                            {value ?? "—"}
                        </div>
                    )}
                    {delta && !loading && (
                        <div className={cn("mt-2 text-body-sm", DELTA_TONE[tone])}>{delta}</div>
                    )}
                </div>
                {aside && <div className="shrink-0">{aside}</div>}
            </div>
        </div>
    );
}
