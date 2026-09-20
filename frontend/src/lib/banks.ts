"use client";

import { useEffect, useMemo, useState } from "react";
import { ACCOUNT_KINDS, api, KIND_LABELS, type AccountKind, type Statement } from "./api";
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

/**
 * Every statement the user has, from the same cache the scope reads. For the
 * views that read a statement's own figures (the card payment in Pagos) rather
 * than the movements under it. `null` until the first answer arrives.
 */
export function useStatements(dataVersion = 0): Statement[] | null {
    const [statements, setStatements] = useState<Statement[] | null>(cache);

    useEffect(() => {
        let alive = true;
        if (dataVersion > 0) invalidateBanks();
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
    }, [dataVersion]);

    return statements;
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

const SIN_TIPO = "Sin tipo";

/** The key under which a whole bank is selected: its own name. One account
 *  inside it gets `bank::kind`. Keys are never parsed back apart — a
 *  statement computes both of its keys and asks the selection whether it
 *  holds either — so a bank whose name contains the separator is harmless. */
export function accountKey(bank: string, kind: AccountKind | null): string {
    return `${bank}::${kind ?? "none"}`;
}

/** One account inside a bank: every statement the user labelled the same way.
 *  Statements with no label collapse into a single "Sin tipo" account, so an
 *  unlabelled bank still resolves to exactly one account and shows no choice. */
export type BankAccount = {
    key: string;
    kind: AccountKind | null;
    /** "Crédito", "Débito", … or "Sin tipo". */
    label: string;
};

/** A bank and the accounts found under it. `accounts` has one entry when the
 *  bank is undivided; the filter only opens a sublist past that. */
export type BankNode = {
    /** The bank name, which is also its scope key. */
    bank: string;
    accounts: BankAccount[];
};

/**
 * Statement id -> bank name, for rows that want to say which account they came
 * from. One shared fetch behind the same cache the scope uses; a row that
 * arrives before the statements do simply says nothing.
 */
export function useStatementBanks(): Map<string, string> {
    const [statements, setStatements] = useState<Statement[] | null>(cache);

    useEffect(() => {
        let alive = true;
        fetchStatements()
            .then((items) => alive && setStatements(items))
            .catch(() => alive && setStatements([]));
        return () => {
            alive = false;
        };
    }, []);

    return useMemo(() => {
        const out = new Map<string, string>();
        for (const s of statements ?? []) if (s.bank) out.set(s.id, s.bank);
        return out;
    }, [statements]);
}

export type BankScope = {
    /** Banks with statements, "Sin banco" last, each with its accounts. */
    nodes: BankNode[];
    /** The user's selection as scope keys — a bank name for a whole bank, an
     *  account key for one kind inside it. Pruned to what exists; empty =
     *  todas. Old stores hold bank names only, which still read correctly. */
    selected: string[];
    /** What the selection is called, for the eyebrows that name the scope. */
    labels: string[];
    setSelected: (keys: string[]) => void;
    /** Statement ids the current scope covers, or null for "no filter". */
    statementIds: string[] | null;
    loading: boolean;
};

/** Is this bank selected whole — either by its own key, or because every one
 *  of its accounts is checked? */
export function bankIsOn(selected: string[], node: BankNode): boolean {
    if (selected.includes(node.bank)) return true;
    return node.accounts.length > 0 && node.accounts.every((a) => selected.includes(a.key));
}

export function accountIsOn(
    selected: string[],
    node: BankNode,
    account: BankAccount
): boolean {
    return selected.includes(node.bank) || selected.includes(account.key);
}

/** Toggle a whole bank: on means its own key, with the account keys dropped
 *  as redundant. */
export function toggleBank(selected: string[], node: BankNode): string[] {
    const mine = new Set([node.bank, ...node.accounts.map((a) => a.key)]);
    const rest = selected.filter((k) => !mine.has(k));
    return bankIsOn(selected, node) ? rest : [...rest, node.bank];
}

/**
 * Toggle one account. Unchecking an account of a bank held whole expands that
 * bank into its remaining accounts, so "Banamex sin crédito" is expressible;
 * checking the last missing one collapses back to the bank.
 */
export function toggleAccount(
    selected: string[],
    node: BankNode,
    account: BankAccount
): string[] {
    const mine = new Set([node.bank, ...node.accounts.map((a) => a.key)]);
    const rest = selected.filter((k) => !mine.has(k));
    const on = new Set(
        selected.includes(node.bank)
            ? node.accounts.map((a) => a.key)
            : node.accounts.filter((a) => selected.includes(a.key)).map((a) => a.key)
    );

    if (on.has(account.key)) on.delete(account.key);
    else on.add(account.key);

    if (on.size === 0) return rest;
    if (on.size === node.accounts.length) return [...rest, node.bank];
    return [...rest, ...node.accounts.filter((a) => on.has(a.key)).map((a) => a.key)];
}

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

    const nodes = useMemo(() => {
        // bank -> the kinds seen under it, in the order the enum declares them
        // so Débito and Crédito never trade places between renders.
        const byBank = new Map<string, Set<AccountKind | null>>();
        for (const s of statements ?? []) {
            const bank = s.bank ?? SIN_BANCO;
            const kinds = byBank.get(bank) ?? new Set<AccountKind | null>();
            kinds.add(s.account_kind ?? null);
            byBank.set(bank, kinds);
        }
        const names = Array.from(byBank.keys())
            .filter((b) => b !== SIN_BANCO)
            .sort((a, b) => a.localeCompare(b, "es"));
        if (byBank.has(SIN_BANCO)) names.push(SIN_BANCO);

        return names.map<BankNode>((bank) => {
            const kinds = byBank.get(bank)!;
            const ordered: (AccountKind | null)[] = ACCOUNT_KINDS.filter((k) => kinds.has(k));
            if (kinds.has(null)) ordered.push(null);
            return {
                bank,
                accounts: ordered.map((kind) => ({
                    key: accountKey(bank, kind),
                    kind,
                    label: kind ? KIND_LABELS[kind] : SIN_TIPO,
                })),
            };
        });
    }, [statements]);

    // Prune the stored selection to keys that still exist: a selection that
    // matches nothing must read as "todas", not as an empty app.
    const selected = useMemo(() => {
        const valid = new Set<string>();
        for (const node of nodes) {
            valid.add(node.bank);
            for (const a of node.accounts) valid.add(a.key);
        }
        return settings.banks.filter((b) => valid.has(b));
    }, [settings.banks, nodes]);

    const labels = useMemo(() => {
        const out: string[] = [];
        for (const node of nodes) {
            if (bankIsOn(selected, node)) {
                out.push(node.bank);
                continue;
            }
            for (const a of node.accounts) {
                if (selected.includes(a.key)) out.push(`${node.bank} ${a.label}`);
            }
        }
        return out;
    }, [selected, nodes]);

    const statementIds = useMemo(() => {
        if (!selected.length || !statements) return null;
        const keys = new Set(selected);
        const ids = statements
            .filter((s) => {
                const bank = s.bank ?? SIN_BANCO;
                return keys.has(bank) || keys.has(accountKey(bank, s.account_kind ?? null));
            })
            .map((s) => s.id);
        return ids.length ? ids : null;
    }, [selected, statements]);

    return {
        nodes,
        selected,
        labels,
        setSelected: (banks) => update((prev) => ({ ...prev, banks })),
        statementIds,
        loading: statements === null,
    };
}
