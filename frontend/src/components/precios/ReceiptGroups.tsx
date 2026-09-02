"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronRight, MessageSquarePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { fullDayLabel, mxn2 } from "@/lib/format";
import {
    receiptsApi,
    termsApi,
    type Receipt,
    type ReceiptItem,
    type ReferenceTerm,
} from "@/lib/prices";
import { BackendNotice, Button, EmptyState, Skeleton } from "@/components/ui";
import { useAppData } from "@/components/AppChrome";
import { PriceChat, type Attachment, type Turn } from "./PriceChat";

/** What a ticket's own chat offers before anyone has asked it anything. */
const EXAMPLES = [
    "¿Qué me salió más caro de este ticket?",
    "¿Pagué de más en algo?",
    "¿Qué cambió desde la última vez?",
];

/**
 * Your purchases, grouped the way they were made: one ticket at a time.
 *
 * A basket is a decision made once, and the lines in it explain each other —
 * the $1,412 at Soriana is 24 choices, and the one that moved the total is
 * visible only next to the other 23. So the ticket is the unit: collapsed by
 * default, because a wall of open baskets is the same undifferentiated list
 * this view exists to replace, and opened one at a time when a trip is worth
 * looking at.
 *
 * Several can be open at once, deliberately. The comparison people actually
 * make here is between two trips to the same store, and an accordion that
 * closes one when you open the next makes exactly that comparison impossible.
 *
 * **Each ticket owns its conversation.** The chat lives inside the basket and
 * its transcript is held here, keyed by receipt — so collapsing a ticket and
 * reopening it finds the thread where it was, and a question about last
 * Tuesday's trip never lands in the middle of a thread about this one. The
 * server scopes its brief to the same ticket, so the separation is real on both
 * ends rather than cosmetic on this one.
 */
export function ReceiptGroups({ query }: { query: string }) {
    const { dataVersion } = useAppData();
    const [receipts, setReceipts] = useState<Receipt[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<Set<string>>(new Set());
    const [threads, setThreads] = useState<Record<string, Turn[]>>({});
    // One fetch for every ticket on screen: the association belongs to the
    // product, so the same row serves every basket that ever printed it.
    const [terms, setTerms] = useState<Record<string, ReferenceTerm>>({});
    // Per ticket, the lines pinned to its question. Kept next to the thread
    // because they are part of it: the subject of a conversation.
    const [attached, setAttached] = useState<Record<string, Attachment[]>>({});

    useEffect(() => {
        let stale = false;
        receiptsApi
            .list()
            .then((res) => {
                if (stale) return;
                setReceipts(res.items);
                setError(null);
            })
            .catch((e) => !stale && setError((e as Error).message));
        return () => {
            stale = true;
        };
    }, [dataVersion]);

    useEffect(() => {
        let stale = false;
        termsApi
            .list()
            .then((res) => {
                if (stale) return;
                setTerms(Object.fromEntries(res.items.map((t) => [t.product_key, t])));
            })
            // Silent: an association nobody has made yet is the normal state,
            // and the lines render as "sin asociar" either way.
            .catch(() => undefined);
        return () => {
            stale = true;
        };
    }, [dataVersion]);

    async function associate(productKey: string, term: string) {
        const saved = await termsApi.set(productKey, term);
        setTerms((current) => ({ ...current, [productKey]: saved }));
    }

    // Unlike the product book, this search is local: the ticket list is one
    // page of baskets the user already has, and a round-trip per keystroke to
    // re-filter what is already on screen would be slower and no more correct.
    const shown = useMemo(() => {
        const q = fold(query.trim());
        const all = [...(receipts ?? [])].sort(byNewest);
        if (!q) return all;
        return all.filter(
            (r) =>
                fold(r.store ?? "").includes(q) ||
                r.items.some((i) => fold(i.description).includes(q))
        );
    }, [receipts, query]);

    function toggle(id: string) {
        setOpen((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function remove(id: string) {
        await receiptsApi.remove(id);
        // Dropped from the list here rather than by refetching: the answer is
        // already known, and a refetch would blink the whole list to remove one
        // row from it.
        setReceipts((current) => (current ?? []).filter((r) => r.id !== id));
        setOpen((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
        });
        // Its conversation goes with it. A thread about a basket that no longer
        // exists has nothing left to be about.
        setThreads(({ [id]: _gone, ...rest }) => rest);
        setAttached(({ [id]: _gone, ...rest }) => rest);
    }

    function attach(receiptId: string, item: Attachment) {
        setAttached((cur) => {
            const list = cur[receiptId] ?? [];
            if (list.some((a) => a.key === item.key)) return cur;
            return { ...cur, [receiptId]: [...list, item] };
        });
    }

    function clearAttached(receiptId: string) {
        setAttached((cur) => ({ ...cur, [receiptId]: [] }));
    }

    function detach(receiptId: string, key: string) {
        setAttached((cur) => ({
            ...cur,
            [receiptId]: (cur[receiptId] ?? []).filter((a) => a.key !== key),
        }));
    }

    if (error) return <BackendNotice what="tus tickets" detail={error} />;

    if (receipts === null) {
        return (
            <div className="mt-4 space-y-2">
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14" />
                ))}
            </div>
        );
    }

    if (shown.length === 0) {
        return (
            <EmptyState
                icon={Camera}
                title={query ? "Ningún ticket coincide" : "Todavía no hay tickets"}
                className="mt-4"
            >
                {query
                    ? "Busca por tienda o por algo que hayas comprado."
                    : "Toma la foto de un ticket desde la app de tu teléfono: la foto se queda ahí y solo viaja el texto."}
            </EmptyState>
        );
    }

    return (
        <>
            <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-graphite">
                    {shown.length} ticket{shown.length === 1 ? "" : "s"}
                </span>
                {open.size > 0 && (
                    <button
                        type="button"
                        onClick={() => setOpen(new Set())}
                        className="text-body-sm text-graphite underline-offset-4 hover:text-ink hover:underline"
                    >
                        Colapsar todo
                    </button>
                )}
            </div>

            <ul className="mt-2 space-y-2">
                {shown.map((receipt) => (
                    <li key={receipt.id}>
                        <ReceiptGroup
                            receipt={receipt}
                            open={open.has(receipt.id)}
                            onToggle={() => toggle(receipt.id)}
                            onDelete={() => remove(receipt.id)}
                            terms={terms}
                            onAssociate={associate}
                            attachments={attached[receipt.id] ?? []}
                            onAttach={(item) => attach(receipt.id, item)}
                            onDetach={(key) => detach(receipt.id, key)}
                            onAnswered={() => clearAttached(receipt.id)}
                            turns={threads[receipt.id] ?? []}
                            onTurns={(update) =>
                                setThreads((cur) => ({
                                    ...cur,
                                    [receipt.id]: update(cur[receipt.id] ?? []),
                                }))
                            }
                        />
                    </li>
                ))}
            </ul>
        </>
    );
}

function ReceiptGroup({
    receipt,
    open,
    onToggle,
    onDelete,
    terms,
    onAssociate,
    attachments,
    onAttach,
    onDetach,
    onAnswered,
    turns,
    onTurns,
}: {
    receipt: Receipt;
    open: boolean;
    onToggle: () => void;
    onDelete: () => Promise<void>;
    terms: Record<string, ReferenceTerm>;
    onAssociate: (productKey: string, term: string) => Promise<void>;
    attachments: Attachment[];
    onAttach: (item: Attachment) => void;
    onDetach: (key: string) => void;
    onAnswered: () => void;
    turns: Turn[];
    onTurns: (update: (current: Turn[]) => Turn[]) => void;
}) {
    const count = receipt.items.length;
    return (
        <div className={cn("rounded-card border border-mist", open && "bg-fog/40")}>
            {/* A row, not one big button: the delete control lives in it, and a
                button inside a button is neither valid nor operable. */}
            <div className="flex items-center gap-3 px-4 py-3">
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                    <ChevronRight
                        className={cn(
                            "size-4 shrink-0 text-ash transition-transform",
                            open && "rotate-90"
                        )}
                    />
                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink">
                        {receipt.store ?? "tienda ilegible"}
                    </span>
                    <span className="hidden shrink-0 text-label text-ash sm:inline">
                        {dateLabel(receipt)}
                    </span>
                    <span className="hidden shrink-0 text-label text-ash sm:inline">
                        {count} {count === 1 ? "artículo" : "artículos"}
                    </span>
                    <span className="tabular-nums shrink-0 text-body-sm text-ink">
                        {receipt.total !== null ? mxn2(receipt.total) : "—"}
                    </span>
                </button>
                <DeleteReceipt receipt={receipt} onDelete={onDelete} />
            </div>

            {open && (
                <ReceiptLines
                    receipt={receipt}
                    terms={terms}
                    onAssociate={onAssociate}
                    attachments={attachments}
                    onAttach={onAttach}
                    onDetach={onDetach}
                    onAnswered={onAnswered}
                    turns={turns}
                    onTurns={onTurns}
                />
            )}
        </div>
    );
}

/**
 * Two-tap delete in place of a modal.
 *
 * The row *is* the confirmation prompt — the store, the date and the total are
 * right there — and there is no dialog to mis-tap on a phone. Same shape the
 * document archive uses, on purpose: deleting a thing you own should feel the
 * same everywhere in this app.
 */
function DeleteReceipt({
    receipt,
    onDelete,
}: {
    receipt: Receipt;
    onDelete: () => Promise<void>;
}) {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [failed, setFailed] = useState<string | null>(null);

    if (failed) {
        return <span className="shrink-0 text-label text-negative">{failed}</span>;
    }

    if (!confirming) {
        return (
            <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 size={14} />}
                aria-label={`Eliminar el ticket de ${receipt.store ?? "tienda ilegible"}`}
                onClick={() => setConfirming(true)}
            />
        );
    }

    return (
        <span className="flex shrink-0 items-center gap-1">
            <Button
                size="sm"
                variant="danger"
                loading={deleting}
                onClick={async () => {
                    setDeleting(true);
                    try {
                        await onDelete();
                    } catch (e) {
                        // The row survives a failed delete, saying why. A row
                        // that vanishes on an error is a ticket the user thinks
                        // is gone and is not.
                        setFailed((e as Error).message);
                        setDeleting(false);
                        setConfirming(false);
                    }
                }}
            >
                ¿Borrar el ticket?
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancelar
            </Button>
        </span>
    );
}

/** One basket, line by line, what the lines do and do not account for, and its
 *  own conversation. */
function ReceiptLines({
    receipt,
    terms,
    onAssociate,
    attachments,
    onAttach,
    onDetach,
    onAnswered,
    turns,
    onTurns,
}: {
    receipt: Receipt;
    terms: Record<string, ReferenceTerm>;
    onAssociate: (productKey: string, term: string) => Promise<void>;
    attachments: Attachment[];
    onAttach: (item: Attachment) => void;
    onDetach: (key: string) => void;
    onAnswered: () => void;
    turns: Turn[];
    onTurns: (update: (current: Turn[]) => Turn[]) => void;
}) {
    const gap = receipt.total === null ? null : receipt.total - receipt.items_total;
    // A centavo of rounding is not a missing line. Anything above it is, and
    // OCR drops lines — a silently short basket is worse than a visible gap.
    const short = gap !== null && Math.abs(gap) > 0.5;

    return (
        <div className="border-t border-mist px-4 pb-4 pt-3">
            {receipt.items.length === 0 ? (
                <p className="text-body-sm text-graphite">
                    Este ticket no dejó ninguna línea legible.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-body-sm">
                        <thead>
                            <tr className="border-b border-mist text-left text-label text-graphite">
                                <th className="py-1.5 pr-4 font-medium">Producto</th>
                                <th className="py-1.5 pr-4 text-right font-medium">Cantidad</th>
                                <th className="py-1.5 pr-4 text-right font-medium">Precio</th>
                                <th className="py-1.5 text-right font-medium">Importe</th>
                                <th className="py-1.5 pl-3" aria-label="Preguntar" />
                            </tr>
                        </thead>
                        <tbody>
                            {[...receipt.items]
                                .sort((a, b) => a.line_no - b.line_no)
                                .map((item) => (
                                    <Line
                                        key={item.id}
                                        item={item}
                                        term={terms[item.product_key]}
                                        onAssociate={onAssociate}
                                        attached={attachments.some((a) => a.key === item.product_key)}
                                        onAttach={() =>
                                            onAttach({ key: item.product_key, label: item.description })
                                        }
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-mist pt-2">
                <span className="text-label text-ash">
                    Las líneas suman{" "}
                    <span className="tabular-nums text-graphite">{mxn2(receipt.items_total)}</span>
                    {receipt.total !== null && (
                        <>
                            {" · "}el ticket dice{" "}
                            <span className="tabular-nums text-graphite">
                                {mxn2(receipt.total)}
                            </span>
                        </>
                    )}
                </span>
                {short && (
                    // Said out loud rather than reconciled silently: the number
                    // the user can check is the one printed on the paper, and a
                    // basket that does not add up to it is a basket with a line
                    // missing.
                    <span className="text-label text-negative">
                        Faltan {mxn2(Math.abs(gap as number))} por leer
                    </span>
                )}
            </div>

            <p className="mt-2 text-label text-ash">
                Leído por {receipt.extractor} · {receipt.reader}
                {receipt.transaction_id === null && " · sin movimiento asociado"}
            </p>

            <div className="mt-4 border-t border-mist pt-4">
                <PriceChat
                    receiptId={receipt.id}
                    attachments={attachments}
                    onDetach={onDetach}
                    onAnswered={onAnswered}
                    turns={turns}
                    onTurns={onTurns}
                    variant="bare"
                    title="Pregunta por este ticket"
                    examples={EXAMPLES}
                    placeholder="¿Qué me salió más caro?"
                />
            </div>
        </div>
    );
}

function Line({
    item,
    term,
    onAssociate,
    attached,
    onAttach,
}: {
    item: ReceiptItem;
    term?: ReferenceTerm;
    onAssociate: (productKey: string, term: string) => Promise<void>;
    attached: boolean;
    onAttach: () => void;
}) {
    return (
        <tr className="border-b border-mist/60 last:border-0">
            {/* The OCR line behind the row, on hover: it is the evidence for
                everything to the right of it. */}
            <td className="max-w-0 py-1.5 pr-4" title={item.raw_text}>
                <span className="block truncate text-ink">{item.description}</span>
                <TermTag
                    term={term}
                    onSave={(value) => onAssociate(item.product_key, value)}
                />
            </td>
            <td className="tabular-nums py-1.5 pr-4 text-right text-graphite">
                {item.quantity !== null ? trimZeros(item.quantity) : "—"}
                {item.size !== null && item.size_unit && (
                    <span className="ml-1 text-ash">
                        × {trimZeros(item.size)} {item.size_unit}
                    </span>
                )}
            </td>
            <td className="tabular-nums py-1.5 pr-4 text-right text-graphite">
                {item.unit_price !== null ? mxn2(item.unit_price) : "—"}
            </td>
            <td className="tabular-nums py-1.5 text-right text-ink">{mxn2(item.amount)}</td>
            <td className="py-1.5 pl-3 text-right">
                {/* Pointing, not wording: this is how a line becomes the subject
                    of the question below, and the only thing that triggers a
                    reference lookup. */}
                <button
                    type="button"
                    onClick={onAttach}
                    disabled={attached}
                    aria-label={`Preguntar por ${item.description}`}
                    title="Preguntar por esta línea"
                    className={cn(
                        "rounded-control p-1 text-ash hover:bg-fog hover:text-ink",
                        attached && "text-ink opacity-50"
                    )}
                >
                    <MessageSquarePlus size={15} aria-hidden />
                </button>
            </td>
        </tr>
    );
}

/**
 * What this line is called outside your kitchen.
 *
 * A ticket prints `GV DETE 7L`; a price survey files it under `detergente`.
 * Nothing derives one from the other, so it is shown here as what it is — an
 * association, editable, with the model's proposal marked as a proposal. That
 * mark matters: "sugerido" invites a correction where a bare word would be read
 * as a fact the app already knows.
 */
function TermTag({
    term,
    onSave,
}: {
    term?: ReferenceTerm;
    onSave: (value: string) => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(term?.term ?? "");
    const [saving, setSaving] = useState(false);

    if (editing) {
        return (
            <form
                className="mt-0.5 flex items-center gap-1.5"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!draft.trim() || saving) return;
                    setSaving(true);
                    try {
                        await onSave(draft);
                        setEditing(false);
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <span className="text-label text-ash">busca como</span>
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => !saving && setEditing(false)}
                    placeholder="detergente"
                    aria-label="Término de búsqueda para este producto"
                    className={cn(
                        "h-6 w-36 rounded-input border border-mist bg-paper px-2",
                        "text-label text-ink outline-none placeholder:text-ash focus:border-ink"
                    )}
                />
            </form>
        );
    }

    return (
        <button
            type="button"
            onClick={() => {
                setDraft(term?.term ?? "");
                setEditing(true);
            }}
            className="mt-0.5 block text-label text-ash underline-offset-4 hover:text-graphite hover:underline"
        >
            {term ? (
                <>
                    busca como: <span className="text-graphite">{term.term}</span>
                    {term.source === "auto" && " · sugerido"}
                </>
            ) : (
                "sin asociar"
            )}
        </button>
    );
}

function dateLabel(receipt: Receipt): string {
    const iso = receipt.purchased_at ?? receipt.captured_at;
    if (!iso) return "fecha ilegible";
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : fullDayLabel(date);
}

/** Newest purchase first; a ticket whose date OCR could not read goes last
 *  rather than to 1970, which would bury it under every real one. */
function byNewest(a: Receipt, b: Receipt): number {
    const left = a.purchased_at ?? a.captured_at;
    const right = b.purchased_at ?? b.captured_at;
    if (!left) return 1;
    if (!right) return -1;
    return right.localeCompare(left);
}

function fold(text: string): string {
    return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** "1.00" -> "1", "0.750" -> "0.75". A trailing zero is noise in a quantity. */
function trimZeros(value: number): string {
    return String(Number(value.toFixed(3)));
}
