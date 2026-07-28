"use client";

import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ForecastPoint } from "@/lib/api";
import { chart, colors } from "@/design/tokens";
import { monthLabelFromOffset } from "@/lib/format";

export function ProjectionChart({ points }: { points: ForecastPoint[] }) {
    const data = points.map((p) => ({
        month: monthLabelFromOffset(p.month_offset),
        Baseline: p.baseline,
        Optimizado: p.optimized,
    }));
    return (
        <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="opt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.ember} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={colors.ember} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="month" stroke={chart.axisLabel} fontSize={12} />
                <YAxis stroke={chart.axisLabel} fontSize={12} />
                <Tooltip />
                <Legend />
                <Area
                    type="monotone"
                    dataKey="Optimizado"
                    stroke={colors.ember}
                    strokeWidth={2}
                    fill="url(#opt)"
                />
                <Line
                    type="monotone"
                    dataKey="Baseline"
                    stroke={chart.neutral[4]}
                    strokeDasharray="5 5"
                    dot={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
