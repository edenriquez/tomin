"use client";

import { useState } from "react";
import { SearchInput } from "@/components/ui";
import { PriceChat, type Turn } from "./PriceChat";
import { ReceiptGroups } from "./ReceiptGroups";

/**
 * The Precios view: your tickets, one basket at a time.
 *
 * A statement can only ever say `SORIANA HIPER 4062 · $1,412.60`. This view is
 * the other half of that charge — the basket behind it — and the only question
 * it exists to answer is the one a statement structurally cannot: *what did I
 * actually buy, and at what price?*
 *
 * Every figure here is a price the user paid, read off a ticket they
 * photographed. Nothing is fetched from a store, nothing is estimated. That is
 * a limitation and it is also the point: the row says "$28.50 · Soriana ·
 * 12 ago", and all three of those are checkable against a piece of paper.
 *
 * The screen is one list, collapsed. A ticket is the unit a person remembers —
 * "el súper del martes" — so it is the unit the screen is made of, and opening
 * one is a deliberate act rather than the default state of twenty.
 */
export function PreciosView() {
    const [query, setQuery] = useState("");
    // Held here rather than inside the band so the transcript survives a
    // re-render of the list underneath it. Every ticket's chat is kept the same
    // way, in `ReceiptGroups`.
    const [turns, setTurns] = useState<Turn[]>([]);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-title-sm font-normal text-ink">
                        Precios de tus tickets
                    </h2>
                    <SearchInput
                        onSearch={setQuery}
                        placeholder="Buscar tienda o producto"
                        aria-label="Buscar tienda o producto"
                    />
                </div>

                <ReceiptGroups query={query} />
            </div>

            {/* The cross-ticket question — "¿dónde me sale más barata la leche?"
                — has no ticket to be asked from, so it keeps its own band below
                the list. Each ticket's chat answers only about that ticket. */}
            <PriceChat turns={turns} onTurns={setTurns} />
        </div>
    );
}
