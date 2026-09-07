"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Upload, type LucideIcon } from "lucide-react";
import { FileText, LineChart, Scale, Shapes, Tag } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { useStatementUpload } from "@/components/StatementDropzone";
import { useBankScope } from "@/lib/banks";
import { BankFilter } from "@/components/BankFilter";
import { TimeWindowBar } from "@/components/TimeWindowBar";
import { LecturasMenu } from "@/components/lectura/LecturasMenu";
import { useReceiptCount } from "@/components/precios/useReceiptCount";
import { track } from "@/lib/telemetry";

type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * The readings of the app — three, each a different question about the same
 * ledger: what happened (Movimientos), where it went (Categorías), whether it
 * adds up going forward (Plan: what leaves against what comes in).
 *
 * Six tabs shipped before this (Fijos and Pronóstico split one question in
 * two; Precios was empty for anyone without the phone app; Documentos is an
 * errand, not a reading). Every tab costs attention, and an empty one costs
 * trust, so the nav is the readings and only the readings.
 */
const NAV: NavItem[] = [
    { href: "/", label: "Movimientos", icon: LineChart },
    { href: "/categorias", label: "Categorías", icon: Shapes },
    { href: "/plan", label: "Plan", icon: Scale },
];

/**
 * The basket behind a charge. A statement can only say "SORIANA $1,412.60";
 * this is the view where that becomes "la leche te subió 19%". Tickets arrive
 * from the phone only, so the tab exists once there is a ticket to show —
 * an always-on tab that reads "Todavía no hay tickets" forever is a promise
 * the web app cannot keep on its own.
 */
const PRECIOS: NavItem = { href: "/precios", label: "Precios", icon: Tag };

/** Documentos: the archive. Maintenance, not a reading — it lives in the
 *  header next to the one action that already works everywhere. */
const DOCUMENTOS: NavItem = { href: "/documentos", label: "Documentos", icon: FileText };

/**
 * The app shell: wordmark, view switcher, archive, upload. Every view renders
 * inside it, so navigating between them moves only the content and the header
 * stays put.
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
    const receipts = useReceiptCount(uploadBump);
    const { pick, uploading, input } = useStatementUpload(() => {
        setUploadBump((v) => v + 1);
        onUploaded?.();
    });

    // Precios earns its tab with the first ticket. If you are already on it
    // (the strip under a movement links here) the tab shows so the page has
    // a place in the nav rather than appearing from nowhere.
    const showPrecios = (receipts ?? 0) > 0 || pathname.startsWith(PRECIOS.href);
    const nav = showPrecios ? [...NAV, PRECIOS] : NAV;

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    return (
        <main className="mx-auto min-h-dvh w-full max-w-page px-5 pb-16 sm:px-8">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-3 py-6 sm:py-8">
                <Link
                    href="/"
                    aria-label="Tomin, inicio"
                    className="flex items-center gap-2 text-ink"
                >
                    <Flame size={16} className="text-signal" aria-hidden />
                    <span className="text-body font-medium">
                        Tomin
                    </span>
                </Link>

                {/* Hairline between wordmark and views: the brand is not one of
                    the destinations, and on a bare row of text it reads as one. */}
                <span aria-hidden className="hidden h-5 w-px bg-mist sm:block" />

                <nav
                    aria-label="Vistas"
                    className="order-last w-full min-w-0 sm:order-none sm:w-auto"
                >
                    {/* Scrolls sideways rather than clipping on a narrow phone:
                        a tab you cannot see is a view you do not know exists. */}
                    <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {nav.map((item) => (
                            <li key={item.href} className="shrink-0">
                                <NavLink item={item} active={isActive(item.href)} />
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                    <NavLink
                        item={DOCUMENTOS}
                        active={isActive(DOCUMENTOS.href)}
                        compact
                        source="header"
                    />
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

function NavLink({
    item,
    active,
    compact = false,
    source = "nav",
}: {
    item: NavItem;
    active: boolean;
    /** Icon only below `sm` — for the header slot, where width is the button's. */
    compact?: boolean;
    source?: "nav" | "header";
}) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            onClick={() => track("nav.view", { to: item.href, source })}
            aria-current={active ? "page" : undefined}
            aria-label={compact ? item.label : undefined}
            title={compact ? item.label : undefined}
            className={cn(
                "inline-flex h-9 items-center gap-2 rounded-control px-3 text-body",
                "transition-colors duration-100",
                // Fog with a hairline, not the Soot pill: Soot belongs to the
                // period filter, and two dark pills on one screen read as the
                // same control.
                active
                    ? "bg-fog font-medium text-ink ring-1 ring-inset ring-mist"
                    : "text-graphite hover:text-ink"
            )}
        >
            <Icon size={15} aria-hidden />
            <span className={compact ? "hidden sm:inline" : undefined}>{item.label}</span>
        </Link>
    );
}
