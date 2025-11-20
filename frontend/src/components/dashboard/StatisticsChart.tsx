'use client';

import { useState } from 'react';

interface StatisticsData {
    month: string;
    income: number;
    expenses: number;
}

interface StatisticsChartProps {
    data?: StatisticsData[];
}

const defaultData: StatisticsData[] = [
    { month: 'Jan', income: 9000, expenses: -3000 },
    { month: 'Feb', income: 5000, expenses: -2000 },
    { month: 'Mar', income: 12000, expenses: -4000 },
    { month: 'Apr', income: 8000, expenses: -3500 },
    { month: 'May', income: 10000, expenses: -4000 },
    { month: 'Jun', income: 14000, expenses: -5000 },
    { month: 'Jul', income: 15000, expenses: -6000 },
    { month: 'Aug', income: 7000, expenses: -3000 },
    { month: 'Sep', income: 11000, expenses: -4500 },
    { month: 'Oct', income: 13000, expenses: -5000 },
    { month: 'Nov', income: 16000, expenses: -6000 },
    { month: 'Dec', income: 14000, expenses: -5500 },
];

export default function StatisticsChart({ data = defaultData }: StatisticsChartProps) {
    const [activeFilter, setActiveFilter] = useState<'income' | 'expenses' | 'both'>('both');
    const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

    const maxValue = Math.max(...data.map(d => Math.max(d.income, Math.abs(d.expenses))));
    const scale = 150 / maxValue; // 150px is the max height

    const getBarHeight = (value: number) => Math.abs(value) * scale;

    const hoveredData = hoveredMonth ? data.find(d => d.month === hoveredMonth) : null;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Statistics</h2>

                {/* Filter Buttons */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveFilter('income')}
                        className="flex items-center gap-2 text-sm"
                    >
                        <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                        <span className="text-gray-700">Income</span>
                    </button>
                    <button
                        onClick={() => setActiveFilter('expenses')}
                        className="flex items-center gap-2 text-sm"
                    >
                        <span className="w-3 h-3 rounded-full bg-purple-300"></span>
                        <span className="text-gray-700">Expenses</span>
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div className="relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400 w-8">
                    <span>15k</span>
                    <span>10k</span>
                    <span>5k</span>
                    <span>0</span>
                    <span>-5k</span>
                    <span>-10k</span>
                    <span>-15k</span>
                </div>

                {/* Chart Area */}
                <div className="ml-10 relative h-80">
                    {/* Zero line */}
                    <div className="absolute left-0 right-0 top-1/2 border-t border-gray-200"></div>

                    {/* Bars */}
                    <div className="flex items-end justify-between h-full gap-1 relative">
                        {data.map((item, index) => {
                            const incomeHeight = getBarHeight(item.income);
                            const expensesHeight = getBarHeight(item.expenses);
                            const isHovered = hoveredMonth === item.month;

                            return (
                                <div
                                    key={item.month}
                                    className="flex-1 flex flex-col items-center justify-center relative"
                                    onMouseEnter={() => setHoveredMonth(item.month)}
                                    onMouseLeave={() => setHoveredMonth(null)}
                                >
                                    {/* Bars container */}
                                    <div className="w-full flex flex-col items-center" style={{ height: '320px' }}>
                                        {/* Income bar (top half) */}
                                        <div className="flex-1 flex items-end justify-center w-full">
                                            <div
                                                className={`w-full max-w-[32px] bg-purple-600 rounded-t-lg transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-90'
                                                    }`}
                                                style={{ height: `${incomeHeight}px` }}
                                            ></div>
                                        </div>

                                        {/* Expenses bar (bottom half) */}
                                        <div className="flex-1 flex items-start justify-center w-full">
                                            <div
                                                className={`w-full max-w-[32px] bg-purple-300 rounded-b-lg transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-70'
                                                    }`}
                                                style={{ height: `${expensesHeight}px` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Month label */}
                                    <div className="text-xs text-gray-500 mt-2">{item.month}</div>

                                    {/* Hover tooltip */}
                                    {isHovered && (
                                        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap z-10">
                                            <div className="font-semibold mb-1">{item.month} 2024</div>
                                            <div className="text-purple-300">${item.income.toLocaleString()} Income</div>
                                            <div className="text-purple-200">${Math.abs(item.expenses).toLocaleString()} Expenses</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
