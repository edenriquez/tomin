"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, EyeOff, RotateCcw, Sparkles, StickyNote, X } from "lucide-react";
import { api, type Transaction, type TransactionPatch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { categoryHotkeys, nextCategoryForKey, useCategories } from "@/lib/categories";
import { track } from "@/lib/telemetry";
import { Button, Select, useToast } from "@/components/ui";
import { ReceiptStrip } from "./ReceiptStrip";

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

/** What a taught label would do: assign this category, apply this name, or
 *  flag matching movements as transfers between the user's own accounts. */
type Teach =
    | { kind: "category"; categoryId: string }
    | { kind: "alias"; alias: string }
    | { kind: "transfer" };

type Suggestion = { teach: Teach; label: string; matched: number };

/** How long an armed category waits for another key before it is written. */
const CATEGORY_COMMIT_MS = 800;

function probeRequest(teach: Teach, label: string, dryRun: boolean) {
    if (teach.kind === "category")
        return api.recategorize({ category_id: teach.categoryId, label, dry_run: dryRun });
    if (teach.kind === "alias")
        return api.realias({ label, alias: teach.alias, dry_run: dryRun });
    // The server calls the taught text a "party" (it names the counterparty);
    // mapped onto the shared {label} shape the suggestion strip renders.
    return api
        .markTransfer({ party: label, dry_run: dryRun })
        .then((r) => ({ matched: r.matched, updated: r.updated, label: r.party }));
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

    // A category chosen by key is *armed* first and committed after a pause:
    // the row shows where it will go, and a second T can walk on to
    // Transferencias before Transporte was ever written. Refs mirror the
    // state so the unmount flush and the timer see the latest values.
    const [pendingCategory, setPendingCategory] = useState<string | null>(null);
    const pendingRef = useRef<string | null>(null);
    const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentCategory = useRef(t.category_id);
    currentCategory.current = t.category_id;
    const patchRef = useRef(onPatch);
    patchRef.current = onPatch;

    useEffect(() => {
        // Leaving the row (another row clicked, list re-rendered) must not
        // drop an armed choice: it is written, without the teach prompt.
        return () => {
            if (pendingTimer.current) clearTimeout(pendingTimer.current);
            const id = pendingRef.current;
            pendingRef.current = null;
            if (id !== null && id !== currentCategory.current) {
                patchRef.current({ category_id: id });
            }
        };
    }, []);

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
        cancelPendingCategory();
        onPatch({ category_id: categoryId });
        setSuggestion(null);
        if (categoryId) probeSimilar({ kind: "category", categoryId }, suggestLabel(t));
    }

    function cancelPendingCategory() {
        if (pendingTimer.current) clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
        pendingRef.current = null;
        setPendingCategory(null);
    }

    function commitPendingCategory() {
        const id = pendingRef.current;
        cancelPendingCategory();
        if (id !== null && id !== t.category_id) changeCategory(id);
    }

    /** Mark a category as the one this row is about to get; it is written
     *  after `CATEGORY_COMMIT_MS` without another key. */
    function armCategory(categoryId: string) {
        if (pendingTimer.current) clearTimeout(pendingTimer.current);
        pendingRef.current = categoryId;
        setPendingCategory(categoryId);
        pendingTimer.current = setTimeout(commitPendingCategory, CATEGORY_COMMIT_MS);
    }

    function toggleTransfer(next: boolean) {
        onPatch({ is_transfer: next });
        setSuggestion(null);
        // Flagging one row invites teaching the counterparty ("this name is
        // me") so the siblings and every future upload flag themselves.
        // Unflagging teaches nothing: it is a per-row exception.
        if (next) probeSimilar({ kind: "transfer" }, suggestLabel(t));
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
            const verb =
                suggestion.teach.kind === "alias"
                    ? "renombrados"
                    : suggestion.teach.kind === "transfer"
                      ? "marcados como transferencia"
                      : "actualizados";
            toast(
                res.updated > 0
                    ? `${res.updated} movimiento${res.updated === 1 ? "" : "s"} ${verb}. «${res.label}» quedó aprendido.`
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
        pendingCategory,
        armCategory,
        commitPendingCategory,
        cancelPendingCategory,
        toggleTransfer,
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
                    className="eyebrow"
                >
                    auto
                </span>
            )}
            <Select<string>
                variant="quiet"
                aria-label="Categoría"
                value={edit.pendingCategory ?? t.category_id}
                placeholder="Sin categoría"
                options={options}
                onChange={edit.changeCategory}
            />
        </span>
    );
}

/** A key press meant for the page, not for a field the user is typing in. */
function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Categorize by initial. While a row is selected, pressing the first letter
 * of a category files the row there — V for Vivienda, C for Comida — and
 * pressing it again walks to the next category with that initial
 * (Transporte, then Transferencias). The chips make the keys visible and
 * are clickable too; the pressed one is the row's current category.
 */
export function CategoryKeys({
    transaction: t,
    edit,
}: {
    transaction: Transaction;
    edit: InlineEdit;
}) {
    const categories = useCategories();
    const hotkeys = categoryHotkeys(categories);
    const { changeCategory, armCategory, commitPendingCategory, cancelPendingCategory } = edit;
    const currentId = t.category_id;
    const pendingId = edit.pendingCategory;

    useEffect(() => {
        if (hotkeys.length === 0) return;
        function onKey(e: KeyboardEvent) {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (isTypingTarget(e.target)) return;
            if (pendingId !== null) {
                // An armed choice: Enter writes it now, Escape lets it go,
                // and moving to another row writes it on the way out (the
                // list's own handler moves the selection after this).
                if (e.key === "Enter") {
                    e.preventDefault();
                    commitPendingCategory();
                    return;
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    cancelPendingCategory();
                    return;
                }
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    commitPendingCategory();
                    return;
                }
            }
            if (e.key.length !== 1) return;
            const key = e.key.toLowerCase();
            if (!/^[a-z0-9]$/.test(key)) return;
            const from = pendingId ?? currentId;
            const next = nextCategoryForKey(hotkeys, key, from);
            if (!next) return;
            e.preventDefault();
            track("movimientos.category_hotkey", { key });
            if (next.id === currentId) cancelPendingCategory();
            else armCategory(next.id);
        }
        // Capture phase: this runs before the list's own keydown handler no
        // matter which registered first, so an armed Escape is ours and an
        // ArrowDown commits before the selection moves.
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
        // `hotkeys` is rebuilt each render; the taxonomy behind it is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, currentId, pendingId, armCategory, commitPendingCategory, cancelPendingCategory]);

    if (hotkeys.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Categoría por tecla">
            {hotkeys.map((h) => {
                const pressed = h.id === currentId && pendingId === null;
                const armed = h.id === pendingId;
                return (
                    <button
                        key={h.id}
                        type="button"
                        aria-pressed={pressed}
                        data-armed={armed || undefined}
                        title={armed ? "Se aplica en un momento · Enter aplica ya · Esc cancela" : `Tecla ${h.key.toUpperCase()}`}
                        onClick={() => {
                            if (h.id === currentId) {
                                cancelPendingCategory();
                                return;
                            }
                            track("movimientos.category_chip");
                            changeCategory(h.id);
                        }}
                        className={cn(
                            "inline-flex items-center rounded-control border px-2.5 py-1 text-body-sm",
                            "transition-colors duration-100",
                            pressed
                                ? "border-soot bg-soot font-medium text-paper"
                                : armed
                                  ? "border-signal bg-paper font-medium text-ink"
                                  : "border-transparent text-graphite hover:bg-fog hover:text-ink"
                        )}
                    >
                        <span className="underline decoration-signal decoration-2 underline-offset-2">
                            {h.name.slice(0, 1)}
                        </span>
                        {h.name.slice(1)}
                    </button>
                );
            })}
            {pendingId !== null && (
                <span className="animate-reveal text-label text-graphite" aria-live="polite">
                    Enter aplica · Esc cancela
                </span>
            )}
        </div>
    );
}

/**
 * What has no place in the row, as inline elements rather than a form: the
 * note (click-to-write text, not a labelled field), the exclusion (one
 * pressed chip), the original bank text when a rename hides it, the basket
 * from a photographed ticket when there is one, and the teach-prompt when a
 * correction just happened.
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
    const isTransfer = t.is_transfer ?? false;
    const { suggestion } = edit;

    return (
        <div className="space-y-2.5 py-3.5" onClick={(e) => e.stopPropagation()}>
            {/* Read-only here on purpose: a ticket is photographed on the phone,
                where the paper is. This side only shows what came of it. */}
            <ReceiptStrip transactionId={t.id} />

            <CategoryKeys transaction={t} edit={edit} />

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

                <button
                    type="button"
                    aria-pressed={isTransfer}
                    title="Dinero moviéndose entre tus propias cuentas: se conserva en el historial pero no cuenta como ingreso ni como gasto"
                    onClick={() => edit.toggleTransfer(!isTransfer)}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-body-sm",
                        "transition-colors duration-100",
                        isTransfer
                            ? "bg-soot font-medium text-paper"
                            : "text-graphite hover:bg-fog hover:text-ink"
                    )}
                >
                    <ArrowLeftRight size={13} aria-hidden />
                    {isTransfer ? "Transferencia entre tus cuentas" : "Es entre mis cuentas"}
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
                            más:{" "}
                            {suggestion.teach.kind === "alias"
                                ? `renombrar como «${suggestion.teach.alias}»`
                                : suggestion.teach.kind === "transfer"
                                  ? "marcar como transferencia entre tus cuentas"
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
 * A first guess at the reusable text inside a noisy bank description —
 * always from the RAW text. The backend matches the label as a *contiguous
 * substring* of the normalized description, so the label must be a
 * contiguous window of it: skipping over an interior "a", "de" or a
 * reference number would produce a label that matches nothing, not even the
 * row it came from. The window starts and ends on meaningful words, may
 * carry short filler words along, and never crosses a date or a digit-heavy
 * token (reference numbers differ per row and would kill the siblings).
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

/** The backend's `normalize`: lowercase, strip accents and punctuation,
 *  collapse whitespace. Windowing over this text is what guarantees the
 *  label survives the server's own normalization as a substring. */
function normalizeText(text: string): string {
    return text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** A word worth matching on: long enough to mean something, not mostly a
 *  number (account fragments, folios). */
function isAnchor(w: string): boolean {
    const digits = (w.match(/\d/g) ?? []).length;
    return w.length >= 3 && digits <= w.length / 2;
}

function suggestLabel(t: Transaction): string {
    const source = t.raw_description || t.description || "";
    let best = "";
    let bestAnchors = 0;
    // Dates split the text into segments a window may not cross: the raw
    // description keeps its date, but a label spanning one would have to
    // reproduce it verbatim — true for this row, false for its siblings.
    for (const segment of source.split(DATE_SHAPES)) {
        const tokens = normalizeText(segment ?? "").split(" ").filter(Boolean);
        let i = 0;
        while (i < tokens.length) {
            if (!isAnchor(tokens[i])) {
                i += 1;
                continue;
            }
            const window: string[] = [];
            let anchors = 0;
            let j = i;
            while (j < tokens.length && anchors < 4) {
                const w = tokens[j];
                if (isAnchor(w)) {
                    window.push(w);
                    anchors += 1;
                } else if (w.length < 3 && !/\d/.test(w)) {
                    window.push(w); // filler ("a", "de", "y") rides along
                } else {
                    break; // a digit-heavy token ends the window
                }
                j += 1;
            }
            while (window.length && !isAnchor(window[window.length - 1])) window.pop();
            if (anchors > bestAnchors) {
                bestAnchors = anchors;
                best = window.join(" ");
            }
            i = j > i ? j : i + 1;
        }
    }
    return best;
}
