"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api, mxn, Transaction } from "@/lib/api";

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
                    <h1 className="text-2xl font-bold">Gestion de Transacciones</h1>
                    <p className="text-slate-500 text-sm">
                        Analiza tus ingresos y gastos por categoria y comercio.
                    </p>
                </div>
                <a
                    href={`${API_URL}/api/transactions/export.csv`}
                    className="rounded-lg bg-brand px-4 py-2 text-sm text-white"
                >
                    Exportar CSV
                </a>
            </div>

            <div className="card mt-6">
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 mb-4">
                    <Search size={16} className="text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar comercio (ej. OXXO, Uber)..."
                        className="flex-1 outline-none text-sm"
                    />
                </div>

                <table className="w-full text-sm">
                    <thead className="text-left text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="pb-2">Fecha</th>
                            <th className="pb-2">Concepto</th>
                            <th className="pb-2">Estado</th>
                            <th className="pb-2 text-right">Monto (MXN)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((t) => (
                            <tr key={t.id} className="border-t border-slate-100">
                                <td className="py-2 text-slate-500">{t.date}</td>
                                <td className="py-2">{t.description}</td>
                                <td className="py-2">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs ${
                                            t.status === "completed"
                                                ? "bg-emerald-50 text-emerald-600"
                                                : "bg-slate-100 text-slate-500"
                                        }`}
                                    >
                                        {t.status === "completed" ? "Completado" : "Pendiente"}
                                    </span>
                                </td>
                                <td className="py-2 text-right">
                                    {t.type === "expense" ? "-" : "+"}
                                    {mxn(t.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {items.length === 0 && (
                    <p className="text-sm text-slate-500 mt-4">No hay transacciones.</p>
                )}
                <p className="text-xs text-slate-400 mt-4">Mostrando {items.length} de {total}</p>
            </div>
        </div>
    );
}
