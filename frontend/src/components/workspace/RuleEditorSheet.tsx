"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Checkbox, EmptyState, Select, Sheet, Skeleton } from "@/components/ui";
import { useAppData } from "@/components/AppChrome";
import { useTransactions } from "@/components/movimientos/useTransactions";
import { useBankScope } from "@/lib/banks";
import { useCategories } from "@/lib/categories";
import { mxn } from "@/lib/format";
import { dayLabel } from "@/lib/format";
import type { Workstation, WorkstationDraft, WorkstationRule } from "@/lib/workstations";

/**
 * Define a set by watching it form.
 *
 * The whole design of this sheet is step one: the user types what they want to
 * isolate — or picks a category — and the matching movements filter
 * **underneath them, as they choose**. A rule builder that only shows its
 * result after you apply it is a form; one that shows it while you write is a
 * search, and people are already fluent in search.
 *
 * Everything else — the amount bounds, the per-row exclusions — is refinement
 * on a set the user can already see.
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
    /** Prefills the needle when creating. Ignored when editing. */
    seed?: string;
    onSave: (draft: WorkstationDraft) => Promise<unknown>;
}) {
    const { bounds, dataVersion } = useAppData();
    const { statementIds } = useBankScope(dataVersion);
    const { items } = useTransactions(bounds, dataVersion, statementIds);
    const categories = useCategories();

    const [needle, setNeedle] = useState("");
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [min, setMin] = useState("");
    const [max, setMax] = useState("");
    const [excluded, setExcluded] = useState<Set<string>>(new Set());
    const [name, setName] = useState("");
    const [nameTouched, setNameTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    // Reset to the lens being edited (or to blank) each time the sheet opens,
    // so a cancelled edit never leaks into the next one.
    useEffect(() => {
        if (!open) return;
        setNeedle(existing?.rule.description_contains ?? seed);
        setCategoryId(existing?.rule.category_id ?? null);
        setMin(existing?.rule.amount_min ?? "");
        setMax(existing?.rule.amount_max ?? "");
        setExcluded(new Set(existing?.excluded_tx_ids ?? []));
        setName(existing?.name ?? capitalize(seed));
        setNameTouched(Boolean(existing));
        setSaving(false);
    }, [open, existing, seed]);

    // The preview runs client-side over the window's transactions rather than
    // round-tripping per keystroke. It mirrors the backend's `contains`
    // predicate — folded and lowercased on both sides — so what the user sees
    // here is what the saved rule will select.
    // A rule needs a subject: something typed, a category chosen, or both.
    // Amount bounds alone stay disabled — "everything between 10 and 300" is
    // not a set anyone means, and the backend rejects a rule with no anchor.
    const hasSubject = Boolean(needle.trim() || categoryId);

    const matches = useMemo(() => {
        if (!items || !(needle.trim() || categoryId)) return [];
        const q = fold(needle.trim());
        const lo = min.trim() ? Number(min) : null;
        const hi = max.trim() ? Number(max) : null;
        return items.filter((t) => {
            if (t.type !== "expense") return false;
            if (categoryId && t.category_id !== categoryId) return false;
            if (q && !fold(t.description).includes(q)) return false;
            if (lo !== null && t.amount < lo) return false;
            if (hi !== null && t.amount > hi) return false;
            return true;
        });
    }, [items, needle, categoryId, min, max]);

    const kept = matches.filter((t) => !excluded.has(t.id));
    const boundsInverted = Boolean(min.trim() && max.trim() && Number(min) > Number(max));
    const canSave = hasSubject && name.trim().length > 0 && !boundsInverted;

    /** The name that follows the rule until the user takes it over: the needle
     *  while there is one, else the chosen category's name. */
    function autoName(nextNeedle: string, nextCategoryId: string | null): string {
        if (nextNeedle.trim()) return capitalize(nextNeedle);
        if (nextCategoryId) return categories?.get(nextCategoryId)?.name ?? "";
        return "";
    }

    async function save() {
        const rule: WorkstationRule = {};
        if (needle.trim()) rule.description_contains = needle.trim();
        if (categoryId) rule.category_id = categoryId;
        if (min.trim()) rule.amount_min = min.trim();
        if (max.trim()) rule.amount_max = max.trim();

        setSaving(true);
        const result = await onSave({
            name: name.trim(),
            rule,
            // Only exclusions that still match: a row struck out under an old
            // needle is not an exception any more, and keeping it would slowly
            // fill the list with ids nothing refers to.
            excluded_tx_ids: matches.filter((t) => excluded.has(t.id)).map((t) => t.id),
        });
        setSaving(false);
        if (result) onClose();
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={existing ? "Editar análisis" : "Nuevo análisis"}
            description="Escribe o elige una categoría y mira cómo se forma el conjunto."
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
            <label className="block">
                <span className="text-label text-graphite">¿Qué quieres aislar?</span>
                <input
                    autoFocus
                    value={needle}
                    onChange={(e) => {
                        setNeedle(e.target.value);
                        // The name follows the search until the user takes it
                        // over. Naming a thing you just described is busywork.
                        if (!nameTouched) setName(autoName(e.target.value, categoryId));
                    }}
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
                        value={categoryId}
                        options={
                            categories
                                ? Array.from(categories.entries()).map(([id, c]) => ({
                                      value: id,
                                      label: c.name,
                                  }))
                                : []
                        }
                        placeholder="cualquiera"
                        onChange={(v) => {
                            setCategoryId(v);
                            if (!nameTouched) setName(autoName(needle, v));
                        }}
                        className="w-44"
                    />
                </div>
                <label className="flex flex-col gap-1.5">
                    <span className="text-label text-graphite">Monto desde</span>
                    <Bound value={min} onChange={setMin} placeholder="cualquiera" />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-label text-graphite">hasta</span>
                    <Bound value={max} onChange={setMax} placeholder="cualquiera" />
                </label>
            </div>
            {boundsInverted && (
                <p className="mt-2 text-body-sm text-negative">
                    El monto mínimo está por encima del máximo; ningún movimiento cabe ahí.
                </p>
            )}

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
                        {hasSubject ? countLabel(kept.length) : "Escribe o elige una categoría"}
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

                {items === null && (
                    <div className="mt-3 space-y-2">
                        {[0, 1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-9 w-full" />
                        ))}
                    </div>
                )}

                {items !== null && hasSubject && matches.length === 0 && (
                    <EmptyState icon={SearchX} title="Nada coincide">
                        {needle.trim() && !categoryId
                            ? `Ningún movimiento del periodo contiene «${needle.trim()}».`
                            : "Ningún movimiento del periodo cumple estas condiciones."}
                    </EmptyState>
                )}

                <ul className="mt-3 space-y-0.5">
                    {matches.map((t) => {
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

function countLabel(n: number): string {
    return n === 1 ? "1 movimiento" : `${n} movimientos`;
}

function capitalize(text: string): string {
    return text ? text[0].toUpperCase() + text.slice(1) : "";
}
