"use client";

import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { cn } from "@/lib/cn";
import { mxn0 } from "@/lib/format";
import { num, type MetricResult, type MetricRow } from "@/lib/metrics";
import type { WidgetBodyProps, WidgetDef } from "../types";

/**
 * "Consejo" — the Financial Advisor's first surface (docs/advisor-principles.md).
 *
 * Two renderings of the same principle, and the difference between them is the
 * whole product rule. **Active**: the data says this is timely, so it is the
 * loudest thing on the card — serif headline, ember accent, one action. Every
 * active advice states the user's own numbers; the advisor never shows an
 * unexplained score. **Dormant**: the principle is still true, so it still
 * renders — quietly, in graphite, with no urgency styling and no action.
 *
 * Precision over recall: one wrong "urgente" and the feature is muted forever.
 * Which is why the dormant rendering has to be genuinely calm rather than a
 * greyed-out version of the alarm.
 */

export type Advice = {
    principleId: string;
    phrase: string;
    active: boolean;
    reason: string;
    suggestedAmount: number | null;
    month: string | null;
    monthsOfHistory: number;
};

/** Row -> advice. Exported so the detail page lists the whole corpus. */
export function readAdvice(row: MetricRow): Advice {
    const raw = row.suggested_amount;
    return {
        principleId: String(row.principle_id ?? ""),
        phrase: String(row.phrase ?? ""),
        active: row.active === true,
        reason: String(row.reason ?? ""),
        // `null` and `0` are different claims — no amount vs an amount of
        // nothing — so this does not go through `num()`.
        suggestedAmount: raw === null || raw === undefined ? null : num(raw),
        month: typeof row.month === "string" ? row.month : null,
        monthsOfHistory: Number(row.months_of_history ?? 0),
    };
}

export function readAdvices(result: MetricResult): Advice[] {
    return result.rows.map(readAdvice);
}

/** "2026-07" -> the /movimientos range that covers exactly that month. */
export function monthRange(month: string): { start: string; end: string } | null {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    // Day 0 of the next month is the last day of this one — leap years and
    // 31-day months included, without a table.
    const last = new Date(y, m, 0).getDate();
    return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` };
}

export function AdviceCard({ advice, wide = false }: { advice: Advice; wide?: boolean }) {
    const range = advice.month ? monthRange(advice.month) : null;

    if (!advice.active) {
        return (
            <div className={cn("flex flex-col gap-3", wide && "max-w-3xl")}>
                <p className="font-display text-title-md font-normal text-graphite">
                    {advice.phrase}
                </p>
                <p className="text-body-sm text-pewter">{advice.reason}</p>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-5", wide && "max-w-3xl")}>
            {/* The one place a serif belongs inside the dashboard: the phrase is
                the principle itself, not a widget title. */}
            <p
                className={cn(
                    "border-l-2 border-ember pl-4 font-display font-normal text-ink",
                    wide ? "text-title-lg" : "text-title-md"
                )}
            >
                {advice.phrase}
            </p>

            <p className="max-w-prose text-body text-graphite">{advice.reason}</p>

            {advice.suggestedAmount !== null && (
                <div>
                    <div className="text-label uppercase tracking-wide text-pewter">
                        Aparta este mes
                    </div>
                    <div className="tabular mt-1 text-metric font-semibold text-ink">
                        {mxn0(advice.suggestedAmount)}
                    </div>
                </div>
            )}

            {range && (
                <div>
                    <Link
                        href={`/movimientos?start=${range.start}&end=${range.end}`}
                        className={cn(
                            "inline-flex h-10 items-center justify-center gap-2 rounded-control px-4",
                            "bg-ember text-body-sm font-semibold text-ink",
                            "transition-[filter] duration-100 hover:brightness-95"
                        )}
                    >
                        <PiggyBank size={16} aria-hidden />
                        Etiquetar como ahorro
                    </Link>
                </div>
            )}
        </div>
    );
}

function Body({ result, height }: WidgetBodyProps) {
    const [advice] = readAdvices(result);
    if (!advice) {
        return (
            <div style={{ minHeight: height }} className="flex flex-col justify-center">
                <p className="text-body-sm text-pewter">
                    Aun no hay principios que evaluar.
                </p>
            </div>
        );
    }
    return (
        <div style={{ minHeight: height }} className="flex flex-col justify-center py-2">
            <AdviceCard advice={advice} />
        </div>
    );
}

export const financialAdvice: WidgetDef = {
    id: "financial_advice",
    title: "Consejo",
    blurb: "Un principio financiero evaluado contra tus numeros, con la razon a la vista.",
    group: "Consejos",
    sizes: ["md", "lg"],
    requires: ["transactions"],
    // The frame's default partial copy blames missing statements. Here the
    // cause is months, and the user is told exactly how many they have.
    partialNote: (result) => {
        const months = readAdvices(result)[0]?.monthsOfHistory ?? 0;
        return `Necesitas 4 meses de historial (llevas ${months}).`;
    },
    Body,
};
