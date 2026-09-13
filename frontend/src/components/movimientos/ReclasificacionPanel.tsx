"use client";

import { type ReactNode } from "react";
import { ArrowLeftRight, EyeOff, RotateCcw, X } from "lucide-react";
import { KIND_LABELS, type Transaction, type TransactionPatch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { bankLogoSlug, bankMonogram, useStatement } from "@/lib/banks";
import { fullDayLabel, mxn2 } from "@/lib/format";
import { merchantLogoUrl } from "@/lib/merchants";
import { parsePeriodKey } from "@/lib/metrics";
import {
    InlineName,
    ReclassFields,
    TeachPrompt,
    useInlineEdit,
} from "./TransactionEditor";
import { ReceiptStrip } from "./ReceiptStrip";

/**
 * The inspector that slides in beside the list. Categoría and nota live
 * here — the row only files a chip. Autosave: there is no second commit.
 */
export function ReclasificacionPanel({
    transaction: t,
    onPatch,
    onBulkApplied,
    onClose,
}: {
    transaction: Transaction;
    onPatch: (patch: TransactionPatch) => void;
    onBulkApplied: () => void;
    onClose: () => void;
}) {
    const edit = useInlineEdit(t, onPatch, onBulkApplied);
    const d = parsePeriodKey(t.date);
    const when = d ? fullDayLabel(d) : t.date;
    const income = t.type === "income";
    const renamed = t.raw_description != null && t.description !== t.raw_description;

    return (
        <aside
            className="reclasificacion-panel flex h-full min-h-0 w-full flex-col bg-paper"
            aria-label="Reclasificación"
        >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-mist px-5 py-3.5">
                <p className="text-body-sm font-medium text-ink">Reclasificación</p>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar reclasificación"
                    className="-mr-1 rounded-control p-1 text-graphite hover:bg-fog hover:text-ink"
                >
                    <X size={16} aria-hidden />
                </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="border-b border-mist pb-5">
                    <p className="eyebrow">Importe y comercio</p>
                    <p className="mt-2">
                        <span
                            className={
                                income
                                    ? "tabular text-metric-lg font-normal text-positive"
                                    : "tabular text-metric-lg font-normal text-ink"
                            }
                        >
                            {income ? "+" : "−"}
                            {mxn2(t.amount)}
                        </span>
                        <span className="ml-1.5 text-label text-ash">MXN</span>
                    </p>
                    <div className="mt-2">
                        <InlineName transaction={t} edit={edit} variant="plain" />
                    </div>
                    {t.raw_description && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-label text-ash">
                            <span className="min-w-0 truncate" title={t.raw_description}>
                                {t.raw_description}
                            </span>
                            {renamed && (
                                <button
                                    type="button"
                                    title="Restaurar el texto original del banco"
                                    onClick={() => onPatch({ description: t.raw_description ?? undefined })}
                                    className="inline-flex shrink-0 items-center gap-1 text-graphite hover:text-ink"
                                >
                                    <RotateCcw size={11} aria-hidden />
                                    restaurar
                                </button>
                            )}
                        </p>
                    )}
                    <BankSource statementId={t.statement_id} when={when} />
                </div>

                <div className="mt-5 space-y-5">
                    <ReceiptStrip transactionId={t.id} />
                    <ReclassFields transaction={t} edit={edit} />
                    <NoteField transaction={t} onPatch={onPatch} />
                    <div className="flex flex-wrap gap-2">
                        <FlagChip
                            pressed={t.excluded_from_stats ?? false}
                            onClick={() =>
                                onPatch({ excluded_from_stats: !(t.excluded_from_stats ?? false) })
                            }
                            icon={<EyeOff size={13} aria-hidden />}
                            label={
                                t.excluded_from_stats
                                    ? "Excluido de estadísticas"
                                    : "Excluir de estadísticas"
                            }
                        />
                        <FlagChip
                            pressed={t.is_transfer ?? false}
                            onClick={() => edit.toggleTransfer(!(t.is_transfer ?? false))}
                            icon={<ArrowLeftRight size={13} aria-hidden />}
                            label={
                                t.is_transfer
                                    ? "Transferencia entre tus cuentas"
                                    : "Es entre mis cuentas"
                            }
                        />
                    </div>
                    <TeachPrompt edit={edit} />
                </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-mist px-5 py-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-body-sm text-graphite hover:text-ink"
                >
                    Cerrar
                    <span className="ml-1.5 font-mono text-label text-ash">Esc</span>
                </button>
                <p className="text-label text-ash">Se guarda al instante</p>
            </footer>
        </aside>
    );
}

function BankSource({
    statementId,
    when,
}: {
    statementId?: string | null;
    when: string;
}) {
    const statement = useStatement(statementId);
    const bank = statement?.bank ?? null;
    const slug = bankLogoSlug(bank);
    const mark = bankMonogram(bank);
    const kind = statement?.account_kind ? KIND_LABELS[statement.account_kind] : null;
    const label = bank;

    return (
        <div className="mt-3 flex items-center gap-2">
            {slug ? (
                <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-mist bg-paper"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={merchantLogoUrl(slug)}
                        alt=""
                        width={16}
                        height={16}
                        className="h-4 w-4 object-contain"
                    />
                </span>
            ) : mark ? (
                <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-mist bg-fog text-[10px] font-medium text-graphite"
                >
                    {mark}
                </span>
            ) : null}
            <div className="min-w-0">
                {label && (
                    <p className="truncate text-label font-medium text-graphite">
                        {label}
                        {kind ? ` · ${kind}` : ""}
                    </p>
                )}
                <p className="text-label text-ash">{when}</p>
            </div>
        </div>
    );
}

function FlagChip({
    pressed,
    onClick,
    icon,
    label,
}: {
    pressed: boolean;
    onClick: () => void;
    icon: ReactNode;
    label: string;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-body-sm",
                "transition-colors duration-100",
                pressed
                    ? "bg-soot font-medium text-paper"
                    : "text-graphite hover:bg-fog hover:text-ink"
            )}
        >
            {icon}
            {label}
        </button>
    );
}

function NoteField({
    transaction: t,
    onPatch,
}: {
    transaction: Transaction;
    onPatch: (patch: TransactionPatch) => void;
}) {
    return (
        <label className="block">
            <span className="eyebrow text-ink">Nota</span>
            <textarea
                defaultValue={t.notes ?? ""}
                key={`${t.id}:${t.notes ?? ""}`}
                aria-label="Nota"
                placeholder="Algo que recordar de este cargo"
                rows={2}
                onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next !== (t.notes ?? "")) onPatch({ notes: next || null });
                }}
                className={cn(
                    "mt-1.5 w-full resize-none rounded-control border border-mist bg-fog px-3 py-2",
                    "text-body-sm text-ink outline-none placeholder:text-ash focus:border-ink focus:bg-paper"
                )}
            />
        </label>
    );
}
