"use client";

import { AppChrome } from "@/components/AppChrome";
import { LecturasPreview } from "@/components/dev/LecturasPreview";

/**
 * A developer route, off the nav: the emphasis layer ("lecturas") exercised
 * on the real chart components with planted data, so the interaction can be
 * judged before any production view learns it.
 */
export default function LecturasPage() {
    return (
        <AppChrome>
            <LecturasPreview />
        </AppChrome>
    );
}
