"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Statement } from "./api";
import { useSettings } from "@/components/settings/SettingsProvider";

/**
 * The bank scope: which statements the whole app is reading through.
 *
 * The user picks bank *names*; every API speaks statement *ids* — ids are
 * immutable while the bank label is user-editable, so a rename in Documentos
 * must not strand old facts. This module owns that translation and nothing
 * else does.
 */

let cache: Statement[] | null = null;
let inflight: Promise<Statement[]> | null = null;

async function fetchStatements(): Promise<Statement[]> {
    inflight ??= api
        .statements()
        .then((res) => {
            cache = res.items;
            return res.items;
        })
        .finally(() => {
            inflight = null;
        });
    return inflight;
}

/** New uploads add statements; the next hook mount must see them. */
export function invalidateBanks(): void {
    cache = null;
}

const SIN_BANCO = "Sin banco";

export type BankScope = {
    /** Distinct bank names with statements, "Sin banco" last when present. */
    available: string[];
    /** The user's selection, pruned to what exists. Empty = todas. */
    selected: string[];
    setSelected: (banks: string[]) => void;
    /** Statement ids the current scope covers, or null for "no filter". */
    statementIds: string[] | null;
    loading: boolean;
};

export function useBankScope(dataVersion = 0): BankScope {
    const { settings, update } = useSettings();
    const [statements, setStatements] = useState<Statement[] | null>(cache);

    useEffect(() => {
        let alive = true;
        if (dataVersion > 0) invalidateBanks();
        fetchStatements()
            .then((items) => {
                if (alive) setStatements(items);
            })
            .catch(() => {
                // Unreachable backend: the views show their own errors; the
                // filter just offers nothing.
                if (alive) setStatements([]);
            });
        return () => {
            alive = false;
        };
    }, [dataVersion]);

    const available = useMemo(() => {
        const names = new Set<string>();
        let unnamed = false;
        for (const s of statements ?? []) {
            if (s.bank) names.add(s.bank);
            else unnamed = true;
        }
        const out = Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
        if (unnamed) out.push(SIN_BANCO);
        return out;
    }, [statements]);

    // Prune the stored selection to banks that still exist: a selection that
    // matches nothing must read as "todas", not as an empty app.
    const selected = useMemo(
        () => settings.banks.filter((b) => available.includes(b)),
        [settings.banks, available]
    );

    const statementIds = useMemo(() => {
        if (!selected.length || !statements) return null;
        const ids = statements
            .filter((s) => (s.bank ? selected.includes(s.bank) : selected.includes(SIN_BANCO)))
            .map((s) => s.id);
        return ids.length ? ids : null;
    }, [selected, statements]);

    return {
        available,
        selected,
        setSelected: (banks) => update((prev) => ({ ...prev, banks })),
        statementIds,
        loading: statements === null,
    };
}
