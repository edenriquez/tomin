"use client";

import { AppChrome } from "@/components/AppChrome";
import { FijosView } from "@/components/fijos/FijosView";

/**
 * Legacy path. next.config redirects /recurrentes → /fijos; this page is the
 * fallback if the redirect is skipped (e.g. a host that ignores next.config).
 */
export default function RecurrentesPage() {
    return (
        <AppChrome>
            <FijosView />
        </AppChrome>
    );
}
