"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Inbox } from "lucide-react";
import { api, Transaction } from "@/lib/api";
import { mxn } from "@/lib/format";
import {
    Button,
    Card,
    EmptyState,
    PageHeader,
    SearchInput,
    Table,
    Tag,
    type Column,
} from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const COLUMNS: Column<Transaction>[] = [
    { key: "date", header: "Fecha", cell: (t) => <span className="text-pewter">{t.date}</span> },
    { key: "concept", header: "Concepto", cell: (t) => t.description },
    {
        key: "status",
        header: "Estado",
        cell: (t) => (
            <Tag tone={t.status === "completed" ? "positive" : "neutral"}>
                {t.status === "completed" ? "Completado" : "Pendiente"}
            </Tag>
        ),
    },
    {
        key: "amount",
        header: "Monto (MXN)",
        numeric: true,
        cell: (t) => `${t.type === "expense" ? "-" : "+"}${mxn(t.amount)}`,
    },
];

export default function MovimientosPage() {
    const [items, setItems] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        try {
            const res = await api.transactions(query);
            setItems(res.items);
            setTotal(res.total);
        } catch {
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="space-y-12">
            <PageHeader
                title="Movimientos"
                subtitle="Analiza tus ingresos y gastos por categoria y comercio."
                actions={
                    <Button
                        variant="secondary"
                        icon={<Download size={16} />}
                        onClick={() => {
                            window.location.href = `${API_URL}/api/transactions/export.csv`;
                        }}
                    >
                        Exportar CSV
                    </Button>
                }
            />

            <Card>
                <SearchInput
                    className="mb-4"
                    onSearch={setSearch}
                    placeholder="Buscar comercio (ej. OXXO, Uber)..."
                    aria-label="Buscar movimientos"
                />

                <Table
                    caption="Movimientos"
                    columns={COLUMNS}
                    rows={items}
                    rowKey={(t) => t.id}
                    loading={loading}
                    empty={
                        <EmptyState
                            icon={<Inbox size={18} />}
                            title={search ? "Sin resultados" : "Aun no hay movimientos"}
                            description={
                                search
                                    ? `Ningun movimiento coincide con "${search}".`
                                    : "Sube un estado de cuenta para ver tus movimientos."
                            }
                        />
                    }
                />

                {!loading && items.length > 0 && (
                    <p className="tabular mt-4 text-label text-pewter">
                        Mostrando {items.length} de {total}
                    </p>
                )}
            </Card>
        </div>
    );
}
