"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api, SpendingSummary, Transaction } from "@/lib/api";
import { mxn } from "@/lib/format";
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
            <h1 className="text-title-md font-semibold text-ink">Hola, Alejandro</h1>
            <p className="text-body-sm text-pewter">Tu resumen financiero</p>

            {error && (
                <p className="mt-4 rounded-control border-l-2 border-ember bg-fog p-3 text-body-sm text-graphite">
                    No se pudo cargar la informacion ({error}). Verifica que el backend este
                    corriendo en el puerto 8000.
                </p>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <MetricCard label="Balance Total" value={mxn(balance)} hint="Ingresos - Gastos" />
                <MetricCard
                    label="Gastos del Mes"
                    value={mxn(summary?.total_expense ?? 0)}
                    hint={summary?.top_category ? `Top: ${summary.top_category}` : undefined}
                    hintColor="text-pewter"
                />
                <MetricCard
                    label="Ingresos"
                    value={mxn(summary?.total_income ?? 0)}
                    hint="Total registrado"
                />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
                <div className="space-y-6 md:col-span-2">
                    <section className="card">
                        <h2 className="mb-4 text-title-sm font-semibold text-ink">
                            Distribucion de Gastos
                        </h2>
                        <DistributionChart data={summary?.by_category ?? []} />
                    </section>

                    <section className="card">
                        <h2 className="mb-4 text-title-sm font-semibold text-ink">
                            Movimientos Recientes
                        </h2>
                        {txs.length === 0 ? (
                            <p className="text-body-sm text-pewter">
                                Sube un estado de cuenta para ver tus movimientos.
                            </p>
                        ) : (
                            <table className="w-full text-body-sm">
                                <thead className="text-left text-label text-pewter">
                                    <tr>
                                        <th className="pb-2 font-medium">Concepto</th>
                                        <th className="pb-2 font-medium">Fecha</th>
                                        <th className="pb-2 text-right font-medium">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {txs.map((t) => (
                                        <tr key={t.id} className="border-t border-mist">
                                            <td className="py-2 text-ink">{t.description}</td>
                                            <td className="py-2 text-pewter">{t.date}</td>
                                            <td
                                                className={`tabular py-2 text-right ${
                                                    t.type === "income"
                                                        ? "text-positive"
                                                        : "text-ink"
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
                    <section className="card border-l-2 border-l-ember">
                        <div className="flex items-center gap-2 font-semibold text-ink">
                            <Sparkles size={18} className="text-ember" /> Tomin AI Insight
                        </div>
                        <p className="mt-3 text-body-sm text-graphite">
                            {summary?.top_category
                                ? `Tu categoria con mayor gasto es ${summary.top_category}. Considera fijar un limite mensual.`
                                : "Sube tu primer estado de cuenta para recibir insights personalizados."}
                        </p>
                    </section>

                    <section className="card">
                        <h3 className="mb-3 text-label font-semibold text-pewter">
                            Acciones Rapidas
                        </h3>
                        <UploadButton onDone={load} />
                    </section>
                </div>
            </div>
        </div>
    );
}
