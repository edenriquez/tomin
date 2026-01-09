import React from 'react';
import { Receipt } from 'lucide-react';

interface Transaction {
    id: string;
    description: string;
    date: string;
    amount: number;
    merchant_name?: string;
}

interface TransactionListProps {
    transactions: Transaction[];
    onViewAll?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onViewAll }) => {
    return (
        <div className="card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Movimientos Recientes</h3>
                <button
                    onClick={onViewAll}
                    className="text-sm font-medium text-blue-600 hover:underline"
                >
                    Ver todos
                </button>
            </div>

            {transactions.length > 0 ? (
                <div className="space-y-4">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                    <Receipt size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                                        {tx.description.toLowerCase()}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-500">
                                            {new Date(tx.date).toLocaleDateString('es-MX', {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </p>
                                        {tx.merchant_name && (
                                            <>
                                                <span className="text-[10px] text-gray-300">•</span>
                                                <p className="text-xs text-gray-500 font-bold">
                                                    {tx.merchant_name}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className={`font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-gray-400">
                    <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No hay movimientos recientes para mostrar.</p>
                </div>
            )}
        </div>
    );
};
