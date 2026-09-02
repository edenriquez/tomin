"use client";

import { useCallback, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { dayLabel, mxn2 } from "@/lib/format";
import { ChartCard } from "@/components/ChartCard";
import { Button, Switch } from "@/components/ui";
import { TransactionsChart, dateToMs, type ChartRange } from "@/components/charts/TransactionsChart";
import {
    ChartLens,
    LensChips,
    LENS_KIND_LABELS,
    type Lectura,
    type LensFocus,
    type LensGroup,
} from "@/components/charts/lens";
import { CATEGORIES, makeTransactions } from "./lecturasFixtures";

/**
 * The emphasis layer on the real Movimientos chart with planted data: the
 * three attention signals the backend computes (see
 * `domain/services/attention.py`), each as a chip, a ring and a sentence.
 * Kept as a dev fixture so the interaction can be judged without a ledger
 * that happens to contain an odd charge.
 */
export function LecturasPreview() {
    const [reduced, setReduced] = useState(false);
    const { transactions, attention } = useMemo(makeTransactions, []);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [focus, setFocus] = useState<LensFocus>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom] = useState<ChartRange | null>(null);

    const groups: LensGroup[] = useMemo(() => {
        const byKind = new Map<string, Lectura[]>();
        for (const a of attention) {
            if (dismissed.has(a.tx_id)) continue;
            const t = transactions.find((x) => x.id === a.tx_id);
            if (!t) continue;
            const l: Lectura = {
                id: a.tx_id,
                kind: a.kind,
                anchor: { x: dateToMs(t.date), y: t.amount },
                title: `${t.description} · ${mxn2(t.amount)} · ${dayLabel(new Date(dateToMs(t.date)))}`,
                detail: a.reason,
                severity: a.kind === "new_merchant" ? "info" : "warn",
                ref: t.id,
            };
            byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), l]);
        }
        return Array.from(byKind.entries()).map(([kind, lecturas]) => ({
            id: kind,
            label: LENS_KIND_LABELS[lecturas[0]!.kind],
            lecturas,
        }));
    }, [attention, transactions, dismissed]);

    const dismiss = useCallback((id: string) => {
        setDismissed((s) => new Set(s).add(id));
        setFocus(null);
    }, []);

    // A dragged range narrows the data the way the app narrows the time
    // window; deferred like the real fetch so Apex's selection timer never
    // finds the series replaced under it.
    const shown = useMemo(
        () =>
            zoom
                ? transactions.filter((t) => {
                      const ms = dateToMs(t.date);
                      return ms >= zoom.start && ms <= zoom.end;
                  })
                : transactions,
        [transactions, zoom]
    );
    const selected = transactions.find((t) => t.id === selectedId) ?? null;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-display text-title-lg font-normal text-ink">Lecturas</h1>
                    <p className="mt-1 max-w-prose text-body-sm text-graphite">
                        La gráfica señala una cosa a la vez: un anillo que pulsa tres veces y se
                        queda, el resto se atenúa, y una frase dice por qué. Datos ficticios; la
                        gráfica es la real.
                    </p>
                </div>
                <label className="flex items-center gap-2 text-body-sm text-graphite">
                    <Switch checked={reduced} onChange={setReduced} aria-label="Simular reduced-motion" />
                    Simular <code className="text-label">prefers-reduced-motion</code>
                </label>
            </div>

            <ChartCard
                title="Movimientos"
                badge="Señal del backend"
                action={
                    zoom && (
                        <Button variant="ghost" size="sm" onClick={() => setZoom(null)}>
                            Quitar rango
                        </Button>
                    )
                }
            >
                <LensChips groups={groups} focus={focus} onFocus={setFocus} className="mb-3" />
                <ChartLens
                    groups={groups}
                    focus={focus}
                    onFocus={setFocus}
                    reducedMotion={reduced}
                    actions={(l) => (
                        <>
                            <Button size="sm" variant="secondary" onClick={() => l.ref && setSelectedId(l.ref)}>
                                Ver
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => l.ref && dismiss(l.ref)}>
                                Es mío
                            </Button>
                        </>
                    )}
                >
                    <TransactionsChart
                        transactions={shown}
                        mode="scatter"
                        colorMode="categoria"
                        categories={CATEGORIES}
                        showIncome={false}
                        grain="day"
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onRangeSelect={(r) => r && setTimeout(() => setZoom(r), 300)}
                    />
                </ChartLens>
                <p className="mt-3 flex items-start gap-1.5 text-body-sm text-graphite">
                    <Eye size={14} className="mt-0.5 shrink-0 text-ash" aria-hidden />
                    <span>
                        Arrastra un rango: el filtro sigue funcionando con la lectura activa. «Ver»
                        selecciona la fila; «Es mío» descarta la lectura.
                        {selected && (
                            <span className="ml-2 text-ink">
                                Seleccionado: {selected.description} {mxn2(selected.amount)}
                            </span>
                        )}
                    </span>
                </p>
            </ChartCard>
        </div>
    );
}
