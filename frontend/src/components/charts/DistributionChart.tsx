"use client";

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface SpendingData {
    category: string;
    amount: number;
    color: string;
    percentage: number;
}

interface DistributionChartProps {
    data: SpendingData[];
}

export const DistributionChart = ({ data }: DistributionChartProps) => {
    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-5">
                {data.map((item) => (
                    <div key={item.category} className="group">
                        <div className="mb-1 flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="font-medium text-gray-900 dark:text-white">{item.category}</span>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400">
                                ${item.amount.toLocaleString()} ({item.percentage}%)
                            </span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                                className="h-3 rounded-full transition-all duration-500"
                                style={{
                                    width: `${item.percentage}%`,
                                    backgroundColor: item.color
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
