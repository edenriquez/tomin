"use client";

import React from 'react';
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

export default function DashboardPage() {
    const router = useRouter();
    const {
        spendingData,
        transactions,
        loading,
        notification,
        fetchData,
        hideNotification
    } = useDashboardData();

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando datos financieros...</div>;

    return (
        <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101622]">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur dark:border-gray-800 dark:bg-[#101622]/80">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hola, Alejandro 👋</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                    </div>
                </header>

                <div className="p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        {/* Top Metrics */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                            <MetricCard
                                title="Balance Total"
                                value="$45,200.00"
                                trend="+12% vs mes pasado"
                                icon={<Wallet size={20} />}
                                iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                            />
                            <MetricCard
                                title="Gastos del Mes"
                                value="$12,450.00"
                                trend="5% bajo presupuesto"
                                icon={<Receipt size={20} />}
                                iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                            />
                            <MetricCard
                                title="Meta: Viaje a Cancún"
                                value="$15,000"
                                trend="65% completado"
                                icon={<Plane size={20} />}
                                iconBg="bg-green-100 text-green-600 dark:bg-green-900/30"
                            />
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                            <div className="lg:col-span-8 space-y-8">
                                {/* Distribution Chart */}
                                <div className="card">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold">Distribución de Gastos</h3>
                                        <button className="text-sm font-medium text-blue-600 hover:underline">Ver reporte completo</button>
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
                    </div>
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
