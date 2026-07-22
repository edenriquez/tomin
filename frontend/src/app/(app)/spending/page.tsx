"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api, mxn, RecurringItem, SpendingSummary } from "@/lib/api";
import { MetricCard } from "@/components/MetricCard";
import { DistributionChart } from "@/components/charts/DistributionChart";

export default function SpendingPage() {
    const [summary, setSummary] = useState<SpendingSummary | null>(null);
    const [recurring, setRecurring] = useState<RecurringItem[]>([]);

    useEffect(() => {
        api.summary().then(setSummary).catch(() => {});
        api.recurring().then((r) => setRecurring(r.items)).catch(() => {});
    }, []);

    const recurrentTotal = recurring.reduce((s, r) => s + r.average_amount, 0);

    return (
        <div>
            <h1 className="text-2xl font-bold">Spending Distribution</h1>
            <p className="text-slate-500 text-sm">Analyze your outflows and recurrence patterns</p>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <MetricCard
                    label="TOTAL OUTFLOW"
                    value={mxn(summary?.total_expense ?? 0)}
                    hint="MXN"
                    hintColor="text-slate-500"
                />
                <MetricCard
                    label="TOP CATEGORY"
                    value={summary?.top_category ?? "-"}
                    hint="Mayor gasto"
                    hintColor="text-slate-500"
                />
                <MetricCard
                    label="RECURRENT BILLS"
                    value={mxn(recurrentTotal)}
                    hint={`${recurring.length} detectados`}
                />
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-6">
                <section className="card md:col-span-2">
                    <h2 className="font-semibold mb-4">Where your money went</h2>
                    <DistributionChart data={summary?.by_category ?? []} />
                </section>
                <section className="card">
                    <div className="flex items-center gap-2 font-semibold">
                        <Sparkles size={18} className="text-brand" /> Smart Findings
                    </div>
                    <ul className="mt-3 space-y-3 text-sm">
                        {recurring.slice(0, 3).map((r) => (
                            <li key={r.label} className="rounded-lg bg-slate-50 p-3">
                                <div className="font-medium uppercase text-xs text-brand">
                                    Suscripcion detectada
                                </div>
                                Pago {r.frequency} de {mxn(r.average_amount)} en{" "}
                                <span className="capitalize">{r.label}</span>.
                            </li>
                        ))}
                        {recurring.length === 0 && (
                            <li className="text-slate-500">
                                Aun no detectamos gastos recurrentes.
                            </li>
                        )}
                    </ul>
                </section>
            </div>

            <section className="card mt-6">
                <h2 className="font-semibold mb-4">Recurring Expenses</h2>
                <table className="w-full text-sm">
                    <thead className="text-left text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="pb-2">Merchant</th>
                            <th className="pb-2">Frequency</th>
                            <th className="pb-2 text-right">Avg. Amount</th>
                            <th className="pb-2 text-right">Occurrences</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recurring.map((r) => (
                            <tr key={r.label} className="border-t border-slate-100">
                                <td className="py-2 capitalize">{r.label}</td>
                                <td className="py-2 capitalize text-slate-500">{r.frequency}</td>
                                <td className="py-2 text-right">{mxn(r.average_amount)}</td>
                                <td className="py-2 text-right">{r.occurrences}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
