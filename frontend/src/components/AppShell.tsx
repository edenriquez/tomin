"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Upload, type LucideIcon } from "lucide-react";
import { FileText, LineChart, Pin, Scale, Shapes, Tag } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { useStatementUpload } from "@/components/StatementDropzone";
import { useBankScope } from "@/lib/banks";
import { BankFilter } from "@/components/BankFilter";
import { TimeWindowBar } from "@/components/TimeWindowBar";
import { LecturasMenu } from "@/components/lectura/LecturasMenu";
import { track } from "@/lib/telemetry";

type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * The views of the app. Documentos is one of them, not a side trip: it used to
 * be a page you left the app for and came back from via a "Volver" arrow,
 * which framed your own statements as an errand. Same chrome, same nav, same
 * upload button — the only thing that changes between views is the content.
 */
const NAV: NavItem[] = [
    { href: "/", label: "Movimientos", icon: LineChart },
    { href: "/categorias", label: "Categorías", icon: Shapes },
    { href: "/fijos", label: "Fijos", icon: Pin },
    { href: "/pronostico", label: "Pronóstico", icon: Scale },
    // The basket behind a charge. A statement can only say "SORIANA $1,412.60";
    // this is the view where that becomes "la leche te subió 19%".
    { href: "/precios", label: "Precios", icon: Tag },
    { href: "/documentos", label: "Documentos", icon: FileText },
];

/**
 * The app shell: wordmark, view switcher, editor mode, upload. Every view
 * renders inside it, so navigating between them moves only the content and
 * the header stays put.
 */
export function AppShell({
    children,
    onUploaded,
    timeScoped = false,
}: {
    children: ReactNode;
    /** Whether the view under this shell reads through the time filter. The
     *  bar shows regardless — the selection persists across views — but on a
     *  whole-history view it says it does not apply. */
    timeScoped?: boolean;
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
                    aria-label="Tomin — inicio"
                    className="flex items-center gap-2 text-ink"
                >
                    <Flame size={16} className="text-signal" aria-hidden />
                    <span className="font-display text-title-sm font-normal tracking-tight">
                        Tomin
                    </span>
                </Link>

                {/* Hairline between wordmark and views: the brand is not one of
                    the destinations, and on a bare row of text it reads as one. */}
                <span aria-hidden className="hidden h-5 w-px bg-mist sm:block" />

                <nav aria-label="Vistas" className="order-last w-full sm:order-none sm:w-auto">
                    <ul className="flex gap-1">
                        {NAV.map((item) => {
                            const active =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() => track("nav.view", { to: item.href })}
                                        aria-current={active ? "page" : undefined}
                                        className={cn(
                                            "inline-flex h-9 items-center gap-2 rounded-control px-3 text-body",
                                            "transition-colors duration-100",
                                            // Fog with a hairline, not the Soot
                                            // pill: Soot belongs to the period
                                            // filter, and two dark pills on one
                                            // screen read as the same control.
                                            active
                                                ? "bg-fog font-medium text-ink ring-1 ring-inset ring-mist"
                                                : "text-graphite hover:text-ink"
                                        )}
                                    >
                                        <Icon size={15} aria-hidden />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                    {/* Secondary, not the accent: uploading is frequent but it
                        is not the point of any screen, and a cyan button in the
                        chrome competes with the one place cyan means something
                        (a selection). A hairline button belongs to the header. */}
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

            {/* Two rows, two questions. The header answers "where am I" — the
                brand, the views, the one action that works everywhere. This
                rail answers "what am I looking at" — which accounts, which span
                of time — and it is drawn as one family of capsules so the two
                filters read as one control rather than as two more toolbars. */}
            <div className="-mt-2 flex flex-wrap items-center gap-2 pb-6">
                <BankFilter scope={scope} />
                <TimeWindowBar disabled={!timeScoped} />
                <LecturasMenu />
            </div>

            {children}
        </main>
    );
}
