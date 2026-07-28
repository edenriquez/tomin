"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import { categoricalColors } from "@/components/charts/apex/theme";
import { compactMxn, mxn0 } from "@/lib/format";
import { num } from "@/lib/metrics";
import type { WidgetBodyProps, WidgetDef } from "../types";

/** Past this many bars the labels stop being readable. The tail is *named*,
 *  never folded into an "Otros" bar: see the note on overlap below. */
const MAX_BARS = 8;

/** Room the caption needs under the chart, so the frame's geometry holds. */
const CAPTION_HEIGHT = 52;

/**
 * Spend per tag.
 *
 * This is `DistributionChart`'s shape but deliberately not `DistributionChart`
 * itself, for one reason: a movement can carry several tags, so the rows
 * overlap and their sum exceeds the real total. Two things follow.
 *
 * First, no pie, no donut, no percentages — any parts-of-a-whole form would
 * assert that these slices partition the spend, and they do not.
 *
 * Second, no "Otros" bucket. Folding the tail into one bar means adding
 * overlapping numbers together and drawing the result as a single quantity,
 * which is the same lie in miniature. The tail is dropped from the chart and
 * counted in the caption instead.
 */
function Body({ result, height }: WidgetBodyProps) {
    const rows = useMemo(
        () =>
            result.rows
                .map((row) => ({
                    label: String(row.tag ?? "Sin etiqueta"),
                    amount: num(row.expense_amount),
                }))
                .sort((a, b) => b.amount - a.amount),
        [result.rows]
    );

    const shown = rows.slice(0, MAX_BARS);
    const hidden = rows.length - shown.length;

    const options: ApexOptions = useMemo(
        () => ({
            // Sorted descending, so index 0 is the largest and takes Ember.
            colors: categoricalColors(shown.length, 0),
            plotOptions: {
                bar: { horizontal: true, barHeight: "62%", borderRadius: 2, distributed: true },
            },
            xaxis: {
                categories: shown.map((r) => r.label),
                labels: { formatter: (v: string) => compactMxn(Number(v)) },
            },
            grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
            tooltip: {
                // `distributed` puts every bar in one series, so the default
                // tooltip title would repeat the series name on every row.
                y: { formatter: (v: number) => mxn0(v), title: { formatter: () => "" } },
            },
        }),
        [shown]
    );

    return (
        <div className="flex min-w-0 flex-col">
            <ApexChart
                type="bar"
                series={[{ name: "Gasto", data: shown.map((r) => Math.round(r.amount)) }]}
                options={options}
                height={Math.max(160, height - CAPTION_HEIGHT)}
            />
            <div className="space-y-1 pb-1">
                {result.meta.overlapping && (
                    <p className="text-body-sm text-pewter">
                        Un movimiento puede tener varias etiquetas; los totales se traslapan.
                    </p>
                )}
                {hidden > 0 && (
                    <p className="text-body-sm text-pewter">
                        {hidden === 1
                            ? "Se muestra el top 8; hay 1 etiqueta mas."
                            : `Se muestra el top 8; hay ${hidden} etiquetas mas.`}
                    </p>
                )}
            </div>
        </div>
    );
}

/** Replaces the frame's generic "aun no hay movimientos": the account may be
 *  full of movements and still have nothing to show here, and sending that
 *  user to /documentos would be advice that does not help. */
function Empty() {
    return (
        <div className="flex h-full flex-col justify-center">
            <p className="text-body font-medium text-ink">Aun no tienes etiquetas.</p>
            <p className="mt-1 max-w-sm text-body-sm text-pewter">
                Etiqueta tus movimientos para agruparlos a tu manera: viajes, deducibles, lo
                que necesites.
            </p>
            <div className="mt-4">
                <Link href="/movimientos">
                    <Button size="sm" icon={<Tags size={16} />}>
                        Etiquetar movimientos
                    </Button>
                </Link>
            </div>
        </div>
    );
}

export const tagTotals: WidgetDef = {
    id: "tag_totals",
    title: "Totales por etiqueta",
    blurb: "Cuanto gastas en cada etiqueta que tu definiste.",
    group: "Patrimonio",
    sizes: ["md", "lg"],
    requires: ["tags"],
    Body,
    Empty,
};
