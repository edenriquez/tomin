"use client";

import { CategorySpend } from "@/lib/api";
import { mxn } from "@/lib/format";
import { chart, colors } from "@/design/tokens";

const COLORS = [colors.ember, ...chart.neutral.slice(1)];

export function DistributionChart({ data }: { data: CategorySpend[] }) {
    if (!data.length) {
        return <p className="text-body-sm text-pewter">Aun no hay gastos categorizados.</p>;
    }
    return (
        <div className="space-y-4">
            {data.map((c, i) => (
                <div key={c.category_id ?? c.category_name}>
                    <div className="flex items-center justify-between text-body-sm">
                        <span className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: COLORS[i % COLORS.length] }}
                            />
                            {c.category_name}
                        </span>
                        <span className="tabular text-pewter">
                            {mxn(c.amount)} ({c.percentage}%)
                        </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-fog">
                        <div
                            className="h-2 rounded-full"
                            style={{
                                width: `${c.percentage}%`,
                                background: COLORS[i % COLORS.length],
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
