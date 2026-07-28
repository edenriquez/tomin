"use client";

import { useState } from "react";
import { Tags, X } from "lucide-react";
import { tagsApi, type Tag } from "@/lib/tags";
import { Button, useToast } from "@/components/ui";
import { TagCombobox } from "./TagCombobox";

/**
 * The selection bar. Appears only with a selection, and does exactly one
 * thing: add a tag to everything selected.
 *
 * Additive, never a replacement — "etiquetar estos 30 movimientos como viaje"
 * must not quietly strip the other tags they already carry. Bulk *removal* is
 * deliberately absent: it is the destructive half, and it belongs behind a
 * confirmation this bar does not have yet.
 */
export function BulkTagBar({
    count,
    transactionIds,
    tags,
    onCreateTag,
    onDone,
    onClear,
}: {
    count: number;
    transactionIds: string[];
    tags: Tag[];
    onCreateTag: (name: string) => Promise<Tag | null>;
    /** Refetches the page so the new chips show up on the rows. */
    onDone: () => void;
    onClear: () => void;
}) {
    const { toast } = useToast();
    const [picking, setPicking] = useState(false);
    const [working, setWorking] = useState(false);

    const attach = async (tag: Tag) => {
        setWorking(true);
        try {
            await tagsApi.attachTransactions(tag.id, transactionIds);
            toast(
                count === 1
                    ? `1 movimiento etiquetado como "${tag.name}".`
                    : `${count} movimientos etiquetados como "${tag.name}".`,
                "positive"
            );
            setPicking(false);
            onClear();
            onDone();
        } catch (e) {
            toast(`No se pudo etiquetar: ${(e as Error).message}`, "negative");
        } finally {
            setWorking(false);
        }
    };

    return (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-control border border-mist bg-fog px-3 py-2">
            <span className="text-body-sm font-medium text-ink">
                {count === 1 ? "1 seleccionado" : `${count} seleccionados`}
            </span>

            {picking ? (
                <TagCombobox
                    className="min-w-[14rem] flex-1"
                    tags={tags}
                    disabled={working}
                    onPick={(tag) => void attach(tag)}
                    onCreate={onCreateTag}
                    placeholder="Elige o crea una etiqueta..."
                />
            ) : (
                <Button
                    size="sm"
                    variant="secondary"
                    icon={<Tags size={14} />}
                    onClick={() => setPicking(true)}
                >
                    Etiquetar
                </Button>
            )}

            <button
                type="button"
                onClick={() => {
                    setPicking(false);
                    onClear();
                }}
                className="ml-auto inline-flex items-center gap-1 rounded-control px-2 py-1 text-body-sm text-graphite hover:bg-mist hover:text-ink"
            >
                <X size={14} aria-hidden />
                Cancelar
            </button>
        </div>
    );
}
