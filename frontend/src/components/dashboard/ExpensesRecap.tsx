'use client';

import { MoreVertical, Utensils, Home, Car, Heart, Package } from 'lucide-react';
import { useState } from 'react';

interface ExpenseCategory {
    name: string;
    description: string;
    amount: number;
    color: string;
    icon: any;
}

interface ExpensesRecapProps {
    totalExpenses?: number;
    categories?: ExpenseCategory[];
}

const defaultCategories: ExpenseCategory[] = [
    {
        name: 'Food & Groceries',
        description: 'Daily meals, groceries, takeout.',
        amount: 62184,
        color: '#8B5CF6',
        icon: Utensils
    },
    {
        name: 'Housing & Utilities',
        description: 'Rent, electricity, water, internet.',
        amount: 28347,
        color: '#60A5FA',
        icon: Home
    },
    {
        name: 'Transportation',
        description: 'Fuel, repairs, public transit.',
        amount: 16092,
        color: '#34D399',
        icon: Car
    },
    {
        name: 'Healthcare',
        description: 'Insurance, medicine, doctor visits.',
        amount: 10629,
        color: '#FB923C',
        icon: Heart
    },
    {
        name: 'Subscriptions',
        description: 'Netflix, Spotify, iCloud.',
        amount: 7379,
        color: '#FBBF24',
        icon: Package
    },
];

export default function ExpensesRecap({
    totalExpenses = 114631,
    categories = defaultCategories
}: ExpensesRecapProps) {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    const total = categories.reduce((sum, cat) => sum + cat.amount, 0);

    // Calculate percentages and cumulative values for donut chart
    const radius = 75;
    const circumference = 2 * Math.PI * radius;

    let cumulativePercent = 0;
    const segments = categories.map(cat => {
        const percentage = (cat.amount / total) * 100;
        const segment = {
            ...cat,
            percentage,
            offset: cumulativePercent,
        };
        cumulativePercent += percentage;
        return segment;
    });

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-gray-900">Expenses Recap</h3>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Donut Chart */}
            <div className="flex items-center justify-center mb-8 relative">
                <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                    {segments.map((segment, index) => {
                        const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((segment.offset / 100) * circumference);

                        return (
                            <circle
                                key={index}
                                cx="100"
                                cy="100"
                                r={radius}
                                fill="transparent"
                                stroke={segment.color}
                                strokeWidth="30"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-opacity duration-200 cursor-pointer"
                                opacity={hoveredCategory === segment.name ? 1 : 0.9}
                                onMouseEnter={() => setHoveredCategory(segment.name)}
                                onMouseLeave={() => setHoveredCategory(null)}
                            />
                        );
                    })}
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-gray-900">
                        ${totalExpenses.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Total Expenses</div>
                </div>
            </div>

            {/* Categories List */}
            <div className="space-y-3">
                {categories.map((category, index) => {
                    const Icon = category.icon;
                    const isHovered = hoveredCategory === category.name;

                    return (
                        <div
                            key={index}
                            className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${isHovered ? 'bg-gray-50' : ''
                                }`}
                            onMouseEnter={() => setHoveredCategory(category.name)}
                            onMouseLeave={() => setHoveredCategory(null)}
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${category.color}20` }}
                                >
                                    <Icon size={18} style={{ color: category.color }} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                    <div className="text-xs text-gray-500">{category.description}</div>
                                </div>
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                                ${category.amount.toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
