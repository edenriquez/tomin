"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { api, type Transaction, type TransactionPatch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { mxn2 } from "@/lib/format";
import { tagsApi, tagIndex, type Tag } from "@/lib/tags";
import { Button, Field, Input, Sheet, useToast } from "@/components/ui";
import { TagCombobox } from "./TagCombobox";

/**
 * The detail and edit surface for one movement.
 *
 * No autosave. A bank statement is a record, and a record that changes because
 * the cursor left a field is a record nobody can trust; every edit here is
 * explicit and lands on "Guardar".
 *
 * Two endpoints back one button — PATCH for the fields, PUT for the tags — and
 * only the halves that actually changed are sent. If the first succeeds and the
 * second fails, the toast says which one, because "no se guardo" over a
 * half-applied change is worse than no message at all.
 *
 * Mount this with `key={transaction.id}` so the draft state is rebuilt when the
 * user opens a different row.
 */
export function TransactionSheet({
    transaction,
    tags,
    categoryName,
    onCreateTag,
    onSaved,
    onClose,
}: {
    transaction: Transaction;
    tags: Tag[];
    /** Resolved by the caller, which is the only place holding the map. */
    categoryName: (categoryId: string | null) => string;
    onCreateTag: (name: string) => Promise<Tag | null>;
    /** Refetches the current page: the row on screen has to match what was saved. */
    onSaved: () => void;
    onClose: () => void;
}) {
    const { toast } = useToast();

    const [description, setDescription] = useState(transaction.description);
    const [notes, setNotes] = useState(transaction.notes ?? "");
    const [excluded, setExcluded] = useState(transaction.excluded_from_stats ?? false);
    const [tagIds, setTagIds] = useState<string[]>(transaction.tag_ids ?? []);
    const [saving, setSaving] = useState(false);

    const index = useMemo(() => tagIndex(tags), [tags]);
    const selected = useMemo(
        // A tag that is attached but missing from the list would silently drop
        // out of the set on save, so it is kept and shown by id.
        () => tagIds.map((id) => index.get(id) ?? { id, name: id, kind: "plain" as const }),
        [tagIds, index]
    );

    const originalTags = useMemo(
        () => [...(transaction.tag_ids ?? [])].sort().join(","),
        [transaction.tag_ids]
    );
    const tagsChanged = [...tagIds].sort().join(",") !== originalTags;

    const patch: TransactionPatch = {};
    if (description.trim() && description !== transaction.description) {
        patch.description = description.trim();
    }
    if ((notes.trim() || null) !== (transaction.notes ?? null)) {
        patch.notes = notes.trim() || null;
    }
    if (excluded !== (transaction.excluded_from_stats ?? false)) {
        patch.excluded_from_stats = excluded;
    }
    const fieldsChanged = Object.keys(patch).length > 0;
    const dirty = fieldsChanged || tagsChanged;

    const save = async () => {
        setSaving(true);
        try {
            if (fieldsChanged) await api.updateTransaction(transaction.id, patch);
        } catch (e) {
            setSaving(false);
            toast(`No se pudo guardar el movimiento: ${(e as Error).message}`, "negative");
            return;
        }
        try {
            if (tagsChanged) await tagsApi.setForTransaction(transaction.id, tagIds);
        } catch (e) {
            setSaving(false);
            onSaved();
            toast(`No se pudieron guardar las etiquetas: ${(e as Error).message}`, "negative");
            return;
        }
        setSaving(false);
        onSaved();
        toast("Movimiento actualizado.", "positive");
        onClose();
    };

    const signed = `${transaction.type === "income" ? "+" : "−"}${mxn2(Math.abs(transaction.amount))}`;

    return (
        <Sheet
            open
            onClose={onClose}
            title="Detalle del movimiento"
            description={transaction.date}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={() => void save()} loading={saving} disabled={!dirty}>
                        Guardar
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                <div>
                    <div
                        className={cn(
                            "tabular text-metric font-semibold",
                            transaction.type === "income" ? "text-positive" : "text-ink"
                        )}
                    >
                        {signed}
                    </div>
                    <p className="mt-1 text-body-sm text-pewter">
                        {categoryName(transaction.category_id)}
                        {transaction.category_source === "manual" && " · asignada por ti"}
                    </p>
                </div>

                <Field
                    label="Concepto"
                    hint="Lo que veras en la tabla. El texto original del banco se conserva."
                >
                    {(props) => (
                        <Input
                            {...props}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    )}
                </Field>

                {transaction.raw_description &&
                    transaction.raw_description !== transaction.description && (
                        <div>
                            <div className="mb-1 text-body-sm text-graphite">Texto del banco</div>
                            <p className="rounded-control bg-fog px-3 py-2 text-body-sm text-pewter">
                                {transaction.raw_description}
                            </p>
                        </div>
                    )}

                <Field label="Notas" hint="Para ti. No afecta ningun calculo.">
                    {(props) => (
                        <textarea
                            {...props}
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. cena de trabajo, se reembolsa"
                            className={cn(
                                "w-full rounded-control border border-mist bg-paper px-3 py-2",
                                "text-body-sm text-ink placeholder:text-steel"
                            )}
                        />
                    )}
                </Field>

                <div>
                    <div className="mb-2 text-body-sm text-graphite">Etiquetas</div>
                    {selected.length > 0 && (
                        <ul className="mb-2 flex flex-wrap gap-1.5">
                            {selected.map((tag) => (
                                <li key={tag.id}>
                                    <span className="inline-flex items-center gap-1 rounded-tag bg-fog py-0.5 pl-2 pr-1 text-label font-medium text-graphite">
                                        {tag.name}
                                        <button
                                            type="button"
                                            aria-label={`Quitar ${tag.name}`}
                                            onClick={() =>
                                                setTagIds((ids) =>
                                                    ids.filter((id) => id !== tag.id)
                                                )
                                            }
                                            className="rounded-tag p-0.5 text-pewter hover:bg-mist hover:text-ink"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <TagCombobox
                        tags={tags}
                        exclude={tagIds}
                        onPick={(tag) =>
                            setTagIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
                        }
                        onCreate={onCreateTag}
                    />
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={excluded}
                        onChange={(e) => setExcluded(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-ember"
                    />
                    <span className="min-w-0">
                        <span className="block text-body-sm text-ink">
                            Excluir de estadisticas
                        </span>
                        <span className="block text-label text-pewter">
                            Sigue en la lista, pero deja de contar en tus metricas. Para
                            traspasos entre tus propias cuentas.
                        </span>
                    </span>
                </label>
            </div>
        </Sheet>
    );
}
