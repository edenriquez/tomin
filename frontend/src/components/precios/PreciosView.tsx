"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { BackendNotice, EmptyState, SearchInput, Skeleton } from "@/components/ui";
import { useAppData } from "@/components/AppChrome";
import { useTimeWindow } from "@/components/TimeWindowProvider";
import { CompositionBar } from "@/components/movimientos/CompositionBar";
import { useMovimientosSearch } from "@/components/movimientos/MovimientosSearchProvider";
import { mxn2 } from "@/lib/format";
import { EMPTY_QUERY } from "@/lib/movimientosQuery";
import { monthBounds } from "@/lib/porMes";
import type { Receipt } from "@/lib/prices";
import { composeBasket } from "./basket";
import { PriceChat, type Attachment, type Turn } from "./PriceChat";
import { ProductosList } from "./ProductosList";
import { ReceiptGroups } from "./ReceiptGroups";
import { useReceipts } from "./useReceipts";

/**
 * Precios: your tickets, one basket at a time — the fourth face of Movimientos.
 *
 * A statement can only ever say `BODEGA AURRERA · $936.88`. This face is the
 * other half of that charge — the basket behind it — and the only question it
 * exists to answer is the one a statement structurally cannot: *what did I
 * actually buy, and at what price?* Same money the other faces read, one
 * level further down: categoría → cargo → línea de canasta.
 *
 * Three beats, the same three the other faces draw: the whole as one bar
 * (the baskets by product), the list the bar is made of (tickets, openable to
 * the line), and the reading the tickets exist for (the price book, one row
 * per product). The chat sits last, as the follow-up question.
 *
 * Every figure here is a price the user paid, read off a ticket they
 * photographed. Nothing is fetched from a store, nothing is estimated.
 *
 * The period does **not** filter anything here, and the eyebrow says so. A
 * price history is about the same product over time, and a window that hid
 * last quarter's cheaper trip would remove exactly the comparison this face
 * is for.
 */
export function PreciosView({
    tabs,
    onLoadingChange,
}: {
    tabs?: ReactNode;
    /** Told to the host each time this face starts or stops waiting on data. */
    onLoadingChange?: (loading: boolean) => void;
} = {}) {
    const { dataVersion } = useAppData();
    const { selectCustom } = useTimeWindow();
    const { openModal } = useMovimientosSearch();
    const { receipts, error, terms, associate, remove } = useReceipts(dataVersion);
    const [query, setQuery] = useState("");
    const [activeSlice, setActiveSlice] = useState<string | null>(null);
    const [focus, setFocus] = useState<{ id: string; gen: number } | null>(null);
    // Held here rather than inside the band so the transcript survives a
    // re-render of the lists above it.
    const [turns, setTurns] = useState<Turn[]>([]);
    // The lines the next question is about, pointed at from the tickets.
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const basket = useMemo(
        () => (receipts ? composeBasket(receipts, terms) : null),
        [receipts, terms]
    );

    const waiting = receipts === null && error === null;
    const report = useRef(onLoadingChange);
    report.current = onLoadingChange;
    useEffect(() => {
        report.current?.(waiting);
    }, [waiting]);

    function ask(item: Attachment) {
        setAttachments((cur) => (cur.some((a) => a.key === item.key) ? cur : [...cur, item]));
    }

    /** The charge a ticket was matched to, in the modal: the store as the
     *  needle, the window on the month it was bought. */
    function verCargo(receipt: Receipt) {
        if (receipt.purchased_at) {
            const range = monthBounds(receipt.purchased_at.slice(0, 7));
            selectCustom(range.start, range.end, "precios");
        }
        openModal("precios", { ...EMPTY_QUERY, needle: receipt.store ?? "" });
    }

    const head = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Periodo · todos los tickets</p>
            {tabs}
        </div>
    );

    if (error) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">{tabs}</div>
                <BackendNotice what="tus tickets" detail={error} />
            </div>
        );
    }

    if (receipts === null || basket === null) {
        return (
            <div className="space-y-5">
                <section className="card space-y-4">
                    {head}
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-10 w-full rounded-card" />
                </section>
                <div className="rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="my-3 h-11" />
                    ))}
                </div>
            </div>
        );
    }

    if (receipts.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">{tabs}</div>
                <EmptyState icon={Camera} title="Todavía no hay tickets">
                    Los tickets llegan desde la app de Tomin en tu celular (aún no está en
                    tiendas). La foto se queda ahí y solo viaja el texto; aquí verás el precio
                    de cada producto.
                </EmptyState>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <section className="card space-y-5">
                {head}
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                    <div className="min-w-0">
                        <h2 className="text-title-sm font-normal text-ink">Precios</h2>
                        <p className="mt-1 text-body-sm text-graphite">
                            {receipts.length} ticket{receipts.length === 1 ? "" : "s"} ·{" "}
                            {basket.lines} producto{basket.lines === 1 ? "" : "s"} ·{" "}
                            <span className="tabular text-ink">{mxn2(basket.total)}</span> en
                            canasta
                        </p>
                    </div>
                    <SearchInput
                        onSearch={setQuery}
                        placeholder="Buscar tienda o producto"
                        aria-label="Buscar tienda o producto"
                    />
                </div>
                <CompositionBar
                    slices={basket.slices}
                    activeKey={activeSlice}
                    onPick={(key) => setActiveSlice((cur) => (cur === key ? null : key))}
                    countLabel={() =>
                        `${basket.lines} línea${basket.lines === 1 ? "" : "s"} leída${basket.lines === 1 ? "" : "s"}`
                    }
                    label="Composición de la canasta por producto"
                />
                <p className="text-label text-ash">Base: líneas leídas de tus tickets.</p>
            </section>

            <ReceiptGroups
                receipts={receipts}
                terms={terms}
                query={query}
                onAssociate={associate}
                onDelete={remove}
                onAsk={ask}
                onVerCargo={verCargo}
                focus={focus}
            />

            <ProductosList
                query={query}
                terms={terms}
                dataVersion={dataVersion}
                onVerTicket={(id) => setFocus((cur) => ({ id, gen: (cur?.gen ?? 0) + 1 }))}
            />

            {/* The cross-ticket question — "¿dónde me sale más barata la leche?"
                — is the one this face is for, so it has the last word. Lines
                pointed at above arrive here as the subject of the question. */}
            <PriceChat
                turns={turns}
                onTurns={setTurns}
                attachments={attachments}
                onDetach={(key) => setAttachments((cur) => cur.filter((a) => a.key !== key))}
                onAnswered={() => setAttachments([])}
            />
        </div>
    );
}
