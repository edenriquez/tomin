"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Sparkles } from "lucide-react";
import { api, SpendingSummary, Transaction } from "@/lib/api";
import { mxn } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { DistributionChart } from "@/components/charts/DistributionChart";
import { UploadButton } from "@/components/UploadButton";
import {
    Card,
    EmptyState,
    PageHeader,
    StatTile,
    Table,
    type Column,
} from "@/components/ui";

const COLUMNS: Column<Transaction>[] = [
    { key: "concept", header: "Concepto", cell: (t) => t.description },
    { key: "date", header: "Fecha", cell: (t) => <span className="text-pewter">{t.date}</span> },
    {
        key: "amount",
        header: "Monto",
        numeric: true,
        cell: (t) => (
            <span className={t.type === "income" ? "text-positive" : "text-ink"}>
                {t.type === "expense" ? "-" : "+"}
                {mxn(t.amount)}
            </span>
        ),
    },
];

export default function InicioPage() {
    const profile = useProfile();
    const [summary, setSummary] = useState<SpendingSummary | null>(null);
    const [txs, setTxs] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, t] = await Promise.all([api.summary(), api.transactions("?limit=6")]);
            setSummary(s);
            setTxs(t.items);
            setError(null);
        } catch (e) {
            setSummary(null);
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Undefined rather than 0 when there is no summary: a zero is a claim
    // about someone's finances, and "the backend is down" isn't one.
    const balance = summary ? summary.total_income - summary.total_expense : undefined;

    return (
        // F4: command center replaces this page. Everything below is the old
        // dashboard, moved and translated so the route works in the meantime.
        <div className="space-y-12">
            <div className="space-y-4">
                <PageHeader
                    title="Inicio"
                    subtitle={`Hola, ${profile.name}. Este es tu resumen financiero.`}
                />

                {error && (
                    <p className="rounded-control border-l-2 border-ember bg-fog p-3 text-body-sm text-graphite">
                        No se pudo cargar la informacion ({error}). Revisa que el backend este
                        corriendo en el puerto 8000.
                    </p>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatTile
                    label="Balance total"
                    value={balance !== undefined ? mxn(balance) : undefined}
                    delta="Ingresos menos gastos"
                    loading={loading}
                />
                <StatTile
                    label="Gastos del mes"
                    value={summary ? mxn(summary.total_expense) : undefined}
                    delta={summary?.top_category ? `Top: ${summary.top_category}` : undefined}
                    loading={loading}
                />
                <StatTile
                    label="Ingresos"
                    value={summary ? mxn(summary.total_income) : undefined}
                    delta="Total registrado"
                    loading={loading}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="min-w-0 space-y-6 md:col-span-2">
                    <Card title="Distribucion de gastos">
                        <DistributionChart data={summary?.by_category ?? []} />
                    </Card>

                    <Card title="Movimientos recientes">
                        <Table
                            caption="Movimientos recientes"
                            columns={COLUMNS}
                            rows={txs}
                            rowKey={(t) => t.id}
                            loading={loading}
                            skeletonRows={4}
                            empty={
                                <EmptyState
                                    icon={<Inbox size={18} />}
                                    title="Aun no hay movimientos"
                                    description="Sube un estado de cuenta para ver tus movimientos."
                                />
                            }
                        />
                    </Card>
                </div>

                <div className="min-w-0 space-y-6">
                    <Card className="border-l-2 border-l-ember">
                        <div className="flex items-center gap-2 font-semibold text-ink">
                            <Sparkles size={18} className="text-ember" /> Tomin AI
                        </div>
                        <p className="mt-3 text-body-sm text-graphite">
                            {summary?.top_category
                                ? `Tu categoria con mayor gasto es ${summary.top_category}. Considera fijar un limite mensual.`
                                : "Sube tu primer estado de cuenta para recibir insights personalizados."}
                        </p>
                    </Card>

                    <Card>
                        <h3 className="mb-3 text-label font-semibold text-pewter">
                            Acciones rapidas
                        </h3>
                        <UploadButton onDone={load} />
                    </Card>
                </div>
            </div>
        </div>
    );
}
