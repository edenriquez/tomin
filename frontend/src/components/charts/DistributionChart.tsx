"use client";

import { CategorySpend, mxn } from "@/lib/api";

const COLORS = ["#3b82f6", "#a855f7", "#eab308", "#ec4899", "#64748b", "#10b981"];

export function DistributionChart({ data }: { data: CategorySpend[] }) {
    if (!data.length) {
        return <p className="text-sm text-slate-500">Aun no hay gastos categorizados.</p>;
    }
    return (
        <div className="space-y-4">
            {data.map((c, i) => (
                <div key={c.category_id ?? c.category_name}>
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: COLORS[i % COLORS.length] }}
                            />
                            {c.category_name}
                        </span>
                        <span className="text-slate-500">
                            {mxn(c.amount)} ({c.percentage}%)
                        </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
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
