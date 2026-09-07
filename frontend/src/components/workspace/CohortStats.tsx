"use client";

import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui";
import { mxn } from "@/lib/format";
import { frequencyLabel, rhythmLabel, type CohortProfile } from "@/lib/workstations";

/**
 * The four figures a saved lens is read for: how much, how much each, how
 * often, how regularly.
 *
 * One hairline-divided band rather than four cards. The design system's
 * structural device is the 1px rule, not the box, and four bordered cards for
 * four facts about the same set would read as four unrelated widgets.
 *
 * The rule this component exists to enforce: **a withheld figure is an em dash
 * and a reason, never a zero.** The backend returns `null` for a rate it cannot
 * state honestly, and rendering `0.0/sem` there would be a claim about someone's
 * habits that the data does not support.
 */
export function CohortStats({
    profile,
    loading,
}: {
    profile: CohortProfile | null;
    loading: boolean;
}) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-px bg-mist sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="min-w-0 bg-canvas px-5 py-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="mt-2 h-8 w-24" />
                    </div>
                ))}
            </div>
        );
    }

    if (!profile || profile.count === 0) return null;

    const frequency = frequencyLabel(profile);
    const rhythm = rhythmLabel(profile);
    // One note for the whole band, not one per withheld tile: the reason is the
    // same for all of them, and repeating it four times reads as four problems.
    const shortfall = shortfallNote(profile);

    return (
        <div>
            <div className="grid grid-cols-2 gap-px bg-mist sm:grid-cols-4">
                <Figure label="Total" value={profile.total ? mxn(Number(profile.total)) : null} />
                <Figure
                    label="Típico"
                    value={profile.median ? mxn(Number(profile.median)) : null}
                    // Median, not mean: one 200-peso plan among twenty 15-peso
                    // top-ups moves the mean by a quarter and the median not at
                    // all, and it is the median that describes the habit.
                    note={
                        profile.min && profile.max && profile.min !== profile.max
                            ? `${mxn(Number(profile.min))} – ${mxn(Number(profile.max))}`
                            : undefined
                    }
                />
                <Figure
                    label="Frecuencia"
                    value={frequency?.value ?? null}
                    note={frequency?.unit}
                />
                <Figure label="Ritmo" value={rhythm} />
            </div>

            {shortfall && (
                <p className="mt-2 text-body-sm text-graphite">{shortfall}</p>
            )}
        </div>
    );
}

function Figure({
    label,
    value,
    note,
}: {
    label: string;
    /** `null` means "we cannot say", and renders as an em dash. Never "$0". */
    value: string | null;
    note?: string;
}) {
    return (
        <div className="min-w-0 bg-canvas px-5 py-4">
            <div className="text-label text-graphite">{label}</div>
            <div
                className={cn(
                    "tabular mt-1 truncate text-metric-sm font-normal",
                    value === null ? "text-ash" : "text-ink"
                )}
            >
                {value ?? "—"}
            </div>
            {note && <div className="mt-0.5 truncate text-label text-ash">{note}</div>}
        </div>
    );
}

/**
 * Why the rates are missing, in the user's terms.
 *
 * The backend decides *whether* it can speak; this only translates the verdict.
 * Recomputing the thresholds here would be a second opinion, and the two would
 * eventually disagree about the same set.
 */
function shortfallNote(profile: CohortProfile): string | null {
    if (profile.per_week !== null || profile.per_month !== null) return null;

    const months = profile.months_covered === null ? 0 : Number(profile.months_covered);
    if (months < 2) {
        const covered = profile.days_covered ?? 0;
        return `Necesitas unos 2 meses para hablar de frecuencia. Llevas ${covered} ${
            covered === 1 ? "día" : "días"
        }.`;
    }
    return `Con ${profile.count} ${
        profile.count === 1 ? "movimiento" : "movimientos"
    } todavía no hay un ritmo que valga la pena leer.`;
}
