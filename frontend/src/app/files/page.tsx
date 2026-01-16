"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import {
    FileText,
    Trash2,
    ChevronDown,
    ChevronUp,
    RefreshCcw,
    Plus,
    Building2,
    BarChart3,
    CreditCard,
    PiggyBank
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricCard } from '@/components/ui/MetricCard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import UploadFile from '@/components/upload/UploadFile';
import { financialService } from '@/services/api';
import { Spinner } from '@/components/ui/Spinner';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { useDashboardData } from '@/hooks/useDashboardData';

interface BankFile {
    id: string;
    name: string;
    uploadDate: string;
    period: string;
}

interface BankAccount {
    id: string;
    name: string;
    type: 'Débito' | 'Crédito';
    lastSync: string;
    files: BankFile[];
    icon: string; // From backend: credit_card | savings
}

export default function FilesPage() {
    const { notification, fetchData: refreshDashboard, hideNotification } = useDashboardData();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [stats, setStats] = useState({ accountsCount: 0, filesCount: 0 });
    const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const [accountsData, countData] = await Promise.all([
                financialService.getStatements(),
                financialService.getStatementsCount()
            ]);
            setAccounts(accountsData);
            setStats({
                accountsCount: accountsData.length,
                filesCount: countData.count
            });
            // Expand first account by default if exists
            if (accountsData.length > 0 && expandedAccounts.length === 0) {
                setExpandedAccounts([accountsData[0].id]);
            }
        } catch (error) {
            console.error('Error loading statements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleAccount = (id: string) => {
        setExpandedAccounts(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este archivo? Se eliminarán también todas sus transacciones asociadas.')) {
            return;
        }

        try {
            await financialService.deleteStatement(fileId);
            // Refresh data
            const [accountsData, countData] = await Promise.all([
                financialService.getStatements(),
                financialService.getStatementsCount()
            ]);
            setAccounts(accountsData);
            setStats({
                accountsCount: accountsData.length,
                filesCount: countData.count
            });
        } catch (error) {
            console.error('Error deleting statement:', error);
            alert('Error al eliminar el archivo.');
        }
    };

    const getAccountIcon = (iconName: string) => {
        switch (iconName) {
            case 'savings': return <PiggyBank className="text-blue-600" size={20} />;
            case 'credit_card': return <CreditCard className="text-red-600" size={20} />;
            default: return <Building2 size={20} />;
        }
    };

    const getIconContainerClass = (iconName: string) => {
        switch (iconName) {
            case 'savings': return "bg-blue-50 dark:bg-blue-900/20";
            case 'credit_card': return "bg-red-50 dark:bg-red-900/20";
            default: return "bg-gray-50 dark:bg-gray-800";
        }
    }

    return (
        <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#101622]">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto max-w-7xl p-4 md:p-8 flex flex-col gap-6">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-[#111318] dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                                Estados de Cuenta
                            </h1>
                            <p className="text-[#616f89] dark:text-gray-400 text-base font-normal leading-normal">
                                Gestiona tus archivos por banco y tipo de tarjeta.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <UploadFile />
                            <ThemeToggle />
                        </div>
                    </header>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[400px]">
                            <Spinner />
                        </div>
                    ) : (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <MetricCard
                                    title="Cuentas conectadas"
                                    value={stats.accountsCount.toString()}
                                    icon={<Building2 size={20} />}
                                    iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                                />
                                <MetricCard
                                    title="Archivos procesados"
                                    value={stats.filesCount.toString()}
                                    icon={<BarChart3 size={20} />}
                                    iconBg="bg-green-100 text-green-600 dark:bg-green-900/30"
                                />
                            </div>

                            {/* Accounts List */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-[#111318] dark:text-white">Mis Cuentas y Tarjetas</h3>
                                    <button className="text-sm font-medium text-[#135bec] hover:underline flex items-center gap-1">
                                        <Plus size={16} /> Vincular otra
                                    </button>
                                </div>

                                {accounts.map(account => (
                                    <div
                                        key={account.id}
                                        className="bg-white dark:bg-[#1a2332] rounded-xl border border-[#dbdfe6] dark:border-gray-800 overflow-hidden shadow-sm"
                                    >
                                        <button
                                            onClick={() => toggleAccount(account.id)}
                                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn("size-10 rounded-lg flex items-center justify-center", getIconContainerClass(account.icon))}>
                                                    {getAccountIcon(account.icon)}
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-bold text-[#111318] dark:text-white">{account.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn(
                                                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                                            account.type === 'Débito'
                                                                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                                                : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                                        )}>
                                                            {account.type}
                                                        </span>
                                                        <span className="text-xs text-[#616f89] dark:text-gray-500 flex items-center gap-1">
                                                            <RefreshCcw size={12} className="opacity-70" />
                                                            Última sincronización: {account.lastSync}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {expandedAccounts.includes(account.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>

                                        {expandedAccounts.includes(account.id) && (
                                            <div className="border-t border-[#f0f2f5] dark:border-gray-800">
                                                {account.files.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-sm">
                                                            <thead className="bg-[#f8f9fb] dark:bg-white/5 text-[10px] uppercase font-bold text-[#616f89] dark:text-gray-400">
                                                                <tr>
                                                                    <th className="px-6 py-3">Nombre del Archivo</th>
                                                                    <th className="px-6 py-3">Fecha de Carga</th>
                                                                    <th className="px-6 py-3">Periodo</th>
                                                                    <th className="px-6 py-3 text-right">Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-[#f0f2f5] dark:divide-gray-800">
                                                                {account.files.map(file => (
                                                                    <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <FileText className="text-[#135bec]" size={18} />
                                                                                <span className="font-semibold text-gray-800 dark:text-white">{file.name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-[#616f89] dark:text-gray-400">{file.uploadDate}</td>
                                                                        <td className="px-6 py-4">
                                                                            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-[11px] font-bold text-[#135bec] dark:text-blue-400">
                                                                                {file.period}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <button
                                                                                onClick={() => handleDelete(file.id)}
                                                                                className="text-[#616f89] hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                                                            >
                                                                                <Trash2 size={18} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="p-12 text-center flex flex-col items-center gap-2">
                                                        <FileText className="text-gray-300 dark:text-gray-700" size={48} />
                                                        <p className="text-sm text-[#616f89] dark:text-gray-400">No hay archivos cargados recientemente para esta tarjeta.</p>
                                                        <button className="mt-4 text-sm font-bold text-[#135bec] hover:underline">
                                                            Subir primer estado
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
            {notification.visible && (
                <NotificationToast
                    message={notification.message}
                    onRefresh={() => {
                        loadData();
                        refreshDashboard();
                        hideNotification();
                    }}
                    onClose={hideNotification}
                />
            )}
        </div>
    );
}
