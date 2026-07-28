"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api, RecurringItem, SpendingSummary } from "@/lib/api";
import { mxn } from "@/lib/format";
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
            <h1 className="text-title-md font-semibold text-ink">Spending Distribution</h1>
            <p className="text-body-sm text-pewter">
                Analyze your outflows and recurrence patterns
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <MetricCard
                    label="TOTAL OUTFLOW"
                    value={mxn(summary?.total_expense ?? 0)}
                    hint="MXN"
                    hintColor="text-pewter"
                />
                <MetricCard
                    label="TOP CATEGORY"
                    value={summary?.top_category ?? "-"}
                    hint="Mayor gasto"
                    hintColor="text-pewter"
                />
                <MetricCard
                    label="RECURRENT BILLS"
                    value={mxn(recurrentTotal)}
                    hint={`${recurring.length} detectados`}
                />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
                <section className="card md:col-span-2">
                    <h2 className="mb-4 text-title-sm font-semibold text-ink">
                        Where your money went
                    </h2>
                    <DistributionChart data={summary?.by_category ?? []} />
                </section>
                <section className="card">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                        <Sparkles size={18} className="text-ember" /> Smart Findings
                    </div>
                    <ul className="mt-3 space-y-3 text-body-sm">
                        {recurring.slice(0, 3).map((r) => (
                            <li key={r.label} className="rounded-control bg-fog p-3 text-graphite">
                                <div className="text-label font-semibold uppercase text-pewter">
                                    Suscripcion detectada
                                </div>
                                Pago {r.frequency} de {mxn(r.average_amount)} en{" "}
                                <span className="capitalize">{r.label}</span>.
                            </li>
                        ))}
                        {recurring.length === 0 && (
                            <li className="text-pewter">Aun no detectamos gastos recurrentes.</li>
                        )}
                    </ul>
                </section>
            </div>

            <section className="card mt-6">
                <h2 className="mb-4 text-title-sm font-semibold text-ink">Recurring Expenses</h2>
                <table className="w-full text-body-sm">
                    <thead className="text-left text-label text-pewter">
                        <tr>
                            <th className="pb-2 font-medium">Merchant</th>
                            <th className="pb-2 font-medium">Frequency</th>
                            <th className="pb-2 text-right font-medium">Avg. Amount</th>
                            <th className="pb-2 text-right font-medium">Occurrences</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recurring.map((r) => (
                            <tr key={r.label} className="border-t border-mist">
                                <td className="py-2 capitalize text-ink">{r.label}</td>
                                <td className="py-2 capitalize text-pewter">{r.frequency}</td>
                                <td className="tabular py-2 text-right text-ink">
                                    {mxn(r.average_amount)}
                                </td>
                                <td className="tabular py-2 text-right text-ink">
                                    {r.occurrences}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
