"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api, mxn, SpendingSummary, Transaction } from "@/lib/api";
import { MetricCard } from "@/components/MetricCard";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { UploadButton } from "@/components/UploadButton";

export default function DashboardPage() {
    const [summary, setSummary] = useState<SpendingSummary | null>(null);
    const [txs, setTxs] = useState<Transaction[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [s, t] = await Promise.all([api.summary(), api.transactions("?limit=6")]);
            setSummary(s);
            setTxs(t.items);
            setError(null);
        } catch (e) {
            setError((e as Error).message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const balance = summary ? summary.total_income - summary.total_expense : 0;

    return (
        <div>
            <h1 className="text-2xl font-bold">Hola, Alejandro</h1>
            <p className="text-slate-500 text-sm">Tu resumen financiero</p>

            {error && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    No se pudo cargar la informacion ({error}). Verifica que el backend este
                    corriendo en el puerto 8000.
                </p>
            )}

            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <MetricCard label="Balance Total" value={mxn(balance)} hint="Ingresos - Gastos" />
                <MetricCard
                    label="Gastos del Mes"
                    value={mxn(summary?.total_expense ?? 0)}
                    hint={summary?.top_category ? `Top: ${summary.top_category}` : undefined}
                    hintColor="text-slate-500"
                />
                <MetricCard
                    label="Ingresos"
                    value={mxn(summary?.total_income ?? 0)}
                    hint="Total registrado"
                />
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-6">
                <div className="md:col-span-2 space-y-6">
                    <section className="card">
                        <h2 className="font-semibold mb-4">Distribucion de Gastos</h2>
                        <DistributionChart data={summary?.by_category ?? []} />
                    </section>

                    <section className="card">
                        <h2 className="font-semibold mb-4">Movimientos Recientes</h2>
                        {txs.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                Sube un estado de cuenta para ver tus movimientos.
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-left text-slate-400 uppercase text-xs">
                                    <tr>
                                        <th className="pb-2">Concepto</th>
                                        <th className="pb-2">Fecha</th>
                                        <th className="pb-2 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {txs.map((t) => (
                                        <tr key={t.id} className="border-t border-slate-100">
                                            <td className="py-2">{t.description}</td>
                                            <td className="py-2 text-slate-500">{t.date}</td>
                                            <td
                                                className={`py-2 text-right ${
                                                    t.type === "income"
                                                        ? "text-emerald-600"
                                                        : "text-slate-900"
                                                }`}
                                            >
                                                {t.type === "expense" ? "-" : "+"}
                                                {mxn(t.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="card bg-brand/5 border-brand/20">
                        <div className="flex items-center gap-2 text-brand font-semibold">
                            <Sparkles size={18} /> Tomin AI Insight
                        </div>
                        <p className="mt-3 text-sm text-slate-700">
                            {summary?.top_category
                                ? `Tu categoria con mayor gasto es ${summary.top_category}. Considera fijar un limite mensual.`
                                : "Sube tu primer estado de cuenta para recibir insights personalizados."}
                        </p>
                    </section>

                    <section className="card">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">
                            Acciones Rapidas
                        </h3>
                        <UploadButton onDone={load} />
                    </section>
                </div>
            </div>
        </div>
    );
}
