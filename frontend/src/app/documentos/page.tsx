"use client";

import { AppChrome } from "@/components/AppChrome";
import { DocumentosView } from "@/components/documentos/DocumentosView";

/** The Documentos route — the archive, inside the same chassis as everything. */
export default function DocumentosPage() {
    return (
        <AppChrome>
            <DocumentosView />
        </AppChrome>
    );
}
