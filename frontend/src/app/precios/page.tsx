"use client";

import { AppChrome } from "@/components/AppChrome";
import { PreciosView } from "@/components/precios/PreciosView";

/**
 * The Precios route — what the tickets you photographed say things cost.
 *
 * No window pills, for the same reason Fijos has none: a price history
 * is about the *same product over time*, and a window that hid last quarter's
 * cheaper purchase would remove exactly the comparison the page exists for.
 */
export default function PreciosPage() {
    return (
        <AppChrome>
            <PreciosView />
        </AppChrome>
    );
}
