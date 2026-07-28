"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { api, Statement } from "@/lib/api";
import { UploadButton } from "@/components/UploadButton";
import {
    Button,
    Card,
    ConfirmModal,
    EmptyState,
    PageHeader,
    Table,
    Tag,
    useToast,
    type Column,
    type TagTone,
} from "@/components/ui";

const SOURCE_LABELS: Record<string, string> = {
    bank_pdf: "Estado de cuenta (PDF)",
    sat_xml: "Factura SAT (XML)",
};

const STATUS_TONES: Record<string, TagTone> = {
    processed: "positive",
    processing: "neutral",
    failed: "negative",
    pending: "neutral",
};

const STATUS_LABELS: Record<string, string> = {
    processed: "Procesado",
    processing: "Procesando",
    failed: "Fallido",
    pending: "Pendiente",
};

function period(s: Statement): string {
    if (!s.period_start && !s.period_end) return "--";
    if (s.period_start === s.period_end) return s.period_start ?? "--";
    return `${s.period_start ?? "?"} - ${s.period_end ?? "?"}`;
}

export default function DocumentosPage() {
    const [items, setItems] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<Statement | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { toast } = useToast();

    const load = useCallback(async () => {
        try {
            const res = await api.statements();
            setItems(res.items);
            setError(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function confirmDelete() {
        if (!pending) return;
        setDeleting(true);
        try {
            const res = await api.deleteStatement(pending.id);
            toast(`Se eliminaron ${res.transactions_deleted} movimiento(s).`, "positive");
            setPending(null);
            await load();
        } catch (e) {
            toast(`No se pudo eliminar: ${(e as Error).message}`, "negative");
        } finally {
            setDeleting(false);
        }
    }

    const columns: Column<Statement>[] = [
        {
            key: "bank",
            header: "Banco / Origen",
            cell: (s) => <span className="font-medium">{s.bank ?? "Desconocido"}</span>,
        },
        {
            key: "type",
            header: "Tipo",
            cell: (s) => (
                <span className="text-pewter">
                    {SOURCE_LABELS[s.source_type] ?? s.source_type}
                </span>
            ),
        },
        {
            key: "period",
            header: "Periodo",
            cell: (s) => <span className="text-pewter">{period(s)}</span>,
        },
        {
            key: "status",
            header: "Estado",
            cell: (s) => (
                <Tag tone={STATUS_TONES[s.status] ?? "neutral"}>
                    {STATUS_LABELS[s.status] ?? s.status}
                </Tag>
            ),
        },
        {
            key: "uploaded",
            header: "Cargado",
            cell: (s) => (
                <span className="text-pewter">
                    {s.uploaded_at ? new Date(s.uploaded_at).toLocaleDateString("es-MX") : "--"}
                </span>
            ),
        },
        {
            key: "actions",
            header: "",
            numeric: true,
            cell: (s) => (
                <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={14} />}
                    aria-label={`Eliminar ${s.bank ?? "estado de cuenta"}`}
                    onClick={() => setPending(s)}
                >
                    Eliminar
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-12">
            <div className="space-y-4">
                <PageHeader
                    title="Documentos"
                    subtitle="Estados de cuenta y facturas procesados. Al eliminar uno se borran tambien los movimientos que se extrajeron de el."
                    actions={
                        <div className="w-64">
                            <UploadButton onDone={load} />
                        </div>
                    }
                />

                {error && (
                    <p className="rounded-control border-l-2 border-ember bg-fog p-3 text-body-sm text-graphite">
                        No se pudo cargar la informacion ({error}). Revisa que el backend este
                        corriendo en el puerto 8000.
                    </p>
                )}
            </div>

            <Card flush>
                <div className="px-6 py-2">
                    <Table
                        caption="Documentos procesados"
                        columns={columns}
                        rows={items}
                        rowKey={(s) => s.id}
                        loading={loading}
                        empty={
                            <EmptyState
                                icon={<FileText size={18} />}
                                title="Aun no hay documentos procesados"
                                description="Sube tu primer estado de cuenta y Tomin extrae los movimientos."
                            />
                        }
                    />
                </div>
            </Card>

            <ConfirmModal
                open={pending !== null}
                onClose={() => setPending(null)}
                onConfirm={confirmDelete}
                loading={deleting}
                title="¿Eliminar este archivo?"
                description={`Se eliminaran los movimientos extraidos de ${
                    pending?.bank ?? SOURCE_LABELS[pending?.source_type ?? ""] ?? "este archivo"
                }. Esta accion no se puede deshacer.`}
                confirmLabel="Eliminar"
            />
        </div>
    );
}
