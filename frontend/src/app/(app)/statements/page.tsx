"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, Statement } from "@/lib/api";
import { UploadButton } from "@/components/UploadButton";

const SOURCE_LABELS: Record<string, string> = {
    bank_pdf: "Estado de cuenta (PDF)",
    sat_xml: "Factura SAT (XML)",
};

const STATUS_STYLES: Record<string, string> = {
    processed: "bg-fog text-positive",
    processing: "bg-fog text-graphite",
    failed: "bg-fog text-negative",
    pending: "bg-fog text-pewter",
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

export default function StatementsPage() {
    const [items, setItems] = useState<Statement[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.statements();
            setItems(res.items);
            setError(null);
        } catch (e) {
            setError((e as Error).message);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function remove(s: Statement) {
        const label = s.bank ?? SOURCE_LABELS[s.source_type] ?? "este archivo";
        const ok = window.confirm(
            `Se eliminaran los movimientos extraidos de ${label}. Esta accion no se puede deshacer.`
        );
        if (!ok) return;

        setDeletingId(s.id);
        setStatus(null);
        try {
            const res = await api.deleteStatement(s.id);
            setStatus(`Se eliminaron ${res.transactions_deleted} movimiento(s).`);
            await load();
        } catch (e) {
            setStatus(`No se pudo eliminar: ${(e as Error).message}`);
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-title-md font-semibold text-ink">Estados de Cuenta</h1>
                    <p className="text-body-sm text-pewter">
                        Archivos procesados. Al eliminar uno se borran tambien los movimientos que
                        se extrajeron de el.
                    </p>
                </div>
                <div className="w-64 shrink-0">
                    <UploadButton onDone={load} />
                </div>
            </div>

            {error && (
                <p className="mt-4 rounded-control border-l-2 border-ember bg-fog p-3 text-body-sm text-graphite">
                    No se pudo cargar la informacion ({error}). Verifica que el backend este
                    corriendo en el puerto 8000.
                </p>
            )}
            {status && <p className="mt-4 text-body-sm text-graphite">{status}</p>}

            <div className="card mt-6">
                <table className="w-full text-body-sm">
                    <thead className="text-left text-label text-pewter">
                        <tr>
                            <th className="pb-2 font-medium">Banco / Origen</th>
                            <th className="pb-2 font-medium">Tipo</th>
                            <th className="pb-2 font-medium">Periodo</th>
                            <th className="pb-2 font-medium">Estado</th>
                            <th className="pb-2 font-medium">Cargado</th>
                            <th className="pb-2 text-right font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((s) => (
                            <tr key={s.id} className="border-t border-mist">
                                <td className="py-2 font-medium text-ink">
                                    {s.bank ?? "Desconocido"}
                                </td>
                                <td className="py-2 text-pewter">
                                    {SOURCE_LABELS[s.source_type] ?? s.source_type}
                                </td>
                                <td className="py-2 text-pewter">{period(s)}</td>
                                <td className="py-2">
                                    <span
                                        className={`rounded-tag px-2 py-0.5 text-label ${
                                            STATUS_STYLES[s.status] ?? STATUS_STYLES.pending
                                        }`}
                                    >
                                        {STATUS_LABELS[s.status] ?? s.status}
                                    </span>
                                </td>
                                <td className="py-2 text-pewter">
                                    {s.uploaded_at
                                        ? new Date(s.uploaded_at).toLocaleDateString("es-MX")
                                        : "--"}
                                </td>
                                <td className="py-2 text-right">
                                    <button
                                        onClick={() => remove(s)}
                                        disabled={deletingId === s.id}
                                        aria-label={`Eliminar ${s.bank ?? "estado de cuenta"}`}
                                        className="inline-flex items-center gap-1.5 rounded-control border border-negative px-2.5 py-1 text-label font-medium text-negative hover:bg-fog disabled:opacity-50"
                                    >
                                        <Trash2 size={14} />
                                        {deletingId === s.id ? "Eliminando..." : "Eliminar"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {items.length === 0 && !error && (
                    <p className="mt-4 text-body-sm text-pewter">
                        Aun no hay archivos procesados. Sube tu primer estado de cuenta.
                    </p>
                )}
            </div>
        </div>
    );
}
