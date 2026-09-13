"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Upload } from "lucide-react";
import { FileText } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { useStatementUpload } from "@/components/StatementDropzone";
import { useBankScope } from "@/lib/banks";
import { BankFilter } from "@/components/BankFilter";
import { PagosBell } from "@/components/pagos/PagosBell";
import { track } from "@/lib/telemetry";

/**
 * Wordmark, the one action that opens the ledger, the payments bell, archive
 * and upload. Readings (por categoría, cargos recurrentes) live in the page,
 * not here.
 */
export function AppShell({
    children,
    onUploaded,
    instrument,
}: {
    children: ReactNode;
    /** The commit that opens the ledger (⌘K). */
    instrument?: ReactNode;
    /** Fired after a successful upload — each view refreshes what it shows. */
    onUploaded?: () => void;
}) {
    const pathname = usePathname();
    const [uploadBump, setUploadBump] = useState(0);
    const scope = useBankScope(uploadBump);
    const { pick, uploading, input } = useStatementUpload(() => {
        setUploadBump((v) => v + 1);
        onUploaded?.();
    });

    return (
        <main className="mx-auto min-h-dvh w-full max-w-page px-5 pb-16 sm:px-8">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-3 py-6 sm:py-8">
                <Link
                    href="/"
                    aria-label="Tomin, inicio"
                    className="flex items-center gap-2 text-ink"
                >
                    <Flame size={16} className="text-signal" aria-hidden />
                    <span className="text-body font-medium">Tomin</span>
                </Link>

                {instrument}

                <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                    <PagosBell dataVersion={uploadBump} />
                    <Link
                        href="/documentos"
                        onClick={() => track("nav.view", { to: "/documentos", source: "header" })}
                        aria-current={pathname.startsWith("/documentos") ? "page" : undefined}
                        title="Documentos"
                        className={cn(
                            "inline-flex h-9 items-center gap-2 rounded-control px-3 text-body",
                            "transition-colors duration-100",
                            pathname.startsWith("/documentos")
                                ? "bg-fog font-medium text-ink ring-1 ring-inset ring-mist"
                                : "text-graphite hover:text-ink"
                        )}
                    >
                        <FileText size={15} aria-hidden />
                        <span className="hidden sm:inline">Documentos</span>
                    </Link>
                    <Button
                        variant="secondary"
                        loading={uploading}
                        onClick={pick}
                        icon={<Upload size={15} />}
                    >
                        <span className="hidden sm:inline">Subir documento</span>
                        <span className="sm:hidden">Subir</span>
                    </Button>
                </div>
                {input}
            </header>

            <div className="-mt-2 flex flex-wrap items-center gap-2 pb-6">
                <BankFilter scope={scope} />
            </div>

            {children}
        </main>
    );
}
