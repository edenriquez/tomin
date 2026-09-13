"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Statement } from "./api";
import { useSettings } from "@/components/settings/SettingsProvider";
import { matchMerchant } from "./merchants";

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

/** Known bank names → a file in /public/logos. A bank we have not drawn
 *  stays a monogram: a wrong logo is worse than letters. */
const BANK_LOGOS: { match: string; slug: string }[] = [
    { match: "azteca", slug: "banco-azteca" },
];

export function bankLogoSlug(bank: string | null): string | null {
    if (!bank) return null;
    const folded = bank
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    for (const row of BANK_LOGOS) {
        if (folded.includes(row.match)) return row.slug;
    }
    return matchMerchant(bank);
}

/** Two letters when we have no PNG. Known names are explicit so Banamex
 *  and Banco Azteca do not both collapse to "BA". */
const BANK_MONOGRAMS: Record<string, string> = {
    nu: "NU",
    banamex: "BX",
    citibanamex: "BX",
    bbva: "BB",
    santander: "SA",
    banorte: "BN",
    hsbc: "HS",
    scotiabank: "SC",
    banregio: "BR",
    "banco azteca": "AZ",
    "hey banco": "HY",
};

export function bankMonogram(bank: string | null): string | null {
    if (!bank) return null;
    const folded = bank
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    if (BANK_MONOGRAMS[folded]) return BANK_MONOGRAMS[folded];
    const letters = bank.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim();
    if (!letters) return null;
    const words = letters.split(/\s+/);
    return (words.length > 1 ? words[0][0] + words[1][0] : letters.slice(0, 2)).toUpperCase();
}

export function useStatement(id: string | null | undefined): Statement | null {
    const [statements, setStatements] = useState<Statement[] | null>(cache);

    useEffect(() => {
        if (!id) return;
        let alive = true;
        fetchStatements()
            .then((items) => {
                if (alive) setStatements(items);
            })
            .catch(() => {
                if (alive) setStatements([]);
            });
        return () => {
            alive = false;
        };
    }, [id]);

    if (!id || !statements) return null;
    return statements.find((s) => s.id === id) ?? null;
}

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
