"use client";

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

const data = [
    { month: 'Jan', baseline: 400000, optimized: 400000 },
    { month: 'Feb', baseline: 410000, optimized: 415000 },
    { month: 'Mar', baseline: 420000, optimized: 435000 },
    { month: 'Apr', baseline: 430000, optimized: 460000 },
    { month: 'May', baseline: 440000, optimized: 490000 },
    { month: 'Jun', baseline: 450000, optimized: 520000 },
];

export const ProjectionChart = () => {
    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#135bec" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#135bec" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        hide
                        domain={['dataMin - 50000', 'dataMax + 50000']}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="baseline"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="transparent"
                    />
                    <Area
                        type="monotone"
                        dataKey="optimized"
                        stroke="#135bec"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorOptimized)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
