"use client";

import { useMemo } from "react";
import { CalendarOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { mxn0 } from "@/lib/format";
import { num } from "@/lib/metrics";
import type { WidgetBodyProps, WidgetDef } from "../types";

/**
 * Lifetime totals: everything in, everything out, and the net.
 *
 * Not a chart. Three numbers over the whole history have no shape to draw —
 * a two-bar chart of "todo lo que ha entrado" vs "todo lo que ha salido" adds
 * nothing over the figures themselves and costs a 400px canvas.
 *
 * The metric declares `ignores_period`, which is a trap if it stays implicit:
 * the user moves the period selector, these numbers do not move, and the only
 * available conclusion is that the app is broken. So the widget says it, in
 * the body, every time.
 */
function Body({ result, height }: WidgetBodyProps) {
    const totals = useMemo(() => {
        const row = result.rows[0];
        if (!row) return null;
        return {
            income: num(row.income_amount),
            expense: num(row.expense_amount),
            net: num(row.net_amount),
        };
    }, [result.rows]);

    if (!totals) {
        return (
            <div style={{ minHeight: height }} className="flex flex-col justify-center">
                <p className="text-body-sm text-pewter">
                    Aun no hay suficientes movimientos para un total historico.
                </p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: height }} className="flex flex-col justify-center gap-6 py-2">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <Figure label="Entradas" value={mxn0(totals.income)} />
                <Figure label="Salidas" value={mxn0(totals.expense)} />
                <Figure
                    label="Neto"
                    value={mxn0(totals.net)}
                    // The sign is the whole point of this figure, and it is the
                    // one number here that can be either. Colour is a second
                    // channel on top of the minus sign, not a replacement.
                    tone={totals.net < 0 ? "negative" : "positive"}
                />
            </div>

            <p className="flex items-start gap-2 border-t border-mist pt-4 text-body-sm text-pewter">
                <CalendarOff size={14} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                    Historico completo. Estos totales cubren toda tu historia y no cambian con
                    el periodo seleccionado.
                </span>
            </p>
        </div>
    );
}

function Figure({
    label,
    value,
    tone = "neutral",
}: {
    label: string;
    value: string;
    tone?: "neutral" | "positive" | "negative";
}) {
    return (
        <div className="min-w-0">
            <div className="text-body-sm text-pewter">{label}</div>
            <div
                className={cn(
                    "tabular mt-1 truncate text-metric font-semibold",
                    tone === "positive" && "text-positive",
                    tone === "negative" && "text-negative",
                    tone === "neutral" && "text-ink"
                )}
            >
                {value}
            </div>
        </div>
    );
}

export const lifetimeFlow: WidgetDef = {
    id: "lifetime_flow",
    title: "Entradas vs salidas historicas",
    blurb: "Historico completo: lo que ha entrado, lo que ha salido y el neto.",
    group: "Patrimonio",
    sizes: ["sm", "md"],
    requires: ["transactions"],
    Body,
};
