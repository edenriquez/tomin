'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#9333EA', '#3B82F6', '#F59E0B', '#EF4444'];

const spendingData = [
    { name: 'Housing', value: 400 },
    { name: 'Food', value: 300 },
    { name: 'Transport', value: 200 },
    { name: 'Entertainment', value: 100 },
];

const weeklyData = [
    { name: 'Week 1', Netflix: 20, Nike: 50, Uber: 30 },
    { name: 'Week 2', Netflix: 20, Nike: 0, Uber: 45 },
    { name: 'Week 3', Netflix: 20, Nike: 120, Uber: 25 },
    { name: 'Week 4', Netflix: 20, Nike: 0, Uber: 40 },
];

export function SpendingDistributionChart() {
    return (
        <div className="h-64 w-full bg-white/60 backdrop-blur-md rounded-2xl shadow-[0_4px_16px_0_rgba(147,51,234,0.08)] p-4 border border-white/40">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Spending Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={spendingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {spendingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.8)" />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function FilterGroupChart() {
    return (
        <div className="h-64 w-full bg-white/60 backdrop-blur-md rounded-2xl shadow-[0_4px_16px_0_rgba(147,51,234,0.08)] p-4 border border-white/40">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Weekly Spending by Brand</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={weeklyData}
                    margin={{
                        top: 5,
                        right: 10,
                        left: -20,
                        bottom: 5,
                    }}
                >
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={{ stroke: '#E5E7EB' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={{ stroke: '#E5E7EB' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#E5E7EB', color: '#1F2937', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: '#1F2937' }}
                    />
                    <Bar dataKey="Netflix" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Nike" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Uber" stackId="a" fill="#9333EA" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
