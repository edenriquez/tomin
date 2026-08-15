"use client";

import { AppChrome } from "@/components/AppChrome";
import { RecurrentesView } from "@/components/recurrentes/RecurrentesView";

/**
 * The Recurrentes route — recurring charges detected over the whole history.
 * No window pills on purpose: a subscription doesn't care which period the
 * dashboard is reading, and a filtered detector would "lose" a series the
 * moment the window narrows past its cadence.
 */
export default function RecurrentesPage() {
    return (
        <AppChrome>
            <RecurrentesView />
        </AppChrome>
    );
}
