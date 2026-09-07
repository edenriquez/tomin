"use client";

import { useCallback, useEffect, useState } from "react";
import {
    workstationsApi,
    type Workstation,
    type WorkstationDraft,
    type WorkstationPatch,
} from "@/lib/workstations";
import { useToast } from "@/components/ui";
import { track } from "@/lib/telemetry";

/**
 * The user's lenses, loaded once per mount and mutated optimistically.
 *
 * `null` while in flight, `[]` once we know there are none — the distinction is
 * the whole reason the empty state can be trusted. A `[]` placeholder during
 * loading would flash "no tienes analisis" at someone who has six.
 */
export function useWorkstations() {
    const { toast } = useToast();
    const [items, setItems] = useState<Workstation[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stale = false;
        workstationsApi
            .list()
            .then((page) => {
                if (stale) return;
                setItems(page.items);
                setError(null);
            })
            .catch((e) => {
                if (stale) return;
                setError((e as Error).message);
                setItems([]);
            });
        return () => {
            stale = true;
        };
    }, []);

    const create = useCallback(
        async (draft: WorkstationDraft): Promise<Workstation | null> => {
            try {
                const created = await workstationsApi.create(draft);
                track("workspace.create", {
                    clauses: draft.rule.any_of?.length ?? 1,
                    excluded: draft.excluded_tx_ids?.length ?? 0,
                });
                // Prepended, matching the server's newest-first order, so the
                // one you just made is where you are already looking.
                setItems((cur) => [created, ...(cur ?? [])]);
                return created;
            } catch (e) {
                toast(`No se pudo crear la lectura: ${(e as Error).message}`, "negative");
                return null;
            }
        },
        [toast]
    );

    const update = useCallback(
        async (id: string, patch: WorkstationPatch): Promise<Workstation | null> => {
            try {
                const saved = await workstationsApi.update(id, patch);
                setItems((cur) => cur?.map((w) => (w.id === id ? saved : w)) ?? cur);
                return saved;
            } catch (e) {
                toast(`No se pudo guardar: ${(e as Error).message}`, "negative");
                return null;
            }
        },
        [toast]
    );

    const remove = useCallback(
        async (id: string): Promise<boolean> => {
            // Optimistic, with the row kept aside: deleting a lens is instant
            // and reversible-looking, and the failure path puts it back exactly
            // where it was rather than at the top.
            let removed: { item: Workstation; index: number } | undefined;
            setItems((cur) => {
                if (!cur) return cur;
                const index = cur.findIndex((w) => w.id === id);
                if (index >= 0) removed = { item: cur[index], index };
                return cur.filter((w) => w.id !== id);
            });
            try {
                await workstationsApi.remove(id);
                return true;
            } catch (e) {
                setItems((cur) => {
                    if (!cur || !removed) return cur;
                    const restored = [...cur];
                    restored.splice(removed.index, 0, removed.item);
                    return restored;
                });
                toast(`No se pudo eliminar: ${(e as Error).message}`, "negative");
                return false;
            }
        },
        [toast]
    );

    return { items, error, create, update, remove };
}
