"use client";

import { AppChrome } from "@/components/AppChrome";
import { CategoriasView } from "@/components/categorias/CategoriasView";

/**
 * The Categorías route — the period's spend, one group per category, with the
 * same window pills (shared `lastWindow`) as Movimientos.
 */
export default function CategoriasPage() {
    return (
        <AppChrome withWindow>
            <CategoriasView />
        </AppChrome>
    );
}
