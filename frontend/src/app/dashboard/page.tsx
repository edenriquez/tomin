"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MetricCard } from '@/components/ui/MetricCard';
import { DistributionChart } from '@/components/charts/DistributionChart';
import { Wallet, Receipt, Plane } from 'lucide-react';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useDashboardData } from '@/hooks/useDashboardData';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { AIInsightCard } from '@/components/dashboard/AIInsightCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useRouter } from 'next/navigation';
import { TimePeriodFilter } from '@/components/dashboard/TimePeriodFilter';
import { useFilters } from '@/contexts/FilterContext';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
    const { period } = useFilters();
    const router = useRouter();

    const {
        spendingData,
        transactions,
        summaryData,
        loading,
        notification,
        fetchData,
        hideNotification
    } = useDashboardData(period);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const getTrendColor = (trend: number) => {
        return trend >= 0 ? "text-red-500" : "text-green-500";
    };

    return (
        <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101622]">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto max-w-7xl p-4 md:p-8 flex flex-col gap-6">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-[#111318] dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                                Dashboard Financiero
                            </h1>
                            <p className="text-[#616f89] dark:text-gray-400 text-base font-normal leading-normal">
                                Bienvenido de nuevo. Aquí tienes un resumen de tus finanzas.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                        </div>
                    </header>

                    {/* Filters */}
                    <TimePeriodFilter />

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[400px]">
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            {/* Top Metrics */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <MetricCard
                                    title="Balance Total"
                                    value={summaryData ? formatCurrency(summaryData.total_balance) : "$0.00"}
                                    trend={summaryData ? `${summaryData.balance_trend.toFixed(1)}% vs mes pasado` : "0% vs mes pasado"}
                                    icon={<Wallet size={20} />}
                                    iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                                />
                                <MetricCard
                                    title="Gastos del Mes"
                                    value={summaryData ? formatCurrency(summaryData.monthly_spending) : "$0.00"}
                                    trend={summaryData ? `${summaryData.spending_trend.toFixed(1)}% vs mes pasado` : "0% vs mes pasado"}
                                    icon={<Receipt size={20} />}
                                    iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                                />
                                <MetricCard
                                    title="Ahorro Total"
                                    value={summaryData ? formatCurrency(summaryData.total_savings) : "$0.00"}
                                    trend="En tus Cajitas"
                                    icon={<Plane size={20} />}
                                    iconBg="bg-green-100 text-green-600 dark:bg-green-900/30"
                                />
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                                <div className="lg:col-span-8 space-y-8">
                                    {/* Distribution Chart */}
                                    <div className="card bg-white dark:bg-[#1a202c] p-6 rounded-xl border border-[#dbdfe6] dark:border-gray-700 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-[#111318] dark:text-white">Distribución de Gastos</h3>
                                            <button
                                                onClick={() => router.push('/spending')}
                                                className="text-sm font-medium text-[#135bec] hover:underline"
                                            >
                                                Ver reporte completo
                                            </button>
                                        </div>
                                        <DistributionChart data={spendingData} />
                                    </div>

                                    {/* Recent Transactions */}
                                    <TransactionList
                                        transactions={transactions}
                                        onViewAll={() => router.push('/spending')}
                                    />
                                </div>

                                {/* Sidebar Actions */}
                                <div className="lg:col-span-4 space-y-6">
                                    <AIInsightCard />
                                    <QuickActions />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {notification.visible && (
                <NotificationToast
                    message={notification.message}
                    onRefresh={() => {
                        fetchData();
                        hideNotification();
                    }}
                    onClose={hideNotification}
                />
            )}
        </div>
    );
}
