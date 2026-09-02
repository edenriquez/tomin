/**
 * Fake-but-plausible data for /dev/lecturas. Deterministic (seeded PRNG) so a
 * screenshot today matches a screenshot tomorrow. Same figures as the landing:
 * 214 movements, OXXO at 3.2×, one double Uber, one new merchant.
 */
import type { Transaction } from "@/lib/api";
import type { CategoryInfo } from "@/lib/categories";
import { chart } from "@/design/tokens";

function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** The ledger's "today" — fixed so upcoming charges stay upcoming. */
export const TODAY = new Date(2026, 7, 28); // 28 ago 2026

export const CATEGORIES = new Map<string, CategoryInfo>([
    ["super", { name: "Súper", color: chart.neutral[1]!, icon: null }],
    ["comida", { name: "Comida fuera", color: chart.neutral[3]!, icon: null }],
    ["transporte", { name: "Transporte", color: chart.neutral[4]!, icon: null }],
    ["servicios", { name: "Servicios", color: chart.signalTint[1]!, icon: null }],
    ["compras", { name: "Compras", color: chart.neutral[5]!, icon: null }],
]);

type Merchant = { name: string; cat: string; lo: number; hi: number; perWeek: number };
const MERCHANTS: Merchant[] = [
    { name: "OXXO", cat: "comida", lo: 38, hi: 160, perWeek: 3 },
    { name: "Soriana", cat: "super", lo: 420, hi: 1400, perWeek: 1 },
    { name: "Uber", cat: "transporte", lo: 62, hi: 210, perWeek: 2.5 },
    { name: "Rappi", cat: "comida", lo: 180, hi: 420, perWeek: 1.5 },
    { name: "Starbucks", cat: "comida", lo: 68, hi: 145, perWeek: 2 },
    { name: "Chedraui", cat: "super", lo: 300, hi: 900, perWeek: 0.5 },
    { name: "Amazon", cat: "compras", lo: 199, hi: 1290, perWeek: 0.6 },
    { name: "Didi", cat: "transporte", lo: 55, hi: 180, perWeek: 1 },
];

export type Attention = {
    tx_id: string;
    kind: "unusual_amount" | "possible_duplicate" | "new_merchant";
    ratio: number | null;
    reason: string;
    related: string[];
};

/** ~214 expenses over 90 days, plus three planted lecturas. */
export function makeTransactions(): { transactions: Transaction[]; attention: Attention[] } {
    const rand = rng(7);
    const start = addDays(TODAY, -89);
    const out: Transaction[] = [];
    let n = 0;
    const tx = (date: Date, m: Merchant, amount: number, id?: string): Transaction => ({
        id: id ?? `t${++n}`,
        date: iso(date),
        description: m.name,
        amount: Math.round(amount * 100) / 100,
        currency: "MXN",
        type: "expense",
        status: "completed",
        category_id: m.cat,
    });
    for (let day = 0; day < 90; day++) {
        const d = addDays(start, day);
        for (const m of MERCHANTS) {
            if (rand() < m.perWeek / 7) out.push(tx(d, m, m.lo + rand() * (m.hi - m.lo)));
        }
    }
    // Payday, twice a month.
    for (const day of [1, 16, 31, 46, 61, 76]) {
        const d = addDays(start, day);
        out.push({ ...tx(d, MERCHANTS[0]!, 14_200), description: "Nómina", type: "income", category_id: null });
    }
    // Planted: OXXO at 3.2× its median; an Uber charged twice; a new merchant.
    const oxxo = MERCHANTS[0]!;
    const oxxoMedian = 92;
    const outlier = tx(addDays(TODAY, -9), oxxo, oxxoMedian * 3.2, "t-oxxo");
    const uberA = tx(addDays(TODAY, -4), MERCHANTS[2]!, 187.5, "t-uber-a");
    const uberB = tx(addDays(TODAY, -2), MERCHANTS[2]!, 187.5, "t-uber-b");
    const liverpool: Transaction = {
        ...tx(addDays(TODAY, -15), { name: "Liverpool", cat: "compras", lo: 0, hi: 0, perWeek: 0 }, 4_890, "t-liverpool"),
    };
    out.push(outlier, uberA, uberB, liverpool);
    out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return {
        transactions: out,
        attention: [
            { tx_id: "t-oxxo", kind: "unusual_amount", ratio: 3.2, reason: "3.2× lo que sueles gastar ahí", related: [] },
            { tx_id: "t-uber-b", kind: "possible_duplicate", ratio: null, reason: "Mismo monto que el cargo de hace 2 días", related: ["t-uber-a"] },
            { tx_id: "t-liverpool", kind: "new_merchant", ratio: null, reason: "Primera vez en tu historial, y arriba de tu gasto típico", related: [] },
        ],
    };
}
