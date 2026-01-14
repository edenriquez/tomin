"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
    Calendar,
    Download,
    ChevronDown,
    Wallet,
    TrendingUp,
    Utensils,
    Minus,
    CalendarClock,
    TrendingDown,
    Sparkles,
    Search,
    MoreVertical
} from 'lucide-react';
import { financialService } from '@/services/api';
import { TimePeriodFilter } from '@/components/dashboard/TimePeriodFilter';

// Helper for formatting currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(Math.abs(amount));
};

export default function SpendingPage() {
    const [loading, setLoading] = useState(true);
    const [spendingData, setSpendingData] = useState<any[]>([]);
    const [recurringTxs, setRecurringTxs] = useState<any[]>([]);
    const [totalOutflow, setTotalOutflow] = useState(0);
    const [period, setPeriod] = useState('weekly'); // Default period

    useEffect(() => {
        const fetchSpendingData = async () => {
            setLoading(true);
            try {
                const [distribution, recurring] = await Promise.all([
                    financialService.getSpendingDistribution(period),
                    financialService.getRecurringTransactions(period)
                ]);

                // Calculate total outflow
                const total = distribution.reduce((acc: number, item: any) => acc + item.total_amount, 0);
                setTotalOutflow(total);

                // Map distribution for treemap (simplified)
                const mappedDistribution = distribution.map((item: any) => ({
                    category: item.category_name,
                    amount: item.total_amount,
                    percentage: Math.round(item.percentage),
                    color: item.color
                })).sort((a: any, b: any) => b.amount - a.amount);

                setSpendingData(mappedDistribution);
                setRecurringTxs(recurring);
            } catch (err) {
                console.error("Error fetching spending data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSpendingData();
    }, [period]);

    const topCategory = spendingData.length > 0 ? spendingData[0] : null;

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] dark:bg-[#101622] text-gray-500">Cargando insights...</div>;

    return (
        <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101622]">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto max-w-7xl p-4 md:p-8 flex flex-col gap-6">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-[#111318] dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                                Distribución de Gastos
                            </h1>
                            <p className="text-[#616f89] dark:text-gray-400 text-base font-normal leading-normal">
                                Analiza tus salidas y patrones recurrentes
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 border border-[#dbdfe6] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <Calendar size={18} />
                                <span className="truncate">Este Mes</span>
                            </button>
                            <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[#135bec] text-white text-sm font-bold shadow-sm hover:bg-[#135bec]/90 transition-colors">
                                <Download size={18} />
                                <span className="truncate">Exportar Reporte</span>
                            </button>
                            <ThemeToggle />
                        </div>
                    </header>

                    {/* Filters */}
                    <TimePeriodFilter value={period} onChange={setPeriod} />

                    {/* KPI Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Outflow */}
                        <div className="bg-white dark:bg-[#1a202c] rounded-xl p-5 border border-[#dbdfe6] dark:border-gray-700 shadow-sm flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[#616f89] dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                                    Total Gastado
                                </p>
                                <div className="bg-[#135bec]/10 p-1 rounded-md text-[#135bec]">
                                    <Wallet size={20} />
                                </div>
                            </div>
                            <p className="text-[#111318] dark:text-white text-2xl font-bold mt-2">
                                {formatCurrency(totalOutflow)} <span className="text-sm font-normal text-gray-500">MXN</span>
                            </p>
                            <div className="flex items-center gap-1 text-[#d32f2f] text-sm font-medium mt-1">
                                <TrendingUp size={16} />
                                <span>+12% vs mes pasado</span>
                            </div>
                        </div>

                        {/* Top Category */}
                        <div className="bg-white dark:bg-[#1a202c] rounded-xl p-5 border border-[#dbdfe6] dark:border-gray-700 shadow-sm flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[#616f89] dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                                    Categoría Top
                                </p>
                                <div className="bg-orange-100 p-1 rounded-md text-orange-500">
                                    <Utensils size={20} />
                                </div>
                            </div>
                            <p className="text-[#111318] dark:text-white text-2xl font-bold mt-2 truncate">
                                {topCategory ? topCategory.category : 'N/A'}
                            </p>
                            <div className="flex items-center gap-1 text-[#616f89] dark:text-gray-400 text-sm font-medium mt-1">
                                <Minus size={16} />
                                <span>Igual que el mes pasado</span>
                            </div>
                        </div>

                        {/* Recurrent Bills */}
                        <div className="bg-white dark:bg-[#1a202c] rounded-xl p-5 border border-[#dbdfe6] dark:border-gray-700 shadow-sm flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[#616f89] dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                                    Gastos Recurrentes
                                </p>
                                <div className="bg-purple-100 p-1 rounded-md text-purple-500">
                                    <CalendarClock size={20} />
                                </div>
                            </div>
                            <p className="text-[#111318] dark:text-white text-2xl font-bold mt-2">
                                {recurringTxs ? recurringTxs.length : 0} <span className="text-sm font-normal text-gray-500">detectados</span>
                            </p>
                            <div className="flex items-center gap-1 text-[#07883b] text-sm font-medium mt-1">
                                <TrendingDown size={16} />
                                <span>Estables</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Visualization & AI Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Treemap Chart Area */}
                        <div className="lg:col-span-2 bg-white dark:bg-[#1a202c] rounded-xl p-6 border border-[#dbdfe6] dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[#111318] dark:text-white text-lg font-bold">¿En qué se fue tu dinero?</h3>
                                <button className="text-[#135bec] text-sm font-medium hover:underline">Ver detalles completos</button>
                            </div>

                            {/* Visual Treemap Mockup using CSS Grid */}
                            <div className="w-full aspect-[4/3] sm:aspect-[2/1] lg:aspect-[16/9] grid grid-cols-4 grid-rows-4 gap-1 rounded-lg overflow-hidden font-display text-white">
                                {spendingData.slice(0, 5).map((item, index) => {
                                    let gridClasses = "";
                                    let contentLayout = "";

                                    if (index === 0) {
                                        gridClasses = "col-span-2 row-span-4";
                                        contentLayout = "flex flex-col justify-between";
                                    } else if (index === 1) {
                                        gridClasses = "col-span-2 row-span-2";
                                        contentLayout = "flex flex-col justify-between";
                                    } else if (index === 2) {
                                        gridClasses = "col-span-1 row-span-2";
                                        contentLayout = "flex flex-col justify-between";
                                    } else {
                                        gridClasses = "col-span-1 row-span-1";
                                        contentLayout = "flex flex-col justify-center";
                                    }

                                    return (
                                        <div
                                            key={index}
                                            className={`${gridClasses} ${contentLayout} p-3 transition-colors cursor-pointer group relative hover:opacity-90`}
                                            style={{ backgroundColor: item.color || '#135bec' }}
                                        >
                                            {index === 0 && (
                                                <>
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-sm md:text-base truncate pr-2">{item.category}</span>
                                                        <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded ml-auto whitespace-nowrap">{item.percentage}%</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-lg md:text-2xl font-bold">{formatCurrency(item.amount)}</p>
                                                        <p className="text-xs text-white/70 group-hover:text-white truncate">&nbsp;</p>
                                                    </div>
                                                </>
                                            )}
                                            {index === 1 && (
                                                <>
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-sm md:text-base truncate pr-2">{item.category}</span>
                                                        <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded ml-auto whitespace-nowrap">{item.percentage}%</span>
                                                    </div>
                                                    <p className="text-lg md:text-xl font-bold">{formatCurrency(item.amount)}</p>
                                                </>
                                            )}
                                            {index === 2 && (
                                                <>
                                                    <span className="font-bold text-xs md:text-sm truncate">{item.category}</span>
                                                    <p className="text-sm md:text-lg font-bold">{formatCurrency(item.amount)}</p>
                                                </>
                                            )}
                                            {(index === 3 || index === 4) && (
                                                <>
                                                    <span className="font-bold text-xs truncate">{item.category}</span>
                                                    <p className="text-sm font-bold">{formatCurrency(item.amount)}</p>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                                {/* Fill empty slots if less than 5 items to maintain grid structure visuals or just leave empty? Mock is fixed. 
                                    If we have fewer items, the grid will just be empty. That is fine. */}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 mt-4 text-xs text-[#616f89] dark:text-gray-400">
                                {spendingData.slice(0, 5).map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color || '#135bec' }}></div>
                                        {item.category}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Smart Findings Panel */}
                        <div className="lg:col-span-1 flex flex-col gap-4">
                            <div className="bg-gradient-to-b from-[#eef2ff] to-white dark:from-[#1e2536] dark:to-[#1a202c] rounded-xl p-5 border border-[#dbdfe6] dark:border-gray-700 shadow-sm h-full">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-[#135bec]/10 p-2 rounded-full text-[#135bec]">
                                        <Sparkles size={20} />
                                    </div>
                                    <h3 className="text-[#111318] dark:text-white text-lg font-bold">Hallazgos Inteligentes</h3>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-[#135bec]/20 shadow-sm">
                                        <p className="text-xs font-bold text-[#135bec] mb-1 uppercase tracking-wider">Alerta de Gasto</p>
                                        <p className="text-sm text-[#111318] dark:text-gray-200">
                                            Gastaste un <span className="font-bold">15% más</span> en fines de semana comparado con tu promedio.
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-[#dbdfe6] dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-bold text-teal-600 mb-1 uppercase tracking-wider">Buen Trabajo</p>
                                        <p className="text-sm text-[#111318] dark:text-gray-200">
                                            Tus gastos hormiga disminuyeron $450 MXN este mes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recurring Expenses Table */}
                    <div className="bg-white dark:bg-[#1a202c] rounded-xl border border-[#dbdfe6] dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-[#dbdfe6] dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-[#111318] dark:text-white text-lg font-bold">Gastos Recurrentes</h3>
                                <p className="text-[#616f89] dark:text-gray-400 text-sm">Costos fijos y suscripciones detectadas</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        <Search size={16} />
                                    </span>
                                    <input
                                        className="pl-10 pr-4 py-2 border border-[#dbdfe6] dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-[#111318] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#135bec]/50 w-full sm:w-64"
                                        placeholder="Buscar..."
                                        type="text"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f9fafb] dark:bg-gray-800 border-b border-[#dbdfe6] dark:border-gray-700">
                                        <th className="px-6 py-4 text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider">Comercio</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider text-right">Monto</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider text-center">Estado</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#dbdfe6] dark:divide-gray-700">
                                    {recurringTxs.length > 0 ? recurringTxs.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-[#f0f2f4] dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                                                        {(tx.description).substring(0, 1)}
                                                    </div>
                                                    <span className="text-sm font-medium text-[#111318] dark:text-white capitalize">
                                                        {tx.description.toLowerCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#111318] dark:text-white">
                                                {new Date(tx.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#111318] dark:text-white text-right">
                                                {formatCurrency(tx.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    Activo
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button className="text-[#616f89] hover:text-[#135bec] dark:text-gray-400 dark:hover:text-white">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                No se encontraron gastos recurrentes.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
