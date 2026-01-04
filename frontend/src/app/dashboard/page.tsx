"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MetricCard } from '@/components/ui/MetricCard';
import { DistributionChart } from '@/components/charts/DistributionChart';
import { Wallet, Receipt, Plane, Search, Bell, Plus, Upload, MessageSquare, Sparkles } from 'lucide-react';

import { financialService } from '@/services/api';

export default function DashboardPage() {
    const [spendingData, setSpendingData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        financialService.getSpendingDistribution()
            .then(data => {
                const mappedData = data.map((item: any) => ({
                    category: item.category_name,
                    amount: item.total_amount,
                    color: item.color,
                    percentage: Math.round(item.percentage)
                }));
                setSpendingData(mappedData);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando datos financieros...</div>;

    return (
        <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101622]">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur dark:border-gray-800 dark:bg-[#101622]/80">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hola, Alejandro 👋</h2>
                        <p className="text-xs text-gray-500">Hoy es 2 de Enero de 2026</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <Search size={20} />
                        </button>
                        <button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 border border-white dark:border-[#101622]" />
                        </button>
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

                                {/* Recent Transactions Placeholder */}
                                <div className="card">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold">Movimientos Recientes</h3>
                                        <button className="text-sm font-medium text-blue-600 hover:underline">Ver todos</button>
                                    </div>
                                    <div className="text-center py-12 text-gray-400">
                                        <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No hay movimientos recientes para mostrar.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Actions */}
                            <div className="lg:col-span-4 space-y-6">
                                {/* AI Insight */}
                                <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm dark:from-[#1a2332] dark:to-blue-900/10 dark:border-blue-900/30">
                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                                            <Sparkles size={20} />
                                            <h3>Tomin AI Insight</h3>
                                        </div>
                                        <p className="text-sm leading-relaxed">
                                            ¡Estás gastando un <strong>15% menos</strong> en restaurantes este mes! Sigue así para alcanzar tu meta de viaje a Cancún más rápido.
                                        </p>
                                        <button className="w-full btn-primary py-2 text-sm">
                                            Ver detalles
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="card">
                                    <h3 className="mb-4 text-sm font-bold uppercase text-gray-500 tracking-wider">Acciones Rápidas</h3>
                                    <div className="flex flex-col gap-3">
                                        <button className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black">
                                            <Plus size={18} />
                                            Agregar Transacción
                                        </button>
                                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:bg-[#1a2332] dark:border-gray-800">
                                            <Upload size={18} />
                                            Subir Estado de Cuenta
                                        </button>
                                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:bg-[#1a2332] dark:border-gray-800">
                                            <MessageSquare size={18} />
                                            Consultar Asistente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
