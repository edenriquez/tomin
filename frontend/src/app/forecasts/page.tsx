"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProjectionChart } from '@/components/charts/ProjectionChart';
import { ForecastSimulator } from '@/components/ui/ForecastSimulator';
import {
    TrendingUp,
    PieChart,
    Shield,
    Banknote,
    ArrowDown,
    CheckCircle,
    Search,
    Bell,
    Sparkles,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MetricMini = ({ title, value, detail, trend, icon: Icon, color }: any) => (
    <div className="card !p-5">
        <div className="flex items-start justify-between mb-2">
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <Icon size={18} className="text-gray-300" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <div className={cn("flex items-center gap-1 mt-2 text-sm font-medium", color)}>
            {trend === 'up' ? <TrendingUp size={14} /> : <ArrowDown size={14} />}
            <span>{detail}</span>
        </div>
    </div>
);

const InsightItem = ({ title, description, icon: Icon, color }: any) => (
    <div className="card !p-4 hover:border-[#135bec]/50 transition-colors cursor-pointer group">
        <div className="flex gap-3">
            <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0", color)}>
                <Icon size={16} />
            </div>
            <div>
                <h4 className="text-sm font-bold group-hover:text-[#135bec] transition-colors">{title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{description}</p>
            </div>
        </div>
    </div>
);

export default function ForecastPage() {
    return (
        <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101622]">
            <Sidebar />

            <main className="flex-1 overflow-y-auto w-full">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#101622]/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur items-center justify-between px-6 h-16 flex">
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-600 text-sm font-medium">
                            <span>Próximos 6 meses</span>
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                            <Search size={20} />
                        </button>
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                            <Bell size={20} />
                        </button>
                        <div className="size-9 rounded-full bg-cover bg-center bg-[url('https://avatar.vercel.sh/alejandro')]" />
                    </div>
                </header>

                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Page Intro */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">Tu Futuro Financiero</h1>
                            <p className="text-gray-500">Visualiza y optimiza tu estrategia de patrimonio con IA.</p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#135bec] text-white text-sm font-bold shadow-lg shadow-[#135bec]/30 hover:opacity-90 transition-all">
                            <Sparkles size={18} />
                            Aplicar Sugerencias de IA
                        </button>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <MetricMini
                            title="Patrimonio Proyectado"
                            value="$450,000 MXN"
                            detail="+15% vs mes anterior"
                            trend="up"
                            icon={TrendingUp}
                            color="text-emerald-600"
                        />
                        <MetricMini
                            title="Ratio de Deuda"
                            value="12%"
                            detail="-2% de mejora"
                            trend="down"
                            icon={PieChart}
                            color="text-emerald-600"
                        />
                        <MetricMini
                            title="Fondo de Emergencia"
                            value="6 Meses"
                            detail="Meta alcanzada"
                            trend="up"
                            icon={Shield}
                            color="text-emerald-600"
                        />
                        <MetricMini
                            title="Flujo Libre Mensual"
                            value="$8,500 MXN"
                            detail="+5% proyectado"
                            trend="up"
                            icon={Banknote}
                            color="text-emerald-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Col: Chart & Table */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <div className="card">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold">Proyección de Patrimonio</h3>
                                        <p className="text-sm text-gray-500">Crecimiento basado en tu estrategia actual vs optimizada</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2.5 rounded-full bg-gray-300" />
                                            <span className="text-gray-500">Base</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="size-2.5 rounded-full bg-[#135bec]" />
                                            <span className="text-gray-900 border-b-2 border-transparent">Optimizado por IA</span>
                                        </div>
                                    </div>
                                </div>
                                <ProjectionChart />
                            </div>

                            {/* Monthly Breakdown Table */}
                            <div className="card !p-0 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-bold">Desglose Mensual</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-medium">
                                            <tr>
                                                <th className="px-6 py-4">Periodo</th>
                                                <th className="px-6 py-4">Ingresos</th>
                                                <th className="px-6 py-4">Gastos</th>
                                                <th className="px-6 py-4">Ahorro Proj.</th>
                                                <th className="px-6 py-4 text-right">Patrimonio</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {[1, 2, 3, 4].map((i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium">Octubre 2024</td>
                                                    <td className="px-6 py-4">$45,000</td>
                                                    <td className="px-6 py-4">$28,500</td>
                                                    <td className="px-6 py-4 text-emerald-600 font-bold">$16,500</td>
                                                    <td className="px-6 py-4 text-right font-black">$450,000</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Simulator & AI */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <ForecastSimulator />

                            {/* AI Insights Section */}
                            <div className="bg-gradient-to-br from-[#135bec]/10 to-transparent rounded-xl border border-[#135bec]/20 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles size={20} className="text-[#135bec]" />
                                    <h3 className="text-lg font-bold">Insights de Tomin AI</h3>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <InsightItem
                                        title="Maximiza Cetes"
                                        description="Mueve $2,000 MXN de tu cuenta corriente a Cetes Directo para ganar ~11% anual."
                                        icon={TrendingUp}
                                        color="bg-emerald-100 text-emerald-600"
                                    />
                                    <InsightItem
                                        title="Alerta: Restaurantes"
                                        description="Tu gasto es 15% mayor a tu promedio. Considera cocinar en casa este fin de semana."
                                        icon={Banknote}
                                        color="bg-amber-100 text-amber-600"
                                    />
                                    <InsightItem
                                        title="Meta más cercana"
                                        description="Si aumentas tu ahorro $500/mes, alcanzarás el enganche de tu casa 2 meses antes."
                                        icon={Shield}
                                        color="bg-blue-100 text-[#135bec]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
