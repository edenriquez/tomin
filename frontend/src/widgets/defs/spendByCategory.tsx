"use client";

import { useMemo } from "react";
import { num } from "@/lib/metrics";
import { DistributionChart } from "@/components/charts/DistributionChart";
import type { WidgetBodyProps, WidgetDef } from "../types";

function Body({ result, height }: WidgetBodyProps) {
    const slices = useMemo(
        () =>
            result.rows.map((row) => ({
                // The engine already coalesces a missing category to
                // "Sin Categoria"; the fallback is for a row that predates it.
                label: String(row.category ?? "Sin Categoria"),
                amount: num(row.expense_amount),
            })),
        [result.rows]
    );

    return <DistributionChart data={slices} height={height} />;
}

export const spendByCategory: WidgetDef = {
    id: "spend_by_category",
    title: "Gasto por categoria",
    blurb: "En que se va tu dinero, de mayor a menor.",
    group: "Gasto",
    sizes: ["sm", "md", "lg"],
    requires: ["transactions"],
    Body,
};
