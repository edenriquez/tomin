'use client';

import { MoreVertical } from 'lucide-react';

interface IncomeSource {
    name: string;
    amount: number;
    color: string;
}

interface IncomeManagementProps {
    totalIncome?: number;
    vsLastYear?: number;
    sources?: IncomeSource[];
}

const defaultSources: IncomeSource[] = [
    { name: 'Main Job', amount: 84693, color: 'bg-purple-600' },
    { name: 'Freelance', amount: 47497, color: 'bg-yellow-400' },
    { name: 'Others', amount: 15832, color: 'bg-cyan-400' },
];

export default function IncomeManagement({
    totalIncome = 158322,
    vsLastYear = 832642,
    sources = defaultSources
}: IncomeManagementProps) {
    const total = sources.reduce((sum, source) => sum + source.amount, 0);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-gray-900">Income Management</h3>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Total Amount */}
            <div className="mb-4">
                <div className="text-4xl font-bold text-gray-900 mb-1">
                    ${totalIncome.toLocaleString()}
                </div>
                <div className="text-sm text-green-600">
                    +${vsLastYear.toLocaleString()} vs last years
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                    {sources.map((source, index) => {
                        const percentage = (source.amount / total) * 100;
                        return (
                            <div
                                key={index}
                                className={`${source.color} transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        );
                    })}
                </div>
            </div>

            {/* Income Sources */}
            <div className="space-y-3">
                {sources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${source.color}`}></div>
                            <span className="text-sm text-gray-700">{source.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                            ${source.amount.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
