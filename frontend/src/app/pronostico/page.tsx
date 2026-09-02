"use client";

import { AppChrome } from "@/components/AppChrome";
import { PronosticoView } from "@/components/pronostico/PronosticoView";

/**
 * Pronóstico — labeled income against the fijos need. Whole history on
 * purpose: a quincena doesn't care which window the dashboard is reading.
 */
export default function PronosticoPage() {
    return (
        <AppChrome>
            <PronosticoView />
        </AppChrome>
    );
}
