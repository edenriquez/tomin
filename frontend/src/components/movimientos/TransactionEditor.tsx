"use client";

import { useEffect, useRef, useState } from "react";
import { EyeOff, RotateCcw, Sparkles, StickyNote, X } from "lucide-react";
import { api, type Transaction, type TransactionPatch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useCategories } from "@/lib/categories";
import { Button, Select, useToast } from "@/components/ui";

/**
 * Inline editing for a selected row. No form: the row's own text is the
 * editor. The description becomes an input dressed as itself, the category
 * text becomes a quiet picker, and the strip below carries only what has no
 * place in the row — the note, the stats exclusion, the bank's original text
 * when it differs, and the transient "aplicar a todos" offer.
 *
 * Two corrections teach the system through one prompt shape: a category
 * change offers "«oxxo» aparece en N movimientos más", a rename offers to
 * rename the same N. The label is editable and the count is a dry run — the
 * user always sees the blast radius before committing.
 */

/** What a taught label would do: assign this category, or apply this name. */
type Teach =
    | { kind: "category"; categoryId: string }
    | { kind: "alias"; alias: string };

type Suggestion = { teach: Teach; label: string; matched: number };

function probeRequest(teach: Teach, label: string, dryRun: boolean) {
    return teach.kind === "category"
        ? api.recategorize({ category_id: teach.categoryId, label, dry_run: dryRun })
        : api.realias({ label, alias: teach.alias, dry_run: dryRun });
}

/** One hook per row: the in-place controls and the strip share its state. */
export function useInlineEdit(
    t: Transaction,
    onPatch: (patch: TransactionPatch) => void,
    onBulkApplied: () => void
) {
    const { toast } = useToast();
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const [labelDraft, setLabelDraft] = useState("");
    const [applying, setApplying] = useState(false);
    const probeSeq = useRef(0);

    async function probeSimilar(teach: Teach, label: string) {
        const seq = ++probeSeq.current;
        const trimmed = label.trim();
        if (trimmed.length < 3) {
            setSuggestion(null);
            return;
        }
        try {
            const res = await probeRequest(teach, trimmed, true);
            if (seq !== probeSeq.current) return; // a newer probe superseded us
            setSuggestion(
                res.matched > 0 ? { teach, label: res.label, matched: res.matched } : null
            );
            if (res.matched > 0) setLabelDraft(res.label);
        } catch {
            if (seq === probeSeq.current) setSuggestion(null);
        }
    }

    function commitName(next: string) {
        const clean = next.trim();
        if (!clean || clean === t.description) return;
        onPatch({ description: clean });
        // Offer to rename the siblings: matching on the RAW text, since the
        // new name won't appear in other rows.
        probeSimilar({ kind: "alias", alias: clean }, suggestLabel(t));
    }

    function changeCategory(categoryId: string | null) {
        onPatch({ category_id: categoryId });
        setSuggestion(null);
        if (categoryId) probeSimilar({ kind: "category", categoryId }, suggestLabel(t));
    }

    async function applySimilar() {
        if (!suggestion) return;
        setApplying(true);
        try {
            const res = await probeRequest(
                suggestion.teach,
                labelDraft.trim() || suggestion.label,
                false
            );
            const verb = suggestion.teach.kind === "alias" ? "renombrados" : "actualizados";
            toast(
                res.updated > 0
                    ? `${res.updated} movimiento(s) ${verb}. «${res.label}» quedó aprendido.`
                    : `«${res.label}» quedó aprendido para futuros documentos.`,
                "positive"
            );
            setSuggestion(null);
            if (res.updated > 0) onBulkApplied();
        } catch (e) {
            toast(`No se pudo aplicar: ${(e as Error).message}`, "negative");
        } finally {
            setApplying(false);
        }
    }

    return {
        commitName,
        changeCategory,
        suggestion,
        labelDraft,
        setLabelDraft,
        probeSimilar,
        applySimilar,
        dismissSuggestion: () => setSuggestion(null),
        applying,
    };
}

export type InlineEdit = ReturnType<typeof useInlineEdit>;

/**
 * The description, editable where it is read. Dressed exactly as the static
 * title — same face, same weight — with only a hairline underdash to say
 * "this is now yours to type in"; it warms to Signal under the caret.
 */
export function InlineName({
    transaction: t,
    edit,
}: {
    transaction: Transaction;
    edit: InlineEdit;
}) {
    const [draft, setDraft] = useState(t.description ?? "");
    useEffect(() => {
        setDraft(t.description ?? "");
    }, [t.id, t.description]);

    return (
        <input
            type="text"
            value={draft}
            aria-label="Nombre del movimiento"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => (draft.trim() ? edit.commitName(draft) : setDraft(t.description ?? ""))}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    edit.commitName(draft);
                    e.currentTarget.blur();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    setDraft(t.description ?? "");
                    e.currentTarget.blur();
                }
            }}
            className={cn(
                "w-full truncate bg-transparent text-body font-medium text-ink outline-none",
                "border-b border-dashed border-muted pb-px transition-colors duration-100",
                "focus:border-solid focus:border-signal"
            )}
        />
    );
}

/**
 * The category, changeable where it is read: the same graphite text the
 * static row shows, now a quiet picker. The "Auto" whisper marks a machine
 * guess without adding a chip to count.
 */
export function InlineCategory({
    transaction: t,
    edit,
}: {
    transaction: Transaction;
    edit: InlineEdit;
}) {
    const categories = useCategories();
    const options = categories
        ? Array.from(categories.entries()).map(([id, c]) => ({ value: id, label: c.name }))
        : [];

    return (
        <span
            className="mt-0.5 flex items-center justify-end gap-1.5"
            onClick={(e) => e.stopPropagation()}
        >
            {t.category_source === "auto" && (
                <span
                    title="Categoría asignada automáticamente"
                    className="text-caption font-medium uppercase text-ash"
                >
                    auto
                </span>
            )}
            <Select<string>
                variant="quiet"
                aria-label="Categoría"
                value={t.category_id}
                placeholder="Sin categoría"
                options={options}
                onChange={edit.changeCategory}
            />
        </span>
    );
}

/**
 * What has no place in the row, as inline elements rather than a form: the
 * note (click-to-write text, not a labelled field), the exclusion (one
 * pressed chip), the original bank text when a rename hides it, and the
 * teach-prompt when a correction just happened.
 */
export function EditorStrip({
    transaction: t,
    onPatch,
    edit,
}: {
    transaction: Transaction;
    onPatch: (patch: TransactionPatch) => void;
    edit: InlineEdit;
}) {
    const renamed = t.raw_description != null && t.description !== t.raw_description;
    const excluded = t.excluded_from_stats ?? false;
    const { suggestion } = edit;

    return (
        <div className="space-y-2.5 py-3.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <InlineNote transaction={t} onPatch={onPatch} />

                <button
                    type="button"
                    aria-pressed={excluded}
                    title="Se conserva en el historial pero no cuenta en gráficas ni totales"
                    onClick={() => onPatch({ excluded_from_stats: !excluded })}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-body-sm",
                        "transition-colors duration-100",
                        excluded
                            ? "bg-soot font-medium text-paper"
                            : "text-graphite hover:bg-fog hover:text-ink"
                    )}
                >
                    <EyeOff size={13} aria-hidden />
                    {excluded ? "Excluido de estadísticas" : "Excluir de estadísticas"}
                </button>

                {renamed && (
                    <span className="flex min-w-0 items-center gap-1.5 text-label text-ash">
                        <span className="tabular min-w-0 truncate" title={t.raw_description ?? ""}>
                            {t.raw_description}
                        </span>
                        <button
                            type="button"
                            title="Restaurar el texto original del banco"
                            onClick={() => onPatch({ description: t.raw_description ?? undefined })}
                            className="inline-flex shrink-0 items-center gap-1 text-label text-graphite transition-colors duration-100 hover:text-ink"
                        >
                            <RotateCcw size={11} aria-hidden />
                            restaurar
                        </button>
                    </span>
                )}
            </div>

            {suggestion && (
                <div
                    className={cn(
                        "animate-reveal flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card",
                        "border border-dashed border-muted bg-canvas px-3.5 py-2.5"
                    )}
                >
                    <Sparkles size={14} aria-hidden className="shrink-0 text-signal" />
                    <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-graphite">
                        <input
                            type="text"
                            value={edit.labelDraft}
                            aria-label="Texto a buscar"
                            onChange={(e) => edit.setLabelDraft(e.target.value)}
                            onBlur={() => edit.probeSimilar(suggestion.teach, edit.labelDraft)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    edit.probeSimilar(suggestion.teach, edit.labelDraft);
                                }
                            }}
                            className={cn(
                                "tabular w-36 bg-transparent text-body-sm text-ink outline-none",
                                "border-b border-dashed border-muted transition-colors duration-100",
                                "focus:border-solid focus:border-signal"
                            )}
                        />
                        <span className="whitespace-nowrap">
                            en {suggestion.matched} movimiento{suggestion.matched === 1 ? "" : "s"}{" "}
                            más —{" "}
                            {suggestion.teach.kind === "alias"
                                ? `renombrar como «${suggestion.teach.alias}»`
                                : "misma categoría"}
                        </span>
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                        <Button
                            size="sm"
                            loading={edit.applying}
                            onClick={edit.applySimilar}
                            className="text-ink"
                        >
                            Aplicar
                        </Button>
                        <button
                            type="button"
                            aria-label="Descartar sugerencia"
                            onClick={edit.dismissSuggestion}
                            className="rounded-full p-1 text-ash transition-colors duration-100 hover:text-ink"
                        >
                            <X size={14} aria-hidden />
                        </button>
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * The note as text, not as a field. Nothing yet → a ghost "+ Nota" that turns
 * into a caret; something → the note itself, click-to-edit, with the sticky
 * icon as its only chrome.
 */
function InlineNote({
    transaction: t,
    onPatch,
}: {
    transaction: Transaction;
    onPatch: (patch: TransactionPatch) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(t.notes ?? "");
    useEffect(() => {
        setDraft(t.notes ?? "");
        setEditing(false);
    }, [t.id]);

    function commit() {
        const next = draft.trim();
        setEditing(false);
        if (next !== (t.notes ?? "")) onPatch({ notes: next || null });
    }

    if (!editing && !t.notes) {
        return (
            <button
                type="button"
                onClick={() => setEditing(true)}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-body-sm",
                    "text-graphite transition-colors duration-100 hover:bg-fog hover:text-ink"
                )}
            >
                <StickyNote size={13} aria-hidden />
                Nota
            </button>
        );
    }

    if (!editing) {
        return (
            <button
                type="button"
                title="Editar nota"
                onClick={() => setEditing(true)}
                className="inline-flex min-w-0 items-center gap-1.5 text-left text-body-sm text-graphite transition-colors duration-100 hover:text-ink"
            >
                <StickyNote size={13} aria-hidden className="shrink-0 text-ash" />
                <span className="min-w-0 truncate">{t.notes}</span>
            </button>
        );
    }

    return (
        <span className="inline-flex min-w-0 items-center gap-1.5">
            <StickyNote size={13} aria-hidden className="shrink-0 text-ash" />
            <input
                autoFocus
                type="text"
                value={draft}
                aria-label="Nota"
                placeholder="Algo que recordar"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        commit();
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        setDraft(t.notes ?? "");
                        setEditing(false);
                    }
                }}
                className={cn(
                    "w-52 bg-transparent text-body-sm text-ink outline-none placeholder:text-ash",
                    "border-b border-dashed border-muted transition-colors duration-100",
                    "focus:border-solid focus:border-signal"
                )}
            />
        </span>
    );
}

/**
 * A first guess at the reusable text inside a noisy bank description: drop
 * date shapes, then tokens that are mostly digits, and keep the words —
 * always from the RAW text. Mirrors the backend's `series_key`.
 */
const MONTHS =
    "enero|febrero|marzo|abril|mayo|junio|julio|agosto" +
    "|septiembre|setiembre|octubre|noviembre|diciembre" +
    "|ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic";
const DATE_SHAPES = new RegExp(
    `\\b\\d{1,2}[-/. ]?(?:${MONTHS})[a-z]*[-/. ]?\\d{2,4}\\b` +
        `|\\b(?:${MONTHS})[-/. ]?\\d{1,2}[-/. ]?\\d{2,4}\\b` +
        "|\\b\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}\\b" +
        "|\\b\\d{4}-\\d{2}-\\d{2}\\b",
    "gi"
);

function suggestLabel(t: Transaction): string {
    const source = t.raw_description || t.description || "";
    const words = source
        .replace(DATE_SHAPES, " ")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => {
            const digits = (w.match(/\d/g) ?? []).length;
            return w.length >= 3 && digits <= w.length / 2;
        });
    return words.slice(0, 4).join(" ");
}
