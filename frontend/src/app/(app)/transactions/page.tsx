"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api, Transaction } from "@/lib/api";
import { mxn } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function TransactionsPage() {
    const [items, setItems] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        try {
            const res = await api.transactions(query);
            setItems(res.items);
            setTotal(res.total);
        } catch {
            setItems([]);
        }
    }, [search]);

    useEffect(() => {
        const id = setTimeout(load, 250);
        return () => clearTimeout(id);
    }, [load]);

    return (
        <div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-title-md font-semibold text-ink">
                        Gestion de Transacciones
                    </h1>
                    <p className="text-body-sm text-pewter">
                        Analiza tus ingresos y gastos por categoria y comercio.
                    </p>
                </div>
                <a
                    href={`${API_URL}/api/transactions/export.csv`}
                    className="rounded-control bg-ember px-4 py-2 text-body-sm font-semibold text-ink"
                >
                    Exportar CSV
                </a>
            </div>

            <div className="card mt-6">
                <div className="mb-4 flex items-center gap-2 rounded-control border border-mist px-3 py-2">
                    <Search size={16} className="text-steel" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar comercio (ej. OXXO, Uber)..."
                        className="flex-1 bg-transparent text-body-sm text-ink outline-none placeholder:text-steel"
                    />
                </div>

                <table className="w-full text-body-sm">
                    <thead className="text-left text-label text-pewter">
                        <tr>
                            <th className="pb-2 font-medium">Fecha</th>
                            <th className="pb-2 font-medium">Concepto</th>
                            <th className="pb-2 font-medium">Estado</th>
                            <th className="pb-2 text-right font-medium">Monto (MXN)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((t) => (
                            <tr key={t.id} className="border-t border-mist">
                                <td className="py-2 text-pewter">{t.date}</td>
                                <td className="py-2 text-ink">{t.description}</td>
                                <td className="py-2">
                                    <span
                                        className={`rounded-tag px-2 py-0.5 text-label ${
                                            t.status === "completed"
                                                ? "bg-fog text-positive"
                                                : "bg-fog text-pewter"
                                        }`}
                                    >
                                        {t.status === "completed" ? "Completado" : "Pendiente"}
                                    </span>
                                </td>
                                <td className="tabular py-2 text-right text-ink">
                                    {t.type === "expense" ? "-" : "+"}
                                    {mxn(t.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {items.length === 0 && (
                    <p className="mt-4 text-body-sm text-pewter">No hay transacciones.</p>
                )}
                <p className="mt-4 text-label text-pewter">
                    Mostrando {items.length} de {total}
                </p>
            </div>
        </div>
    );
}
