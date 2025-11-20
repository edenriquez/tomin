'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

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
        <div className="h-64 w-full bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 text-center">Spending Distribution</h3>
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
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function FilterGroupChart() {
    return (
        <div className="h-64 w-full bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 text-center">Weekly Spending by Brand</h3>
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
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="Netflix" stackId="a" fill="#EF4444" />
                    <Bar dataKey="Nike" stackId="a" fill="#10B981" />
                    <Bar dataKey="Uber" stackId="a" fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
