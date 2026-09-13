"use client";

import { ChevronRight } from "lucide-react";
import type { Transaction } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { categoryName, rootCategoryId, useCategories } from "@/lib/categories";
import { dayLabel, mxn2 } from "@/lib/format";
import { parsePeriodKey } from "@/lib/metrics";
import {
    PREVIEW_CHARGES,
    barFill,
    pct,
    type CategorySlice,
} from "@/lib/categoryComposition";

/**
 * One row per category. Expanding shows the newest cargos as they are;
 * Ver más opens the modal already filtered to that category.
 */
export function CategoryAccordion({
    slices,
    barOrder,
    openKey,
    onToggle,
    onVerMas,
}: {
    slices: CategorySlice[];
    barOrder: CategorySlice[];
    openKey: string | null;
    onToggle: (key: string) => void;
    onVerMas: (key: string) => void;
}) {
    const rankOf = new Map(barOrder.map((s, i) => [s.key, i]));

    return (
        <ul className="divide-y divide-mist">
            {slices.map((s) => {
                const open = openKey === s.key;
                const rank = rankOf.get(s.key) ?? 0;
                const color = barFill(rank, s.uncategorized, open);
                return (
                    <li key={s.key} className={cn(open && "bg-wash/30")}>
                        <div className="flex min-h-14 items-center gap-3 px-5 py-3 sm:px-6">
                            <button
                                type="button"
                                aria-expanded={open}
                                onClick={() => onToggle(s.key)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                                <ChevronRight
                                    size={16}
                                    aria-hidden
                                    className={cn(
                                        "shrink-0 transition-transform duration-150",
                                        open ? "rotate-90 text-edge" : "text-ash"
                                    )}
                                />
                                <span
                                    aria-hidden
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ background: color }}
                                />
                                <span
                                    className={cn(
                                        "min-w-0 flex-1 truncate text-body font-medium",
                                        open ? "text-edge" : "text-ink"
                                    )}
                                >
                                    {s.name}
                                </span>
                            </button>

                            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                                {!s.uncategorized && (
                                    <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-fog sm:block">
                                        <span
                                            className="block h-full"
                                            style={{
                                                width: `${Math.max(pct(s.share), 2)}%`,
                                                background: color,
                                            }}
                                        />
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        "tabular w-8 text-right text-body-sm",
                                        open ? "font-medium text-edge" : "text-graphite"
                                    )}
                                >
                                    {s.uncategorized ? "—" : `${pct(s.share)}%`}
                                </span>
                            </div>
                        </div>

                        {open && (
                            <div className="border-t border-mist bg-paper">
                                {s.preview.length === 0 ? (
                                    <p className="px-5 py-4 text-body-sm text-graphite sm:px-6">
                                        Sin cargos en este grupo.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-mist">
                                        {s.preview.map((t) => (
                                            <ChargeRow key={t.id} t={t} />
                                        ))}
                                    </ul>
                                )}
                                <div className="flex justify-end border-t border-mist px-5 py-2.5 sm:px-6">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onVerMas(s.key)}
                                    >
                                        {s.count > PREVIEW_CHARGES
                                            ? `Ver más · ${(s.count - PREVIEW_CHARGES).toLocaleString("es-MX")} más`
                                            : "Ver en transacciones"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

function ChargeRow({ t }: { t: Transaction }) {
    const map = useCategories();
    const root = rootCategoryId(map, t.category_id);
    const leaf =
        t.category_id && root && t.category_id !== root
            ? categoryName(map, t.category_id)
            : null;
    const d = parsePeriodKey(t.date);
    const signed = t.type === "income" ? t.amount : -t.amount;
    return (
        <li className="flex items-baseline justify-between gap-3 px-5 py-2.5 sm:px-6 sm:pl-14">
            <span className="min-w-0">
                <span className="block truncate text-body-sm text-ink">{t.description}</span>
                <span className="text-label text-graphite">
                    {d ? dayLabel(d) : t.date}
                    {leaf ? ` · ${leaf}` : ""}
                </span>
            </span>
            <span
                className={cn(
                    "tabular shrink-0 text-body-sm",
                    t.type === "income" ? "text-positive" : "text-ink"
                )}
            >
                {t.type === "income" ? "+" : "−"}
                {mxn2(Math.abs(signed))}
            </span>
        </li>
    );
}
