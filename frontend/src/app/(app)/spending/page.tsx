"use client";

import { useEffect, useState } from "react";
import { Repeat, Sparkles } from "lucide-react";
import { api, RecurringItem, SpendingSummary } from "@/lib/api";
import { mxn } from "@/lib/format";
import { DistributionChart } from "@/components/charts/DistributionChart";
import {
    Card,
    EmptyState,
    PageHeader,
    StatTile,
    Table,
    Tag,
    type Column,
} from "@/components/ui";

const COLUMNS: Column<RecurringItem>[] = [
    { key: "label", header: "Comercio", cell: (r) => <span className="capitalize">{r.label}</span> },
    {
        key: "frequency",
        header: "Frecuencia",
        cell: (r) => <span className="capitalize text-pewter">{r.frequency}</span>,
    },
    { key: "avg", header: "Monto promedio", numeric: true, cell: (r) => mxn(r.average_amount) },
    { key: "count", header: "Ocurrencias", numeric: true, cell: (r) => r.occurrences },
];

export default function SpendingPage() {
    const [summary, setSummary] = useState<SpendingSummary | null>(null);
    const [recurring, setRecurring] = useState<RecurringItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.allSettled([
            api.summary().then(setSummary),
            api.recurring().then((r) => setRecurring(r.items)),
        ]).finally(() => setLoading(false));
    }, []);

    const recurrentTotal = recurring.reduce((s, r) => s + r.average_amount, 0);

    return (
        <div>
            <PageHeader
                title="Distribucion de Gastos"
                subtitle="Analiza tus salidas y patrones de recurrencia."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatTile
                    label="Salida total"
                    value={summary ? mxn(summary.total_expense) : undefined}
                    delta="MXN"
                    loading={loading}
                />
                <StatTile
                    label="Categoria principal"
                    value={summary?.top_category ?? undefined}
                    delta="Mayor gasto"
                    loading={loading}
                />
                <StatTile
                    label="Gastos recurrentes"
                    value={recurring.length ? mxn(recurrentTotal) : undefined}
                    delta={`${recurring.length} detectados`}
                    loading={loading}
                    aside={<Tag tone="estimate">Est.</Tag>}
                />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
                <Card title="A donde se fue tu dinero" className="md:col-span-2">
                    <DistributionChart data={summary?.by_category ?? []} />
                </Card>
                <Card>
                    <div className="flex items-center gap-2 font-semibold text-ink">
                        <Sparkles size={18} className="text-ember" /> Hallazgos
                    </div>
                    <ul className="mt-3 space-y-3 text-body-sm">
                        {recurring.slice(0, 3).map((r) => (
                            <li key={r.label} className="rounded-control bg-fog p-3 text-graphite">
                                <div className="mb-1">
                                    <Tag tone="estimate">Suscripcion detectada</Tag>
                                </div>
                                Pago {r.frequency} de {mxn(r.average_amount)} en{" "}
                                <span className="capitalize">{r.label}</span>.
                            </li>
                        ))}
                        {!loading && recurring.length === 0 && (
                            <li className="text-pewter">Aun no detectamos gastos recurrentes.</li>
                        )}
                    </ul>
                </Card>
            </div>

            <Card title="Gastos recurrentes" className="mt-6">
                <Table
                    caption="Gastos recurrentes detectados"
                    columns={COLUMNS}
                    rows={recurring}
                    rowKey={(r) => r.label}
                    loading={loading}
                    empty={
                        <EmptyState
                            icon={<Repeat size={18} />}
                            title="Sin gastos recurrentes"
                            description="Necesitamos al menos dos meses de movimientos para detectar suscripciones."
                        />
                    }
                />
            </Card>
        </div>
    );
}
