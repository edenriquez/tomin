'use client';

import { Filter, ArrowUpDown, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';

interface Transaction {
    id: string;
    name: string;
    date: string;
    category: string;
    categoryColor: string;
    amount: number;
    status: 'success' | 'cancelled';
}

interface TransactionsHistoryProps {
    transactions?: Transaction[];
}

const defaultTransactions: Transaction[] = [
    {
        id: '1',
        name: 'Grocery Mart Purchase',
        date: 'May 24, 2024 08:12',
        category: 'Food & Groceries',
        categoryColor: 'bg-purple-600',
        amount: 630.44,
        status: 'success',
    },
    {
        id: '2',
        name: 'Figma Pro Subscription',
        date: 'May 23, 2024 17:40',
        category: 'Subscriptions',
        categoryColor: 'bg-green-600',
        amount: 106.68,
        status: 'success',
    },
    {
        id: '3',
        name: 'Electricity Bill Payment',
        date: 'May 23, 2024 14:26',
        category: 'Housing & Utilities',
        categoryColor: 'bg-yellow-500',
        amount: 589.99,
        status: 'cancelled',
    },
    {
        id: '4',
        name: 'Annual Health Insurance',
        date: 'May 21, 2024 09:33',
        category: 'Healthcare',
        categoryColor: 'bg-blue-500',
        amount: 739.05,
        status: 'cancelled',
    },
    {
        id: '5',
        name: 'Fuel Top-Up',
        date: 'May 20, 2024 19:47',
        category: 'Transportation',
        categoryColor: 'bg-red-500',
        amount: 169.43,
        status: 'success',
    },
    {
        id: '6',
        name: 'Spotify & Netflix Bundle',
        date: 'May 20, 2024 08:22',
        category: 'Subscriptions',
        categoryColor: 'bg-green-600',
        amount: 490.01,
        status: 'success',
    },
    {
        id: '7',
        name: 'Cloud Storage Upgrade',
        date: 'May 18, 2024 10:16',
        category: 'Subscriptions',
        categoryColor: 'bg-green-600',
        amount: 105.08,
        status: 'success',
    },
];

export default function TransactionsHistory({ transactions = defaultTransactions }: TransactionsHistoryProps) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-gray-900">Transactions History</h3>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                        <ArrowUpDown size={14} />
                        Sort
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700">
                        <Filter size={14} />
                        Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-4">
                                <input type="checkbox" className="rounded border-gray-300" />
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transaction
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="py-3 px-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((transaction) => (
                            <tr
                                key={transaction.id}
                                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                            >
                                <td className="py-4 px-4">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </td>
                                <td className="py-4 px-4">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{transaction.name}</div>
                                        <div className="text-xs text-gray-500">{transaction.date}</div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${transaction.categoryColor}`}></div>
                                        <span className="text-sm text-gray-700">{transaction.category}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="text-sm font-semibold text-gray-900">
                                        ${transaction.amount.toFixed(2)}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        {transaction.status === 'success' ? (
                                            <>
                                                <CheckCircle size={16} className="text-green-600" />
                                                <span className="text-sm text-green-600">Success</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={16} className="text-red-600" />
                                                <span className="text-sm text-red-600">Cancelled</span>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
