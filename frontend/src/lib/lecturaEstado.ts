/**
 * The Lectura face: the last months of cargos read the way an analyst would —
 * against the country (ENIGH), against the user's income, against the
 * calendar, and by how necessary each peso was.
 *
 * Pure: no React, no fetching. The face hands in the same span Por mes reads
 * (six calendar months ending on the newest movement) and gets back every
 * number its eight cards draw. What a card *says* is decided here too, so the
 * sentence and the chart can never disagree.
 *
 * Not to be confused with `lib/lectura.ts`, which is the saved-rule workstation.
 */

import type { Transaction } from "./api";
import {
    categoryName,
    isUncategorizedId,
    rootCategoryId,
    type CategoryInfo,
} from "./categories";
import { monthKeyOf, type MonthKey } from "./porMes";

export type Tier = "primera" | "segunda" | "tercera" | "deuda" | "sin";

export const TIER_ORDER: Tier[] = ["primera", "segunda", "tercera", "deuda", "sin"];

export const TIER_LABELS: Record<Tier, string> = {
    primera: "Primera necesidad",
    segunda: "Segunda necesidad",
    tercera: "Tercera necesidad",
    deuda: "Costo de deuda",
    sin: "Sin clasificar",
};

/**
 * The default level of each category, by name. A name the table does not know
 * falls back to its root's level, and then to "sin clasificar" — Tomin does
 * not guess whether a category it has never seen is necessary.
 */
const TIER_BY_NAME: Record<string, Tier> = {
    "vivienda & servicios": "primera",
    luz: "primera",
    agua: "primera",
    renta: "primera",
    "internet y tv": "primera",
    gas: "primera",
    "comida & supermercados": "primera",
    supermercado: "primera",
    transporte: "primera",
    gasolina: "primera",
    pasajes: "primera",
    "saldo celular": "primera",
    prepago: "primera",
    colegiatura: "primera",
    seguro: "primera",
    impuestos: "primera",
    salud: "primera",
    farmacia: "primera",
    "mercado libre": "segunda",
    ropa: "segunda",
    gym: "segunda",
    conveniencia: "segunda",
    caseta: "segunda",
    restaurantes: "segunda",
    apps: "segunda",
    entretenimiento: "tercera",
    streaming: "tercera",
    cine: "tercera",
    "comisiones e intereses": "deuda",
};

function norm(name: string): string {
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function tierOf(categories: Map<string, CategoryInfo> | null, categoryId: string | null): Tier {
    if (isUncategorizedId(categories, categoryId)) return "sin";
    const own = TIER_BY_NAME[norm(categoryName(categories, categoryId))];
    if (own) return own;
    const root = rootCategoryId(categories, categoryId);
    if (root && root !== categoryId) {
        const up = TIER_BY_NAME[norm(categoryName(categories, root))];
        if (up) return up;
    }
    return "sin";
}

/** Hours in a working month: ~44 h a week × 4.33 weeks. */
export const HOURS_PER_MONTH = 190.5;

export type Leaf = { name: string; amount: number; count: number; tier: Tier };

export type TierSlice = {
    tier: Tier;
    amount: number;
    count: number;
    share: number;
    leaves: Leaf[];
};

export type EstadoReading = {
    /** Every month of the span, oldest first. */
    months: { key: MonthKey; amount: number; count: number; segunda: number }[];
    total: number;
    count: number;
    /** Mean over the months that hold cargos — an empty month is missing data. */
    average: number;
    /** Index 0 is day 1. */
    byDay: number[];
    /** Monday first. */
    byWeekday: { amount: number; count: number }[];
    tiers: TierSlice[];
    /** Every named category, biggest first. */
    leaves: Leaf[];
};

const spendable = (t: Transaction) =>
    t.type === "expense" && !t.is_transfer && !t.excluded_from_stats;

export function readEstado(
    items: Transaction[],
    categories: Map<string, CategoryInfo> | null,
    keys: MonthKey[]
): EstadoReading {
    const inSpan = new Set(keys);
    const months = new Map(keys.map((k) => [k, { key: k, amount: 0, count: 0, segunda: 0 }]));
    const byDay = Array.from({ length: 31 }, () => 0);
    const byWeekday = Array.from({ length: 7 }, () => ({ amount: 0, count: 0 }));
    const leafMap = new Map<string, Leaf>();
    let total = 0;
    let count = 0;

    for (const t of items) {
        if (!spendable(t)) continue;
        const key = monthKeyOf(t.date);
        if (!inSpan.has(key)) continue;
        const amount = Math.abs(t.amount);
        const tier = tierOf(categories, t.category_id);
        const name = tier === "sin" && isUncategorizedId(categories, t.category_id)
            ? "Sin categoría"
            : categoryName(categories, t.category_id);

        total += amount;
        count += 1;
        const m = months.get(key)!;
        m.amount += amount;
        m.count += 1;
        if (tier === "segunda") m.segunda += amount;

        const [y, mo, d] = t.date.split("-").map(Number);
        byDay[(d ?? 1) - 1]! += amount;
        const wd = (new Date(y!, (mo ?? 1) - 1, d ?? 1).getDay() + 6) % 7;
        byWeekday[wd]!.amount += amount;
        byWeekday[wd]!.count += 1;

        const leafKey = `${tier}|${name}`;
        const leaf = leafMap.get(leafKey) ?? { name, amount: 0, count: 0, tier };
        leaf.amount += amount;
        leaf.count += 1;
        leafMap.set(leafKey, leaf);
    }

    const leaves = Array.from(leafMap.values()).sort((a, b) => b.amount - a.amount);
    const tiers = TIER_ORDER.map((tier) => {
        const own = leaves.filter((l) => l.tier === tier);
        const amount = own.reduce((s, l) => s + l.amount, 0);
        return {
            tier,
            amount,
            count: own.reduce((s, l) => s + l.count, 0),
            share: total > 0 ? amount / total : 0,
            leaves: own,
        };
    });
    const monthList = keys.map((k) => months.get(k)!);
    const held = monthList.filter((m) => m.count > 0);

    return {
        months: monthList,
        total,
        count,
        average: held.length ? total / held.length : 0,
        byDay,
        byWeekday,
        tiers,
        leaves: leaves.filter((l) => l.name !== "Sin categoría"),
    };
}

/** Días 1–10, 11–20, 21–31: each stretch's share of the span's cargos. */
export function stretches(byDay: number[]): [number, number, number] {
    const sum = (a: number, b: number) => byDay.slice(a, b).reduce((s, v) => s + v, 0);
    const all = sum(0, 31) || 1;
    return [sum(0, 10) / all, sum(10, 20) / all, sum(20, 31) / all];
}

/** Share of the cargos that landed on a Saturday or Sunday. */
export function weekendShare(byWeekday: { amount: number }[]): number {
    const all = byWeekday.reduce((s, d) => s + d.amount, 0) || 1;
    return (byWeekday[5]!.amount + byWeekday[6]!.amount) / all;
}

/**
 * Money out against money in over the months that hold cargos: the factor
 * (pesos out per peso in) and the running gap, positive when it fell short.
 */
export function balanceAgainst(reading: EstadoReading, income: number) {
    const held = reading.months.filter((m) => m.count > 0);
    const gap = held.reduce((s, m) => s + (m.amount - income), 0);
    return {
        factor: income > 0 ? reading.average / income : 0,
        gap,
        over: held.filter((m) => m.amount > income).length,
        months: held.length,
    };
}

/** "el doble", "casi el triple"… — how a ratio sounds said out loud. */
export function ratioWords(ratio: number): string {
    if (ratio >= 2.8) return `${ratio.toFixed(1)} veces lo que ganas`;
    if (ratio >= 2.4) return "casi el triple";
    if (ratio >= 1.8) return "el doble";
    if (ratio >= 1.4) return "la mitad más";
    return "un poco más";
}

/** "se duplicó", "se triplicó" — only for a change worth naming. */
export function growthWords(ratio: number): string | null {
    if (ratio >= 3.5) return `se multiplicó por ${Math.round(ratio)}`;
    if (ratio >= 2.6) return "se triplicó";
    if (ratio >= 1.8) return "se duplicó";
    return null;
}
