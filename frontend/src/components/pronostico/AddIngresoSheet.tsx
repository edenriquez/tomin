"use client";

import { useEffect, useMemo, useState } from "react";
import type { Transaction } from "@/lib/api";
import { cn } from "@/lib/cn";
import { mxn, mxn2 } from "@/lib/format";
import { clusterIncome, type IncomeCluster, type IncomeKind } from "@/lib/ingresos";
import { restMonthlyFromTransactions } from "@/lib/fijos";
import { dayLabel } from "@/lib/format";
import { parsePeriodKey } from "@/lib/metrics";
import { Button, SearchInput, Sheet } from "@/components/ui";

/**
 * Pick a deposit. We group by who sent it — two VECH rails are one series —
 * and you name it nómina or extra. That is the whole action.
 */
export function AddIngresoSheet({
    open,
    onClose,
    ledger,
    labeledKeys,
    onLabel,
}: {
    open: boolean;
    onClose: () => void;
    ledger: Transaction[];
    labeledKeys: Set<string>;
    onLabel: (key: string, kind: IncomeKind) => void;
}) {
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<IncomeCluster | null>(null);

    useEffect(() => {
        if (!open) {
            setQuery("");
            setPicked(null);
        }
    }, [open]);

    const clusters = useMemo(() => clusterIncome(ledger), [ledger]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const pool = clusters.filter((c) => !labeledKeys.has(c.key));
        if (!q) return pool;
        return pool.filter(
            (c) =>
                c.label.toLowerCase().includes(q) ||
                c.txs.some(
                    (t) =>
                        t.description.toLowerCase().includes(q) ||
                        (t.raw_description ?? "").toLowerCase().includes(q)
                )
        );
    }, [clusters, query, labeledKeys]);

    const preview = picked ? restMonthlyFromTransactions(picked.txs) : null;

    function confirm(kind: IncomeKind) {
        if (!picked) return;
        onLabel(picked.key, kind);
        onClose();
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Etiquetar un ingreso"
            description="Elige quién te deposita. Nómina entra cargo a cargo si tiene ritmo; extra, el mes típico. Lo que no etiquetes no cuenta."
            footer={
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => confirm("extra")} disabled={!picked}>
                        Extra
                    </Button>
                    <Button onClick={() => confirm("nomina")} disabled={!picked}>
                        Nómina
                    </Button>
                </div>
            }
        >
            <SearchInput
                onSearch={setQuery}
                placeholder="Buscar un depósito"
                aria-label="Buscar un depósito"
            />

            {picked && preview && (
                <div className="mt-4 rounded-card border border-mist bg-fog/60 p-3">
                    <p className="text-body text-ink">{picked.label}</p>
                    <p className="mt-0.5 text-body-sm text-graphite">
                        {picked.txs.length} depósito{picked.txs.length === 1 ? "" : "s"} · ~
                        {mxn(preview.monthly)}/mes
                    </p>
                    <p className="mt-1 text-label text-ash">
                        Último: {isoToLabel(picked.txs[0]?.date ?? "")} ·{" "}
                        {mxn2(Math.abs(picked.txs[0]?.amount ?? 0))}
                    </p>
                </div>
            )}

            <ul className="mt-4 space-y-0.5">
                {filtered.length === 0 ? (
                    <li className="py-4 text-body-sm text-graphite">
                        {clusters.length === 0
                            ? "No hay depósitos en el ledger."
                            : "Nada coincide, o ya está etiquetado."}
                    </li>
                ) : (
                    filtered.map((c) => {
                        const on = picked?.key === c.key;
                        const last = c.txs[0];
                        return (
                            <li key={c.key}>
                                <button
                                    type="button"
                                    onClick={() => setPicked(c)}
                                    className={cn(
                                        "flex w-full items-baseline justify-between gap-3 rounded-control px-2 py-2 text-left",
                                        "transition-colors duration-100",
                                        on ? "bg-fog" : "hover:bg-fog/60"
                                    )}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-body text-ink">
                                            {c.label}
                                        </span>
                                        <span className="text-body-sm text-graphite">
                                            {c.txs.length} depósito{c.txs.length === 1 ? "" : "s"}
                                            {last ? ` · ${isoToLabel(last.date)}` : ""}
                                        </span>
                                    </span>
                                    <span className="shrink-0 tabular text-body-sm text-ink">
                                        {mxn2(Math.abs(last?.amount ?? 0))}
                                    </span>
                                </button>
                            </li>
                        );
                    })
                )}
            </ul>
        </Sheet>
    );
}

function isoToLabel(iso: string): string {
    const d = parsePeriodKey(iso);
    return d ? dayLabel(d) : iso;
}
