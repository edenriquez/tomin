"use client";

import { Suspense } from "react";
import { AppChrome } from "@/components/AppChrome";
import { DocumentosView } from "@/components/documentos/DocumentosView";
import { Skeleton } from "@/components/ui";

/** The Documentos route — the archive, inside the same chassis as everything.
 *
 *  The view reads `?statement=` (the deep link the phone hands out after a
 *  device upload) through `useSearchParams`, which bails its subtree out of
 *  prerendering; Next 14 requires the boundary to be explicit. It sits *inside*
 *  AppChrome so the shell and the provider still render on the server, and the
 *  fallback is the archive's own waiting shape rather than a blank column. */
export default function DocumentosPage() {
    return (
        <AppChrome>
            <Suspense
                fallback={
                    <div className="space-y-4 sm:space-y-6">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-72" />
                    </div>
                }
            >
                <DocumentosView />
            </Suspense>
        </AppChrome>
    );
}
