"use client";

import { AppChrome } from "@/components/AppChrome";
import { FijosView } from "@/components/fijos/FijosView";

/**
 * Fijos — the committed run rate. Whole history on purpose: a subscription
 * doesn't care which window the dashboard is reading, and a filtered
 * detector would lose a series the moment the window narrows past its cadence.
 */
export default function FijosPage() {
    return (
        <AppChrome>
            <FijosView />
        </AppChrome>
    );
}
