"use client";

import { AppChrome } from "@/components/AppChrome";
import { PagosView } from "@/components/pagos/PagosView";

/**
 * Pagos — the calendar of what is about to be charged. Its own room, not a
 * face of Recurrentes: Recurrentes is where you decide which series count,
 * this is where you read when they land. Whole history, like Plan: a payment
 * due on Friday does not care which window the dashboard is reading.
 */
export default function PagosPage() {
    return (
        <AppChrome>
            <PagosView />
        </AppChrome>
    );
}
