"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, SearchX, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Checkbox, EmptyState, Select, Sheet, Skeleton } from "@/components/ui";
import { useAppData } from "@/components/AppChrome";
import { useTransactions } from "@/components/movimientos/useTransactions";
import type { Transaction } from "@/lib/api";
import { useBankScope } from "@/lib/banks";
import { useCategories, type CategoryInfo } from "@/lib/categories";
import { mxn } from "@/lib/format";
import { dayLabel } from "@/lib/format";
import {
    ruleClauses,
    ruleFromClauses,
    type RuleClause,
    type Workstation,
    type WorkstationDraft,
} from "@/lib/workstations";

/**
 * Define a set by watching it form.
 *
 * The whole design of this sheet is step one: the user types what they want to
 * isolate — or picks a category — and the matching movements filter
 * **underneath them, as they choose**. A rule builder that only shows its
 * result after you apply it is a form; one that shows it while you write is a
 * search, and people are already fluent in search.
 *
 * A set is often more than one search, though. "Mis suscripciones" is spotify
 * *plus* netflix *plus* the gym charge, and before groups existed that cost the
 * user three separate lenses and mental arithmetic — the exact arithmetic this
 * product exists to remove. So the sheet edits a **list** of filters, unioned:
 * each block is one search with its own bounds, and the count under them all is
 * the group.
 *
 * The union stays one level deep on purpose. Filters OR'd, conditions inside a
 * filter AND'd, and no nesting: that is the most structure a person can read off
 * a screen and still trust the total underneath it.
 */
export function RuleEditorSheet({
    open,
    onClose,
    existing,
    seed = "",
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    /** Editing an existing lens, or `undefined` to create one. */
    existing?: Workstation;
    /** Prefills the first filter's needle when creating. Ignored when editing. */
    seed?: string;
    onSave: (draft: WorkstationDraft) => Promise<unknown>;
}) {
    const { bounds, dataVersion } = useAppData();
    const { statementIds } = useBankScope(dataVersion);
    const { items } = useTransactions(bounds, dataVersion, statementIds);
    const categories = useCategories();

    const [drafts, setDrafts] = useState<DraftClause[]>([blank()]);
    const [excluded, setExcluded] = useState<Set<string>>(new Set());
    const [name, setName] = useState("");
    const [nameTouched, setNameTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    // Reset to the lens being edited (or to blank) each time the sheet opens,
    // so a cancelled edit never leaks into the next one.
    useEffect(() => {
        if (!open) return;
        setDrafts(
            existing
                ? ruleClauses(existing.rule).map(toDraft)
                : [{ ...blank(), needle: seed }]
        );
        setExcluded(new Set(existing?.excluded_tx_ids ?? []));
        setName(existing?.name ?? capitalize(seed));
        setNameTouched(Boolean(existing));
        setSaving(false);
    }, [open, existing, seed]);

    // The preview runs client-side over the window's transactions rather than
    // round-tripping per keystroke. It mirrors the backend's predicates — folded
    // and lowercased on both sides — so what the user sees here is what the
    // saved rule will select.
    const expenses = useMemo(() => (items ?? []).filter((t) => t.type === "expense"), [items]);

    const perFilter = useMemo(
        () => drafts.map((draft) => (items ? expenses.filter((t) => matches(t, draft)) : [])),
        [drafts, expenses, items]
    );

    /** The group: every movement any filter takes, in ledger order, each
     *  carrying which filters claimed it. */
    const union = useMemo(() => {
        const claimedBy = new Map<string, number[]>();
        perFilter.forEach((list, index) => {
            for (const t of list) {
                const already = claimedBy.get(t.id);
                if (already) already.push(index + 1);
                else claimedBy.set(t.id, [index + 1]);
            }
        });
        return { rows: expenses.filter((t) => claimedBy.has(t.id)), claimedBy };
    }, [perFilter, expenses]);

    const kept = union.rows.filter((t) => !excluded.has(t.id));
    const isGroup = drafts.length > 1;
    // A filter needs a subject: something typed, or a category chosen. Amount
    // bounds alone stay disabled — "everything between 10 and 300" is not a set
    // anyone means, and the backend rejects a filter with no anchor.
    const withoutSubject = drafts.filter((d) => !hasSubject(d)).length;
    const anyInverted = drafts.some(inverted);
    const canSave = withoutSubject === 0 && name.trim().length > 0 && !anyInverted;

    function patch(id: string, change: Partial<DraftClause>) {
        setDrafts((current) =>
            current.map((draft) => (draft.id === id ? { ...draft, ...change } : draft))
        );
    }

    /** The name follows the *first* filter until the user takes it over. A group
     *  named after one of its parts is still better than an unnamed one, and the
     *  user renames it the moment it stops fitting. */
    function retitle(next: DraftClause[]) {
        if (nameTouched) return;
        const first = next[0];
        if (!first) return;
        if (first.needle.trim()) setName(capitalize(first.needle));
        else if (first.categoryId) setName(categories?.get(first.categoryId)?.name ?? "");
        else setName("");
    }

    async function save() {
        const clauses: RuleClause[] = drafts.map(toClause);
        setSaving(true);
        const result = await onSave({
            name: name.trim(),
            rule: ruleFromClauses(clauses),
            // Only exclusions that still match: a row struck out under an old
            // needle is not an exception any more, and keeping it would slowly
            // fill the list with ids nothing refers to.
            excluded_tx_ids: union.rows.filter((t) => excluded.has(t.id)).map((t) => t.id),
        });
        setSaving(false);
        if (result) onClose();
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={existing ? "Editar lectura" : "Nueva lectura"}
            description="Escribe o elige una categoría, y agrega filtros para juntar más de un concepto en el mismo grupo."
            width={560}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button variant="primary" disabled={!canSave} loading={saving} onClick={save}>
                        {existing ? "Guardar" : `Crear con ${kept.length}`}
                    </Button>
                </>
            }
        >
            <div className="space-y-3">
                {drafts.map((draft, index) => (
                    <FilterBlock
                        key={draft.id}
                        draft={draft}
                        index={index}
                        total={drafts.length}
                        count={items === null ? null : perFilter[index].length}
                        categories={categories}
                        onChange={(change) => {
                            patch(draft.id, change);
                            retitle(
                                drafts.map((d) => (d.id === draft.id ? { ...d, ...change } : d))
                            );
                        }}
                        onRemove={() => {
                            const next = drafts.filter((d) => d.id !== draft.id);
                            setDrafts(next);
                            retitle(next);
                        }}
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={() => setDrafts((current) => [...current, blank()])}
                className={cn(
                    "mt-3 flex w-full items-center justify-center gap-2 rounded-card border",
                    "border-dashed border-mist py-2.5 text-body-sm text-graphite",
                    "hover:border-ink hover:text-ink"
                )}
            >
                <Plus className="size-4" />
                Agregar filtro
            </button>
            <p className="mt-2 text-label text-ash">
                Un movimiento entra al grupo si cumple <em>cualquiera</em> de los filtros.
            </p>

            <label className="mt-5 block">
                <span className="text-label text-graphite">Nombre</span>
                <input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setNameTouched(true);
                    }}
                    placeholder="Recargas telefónicas"
                    className={cn(
                        "mt-1.5 h-10 w-full rounded-input border border-mist bg-paper px-3",
                        "text-body text-ink outline-none placeholder:text-ash focus:border-ink"
                    )}
                />
            </label>

            <div className="mt-6 border-t border-mist pt-4">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body font-medium text-ink">
                        {withoutSubject === drafts.length
                            ? "Escribe o elige una categoría"
                            : groupLabel(kept.length, isGroup)}
                    </span>
                    {excluded.size > 0 && (
                        <button
                            type="button"
                            onClick={() => setExcluded(new Set())}
                            className="text-body-sm text-graphite underline-offset-4 hover:text-ink hover:underline"
                        >
                            Restaurar {excluded.size}
                        </button>
                    )}
                </div>

                {withoutSubject > 0 && withoutSubject < drafts.length && (
                    <p className="mt-2 text-body-sm text-graphite">
                        {withoutSubject === 1
                            ? "Un filtro está vacío; escribe algo o quítalo para poder guardar."
                            : `${withoutSubject} filtros están vacíos; complétalos o quítalos para poder guardar.`}
                    </p>
                )}

                {items === null && (
                    <div className="mt-3 space-y-2">
                        {[0, 1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-9 w-full" />
                        ))}
                    </div>
                )}

                {items !== null && withoutSubject < drafts.length && union.rows.length === 0 && (
                    <EmptyState icon={SearchX} title="Nada coincide">
                        Ningún movimiento del periodo cumple estas condiciones.
                    </EmptyState>
                )}

                <ul className="mt-3 space-y-0.5">
                    {union.rows.map((t) => {
                        const out = excluded.has(t.id);
                        return (
                            <li key={t.id}>
                                <label
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-control px-2 py-1.5",
                                        "hover:bg-fog",
                                        out && "opacity-45"
                                    )}
                                >
                                    <Checkbox
                                        checked={!out}
                                        onChange={() =>
                                            setExcluded((cur) => {
                                                const next = new Set(cur);
                                                if (out) next.delete(t.id);
                                                else next.add(t.id);
                                                return next;
                                            })
                                        }
                                        aria-label={`Incluir ${t.description}`}
                                    />
                                    {/* Which filter let it in. Only in a group,
                                        where "why is this here?" is a question
                                        the list can actually answer. */}
                                    {isGroup && (
                                        <span className="shrink-0 text-label text-ash">
                                            {union.claimedBy.get(t.id)?.join("·")}
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1 truncate text-body-sm text-ink">
                                        {t.description}
                                    </span>
                                    <span className="shrink-0 text-label text-ash">
                                        {dayLabel(new Date(t.date))}
                                    </span>
                                    <span className="tabular shrink-0 text-body-sm text-ink">
                                        {mxn(t.amount)}
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </Sheet>
    );
}

/** One filter: a search, a category and a range, with what it currently takes. */
function FilterBlock({
    draft,
    index,
    total,
    count,
    categories,
    onChange,
    onRemove,
}: {
    draft: DraftClause;
    index: number;
    total: number;
    /** `null` while the ledger is still loading. */
    count: number | null;
    categories: Map<string, CategoryInfo> | null;
    onChange: (change: Partial<DraftClause>) => void;
    onRemove: () => void;
}) {
    const alone = total === 1;
    return (
        <div
            className={cn(
                "rounded-card border border-mist p-4",
                // A lone filter is the whole rule, so it gets no frame of its
                // own — the sheet is already its frame. The border appears the
                // moment there is a second one to tell it apart from.
                alone && "border-transparent p-0"
            )}
        >
            {!alone && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-label text-graphite">
                        Filtro {index + 1}
                        {count !== null && (
                            <span className="ml-2 text-ash">
                                {count} {count === 1 ? "movimiento" : "movimientos"}
                            </span>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={onRemove}
                        aria-label={`Quitar filtro ${index + 1}`}
                        className="rounded-control p-1 text-ash hover:bg-fog hover:text-ink"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            )}

            <label className="block">
                <span className="text-label text-graphite">
                    {alone ? "¿Qué quieres aislar?" : "Concepto"}
                </span>
                <input
                    autoFocus={index === 0}
                    value={draft.needle}
                    onChange={(e) => onChange({ needle: e.target.value })}
                    placeholder="recarga"
                    className={cn(
                        "mt-1.5 h-10 w-full rounded-input border border-mist bg-paper px-3",
                        "text-body text-ink outline-none placeholder:text-ash focus:border-ink"
                    )}
                />
            </label>

            <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                    <span className="text-label text-graphite">Categoría</span>
                    <Select<string>
                        aria-label="Categoría"
                        value={draft.categoryId}
                        options={
                            categories
                                ? Array.from(categories.entries()).map(([id, c]) => ({
                                      value: id,
                                      label: c.name,
                                  }))
                                : []
                        }
                        placeholder="cualquiera"
                        onChange={(v) => onChange({ categoryId: v })}
                        className="w-44"
                    />
                </div>
                <label className="flex flex-col gap-1.5">
                    <span className="text-label text-graphite">Monto desde</span>
                    <Bound
                        value={draft.min}
                        onChange={(v) => onChange({ min: v })}
                        placeholder="cualquiera"
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-label text-graphite">hasta</span>
                    <Bound
                        value={draft.max}
                        onChange={(v) => onChange({ max: v })}
                        placeholder="cualquiera"
                    />
                </label>
            </div>
            {inverted(draft) && (
                <p className="mt-2 text-body-sm text-negative">
                    El monto mínimo está por encima del máximo; ningún movimiento cabe ahí.
                </p>
            )}
        </div>
    );
}

function Bound({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <input
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder={placeholder}
            className={cn(
                "h-10 w-32 rounded-input border border-mist bg-paper px-3",
                "text-body text-ink outline-none placeholder:text-ash focus:border-ink"
            )}
        />
    );
}

/* -------------------------------------------------------------------------- */
/* The draft a block edits                                                     */
/* -------------------------------------------------------------------------- */

/** One filter as the form holds it: strings, because inputs hold strings. */
type DraftClause = {
    /** Local only. React needs a stable key across reorders and removals, and
     *  a filter has no server identity of its own — it is part of one rule. */
    id: string;
    needle: string;
    categoryId: string | null;
    min: string;
    max: string;
};

let nextId = 0;

function blank(): DraftClause {
    nextId += 1;
    return { id: `f${nextId}`, needle: "", categoryId: null, min: "", max: "" };
}

function toDraft(clause: RuleClause): DraftClause {
    nextId += 1;
    return {
        id: `f${nextId}`,
        needle: clause.description_contains ?? "",
        categoryId: clause.category_id ?? null,
        min: clause.amount_min ?? "",
        max: clause.amount_max ?? "",
    };
}

function toClause(draft: DraftClause): RuleClause {
    const clause: RuleClause = {};
    if (draft.needle.trim()) clause.description_contains = draft.needle.trim();
    if (draft.categoryId) clause.category_id = draft.categoryId;
    if (draft.min.trim()) clause.amount_min = draft.min.trim();
    if (draft.max.trim()) clause.amount_max = draft.max.trim();
    return clause;
}

function hasSubject(draft: DraftClause): boolean {
    return Boolean(draft.needle.trim() || draft.categoryId);
}

function inverted(draft: DraftClause): boolean {
    return Boolean(draft.min.trim() && draft.max.trim() && Number(draft.min) > Number(draft.max));
}

/** The conditions of one filter, AND'd — the same predicate the backend runs. */
function matches(t: Transaction, draft: DraftClause): boolean {
    if (!hasSubject(draft)) return false;
    if (draft.categoryId && t.category_id !== draft.categoryId) return false;
    const q = fold(draft.needle.trim());
    if (q && !fold(t.description).includes(q)) return false;
    if (draft.min.trim() && t.amount < Number(draft.min)) return false;
    if (draft.max.trim() && t.amount > Number(draft.max)) return false;
    return true;
}

/**
 * Case- and accent-insensitive, matching the backend's `contains` predicate.
 *
 * Both must fold or neither does: if the preview matched "Recargación" and the
 * saved rule did not, the count the user approved would not be the count they
 * got — the worst possible failure for a feature whose entire job is defining a
 * set you can trust.
 */
function fold(text: string): string {
    return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function groupLabel(n: number, isGroup: boolean): string {
    const movements = n === 1 ? "1 movimiento" : `${n} movimientos`;
    return isGroup ? `${movements} en el grupo` : movements;
}

function capitalize(text: string): string {
    return text ? text[0].toUpperCase() + text.slice(1) : "";
}
