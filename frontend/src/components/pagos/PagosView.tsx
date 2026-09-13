"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BellOff } from "lucide-react";
import { mxn } from "@/lib/format";
import { track } from "@/lib/telemetry";
import { useAppData } from "@/components/AppChrome";
import { BackendNotice, EmptyState, Skeleton } from "@/components/ui";
import { DueMonthCalendar } from "./DueMonthCalendar";
import { buildDuePair } from "./dueMonth";
import { useRecurringSeries } from "@/components/recurrentes/useRecurringSeries";

/**
 * Pagos: the payments that are about to land, as a calendar. It reads the
 * recurring series the way a notification centre reads events — what is due,
 * how soon, how much — and leaves confirming or editing the series to
 * Recurrentes and Plan.
 */
export function PagosView() {
    const { dataVersion } = useAppData();
    const { dated: items, banks, loading, error } = useRecurringSeries(dataVersion);

    const soon = useMemo(() => {
        const pair = buildDuePair(items);
        const lines = [...pair.thisMonth, ...pair.upcoming].filter(
            (l) => l.status === "due" && (l.urgency === "urgent" || l.urgency === "soon")
        );
        return { count: lines.length, total: lines.reduce((s, l) => s + l.amount, 0) };
    }, [items]);

    const bankBit = banks.length > 0 ? ` · ${banks.join(", ")}` : "";
    const empty = !loading && !error && items.length === 0;

    return (
        <div className="space-y-5">
            <section className="card space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-mist pb-4">
                    <p className="eyebrow">Pagos{bankBit}</p>
                    <Link
                        href="/?cara=recurrentes"
                        onClick={() => track("nav.view", { to: "/?cara=recurrentes", source: "pagos" })}
                        className="text-body-sm text-graphite underline decoration-mist underline-offset-4 hover:text-ink"
                    >
                        Editar series en Cargos recurrentes →
                    </Link>
                </div>

                {loading ? (
                    <Skeleton className="h-8 w-96" />
                ) : (
                    <p className="flex flex-wrap items-baseline gap-x-2.5 text-title-sm text-ink">
                        {soon.count === 0 ? (
                            <span>Nada por pagar en los próximos 7 días</span>
                        ) : (
                            <>
                                <span className="tabular">
                                    {soon.count} cargo{soon.count === 1 ? "" : "s"} en los
                                    próximos 7 días
                                </span>
                                <span aria-hidden className="text-mist">
                                    ·
                                </span>
                                <span className="tabular text-graphite">{mxn(soon.total)}</span>
                            </>
                        )}
                    </p>
                )}

                <p className="text-label text-graphite">
                    Fechas proyectadas a partir del ritmo de cada cobro recurrente, fijo o
                    pendiente de confirmar. Un día registrado ya se cobró; uno programado
                    todavía no.
                </p>
            </section>

            {error && <BackendNotice what="tus pagos" detail={error} />}

            {loading ? (
                <section className="card space-y-5">
                    <Skeleton className="h-6 w-48" />
                    <div className="grid gap-8 md:grid-cols-2">
                        <Skeleton className="h-56" />
                        <Skeleton className="h-56" />
                    </div>
                </section>
            ) : empty ? (
                <EmptyState icon={BellOff} title="Sin pagos que anticipar">
                    El calendario se llena con los cobros que se repiten. Hacen falta al
                    menos tres del mismo lugar, o uno agregado a mano en Plan.
                </EmptyState>
            ) : (
                <DueMonthCalendar items={items} />
            )}
        </div>
    );
}
