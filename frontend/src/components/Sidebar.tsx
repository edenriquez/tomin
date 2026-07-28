"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, FileText, LayoutGrid, Settings2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui";

/**
 * Four items, and only four (docs/redesign-plan.md §4). `/spending` and
 * `/forecasts` are deliberately absent: they retire into widgets in F5 and
 * stay reachable by URL until then. The nav does not grow one entry per
 * analysis.
 */
const NAV = [
    { href: "/inicio", label: "Inicio", icon: LayoutGrid },
    { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
    { href: "/documentos", label: "Documentos", icon: FileText },
    { href: "/ajustes", label: "Ajustes", icon: Settings2 },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const profile = useProfile();

    return (
        // Hidden below md: a real mobile nav is out of scope for F3, and a
        // 256px rail on a phone just eats the page.
        <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-mist bg-paper p-5 md:flex">
            <Link
                href="/inicio"
                className="mb-8 block px-3 text-title-sm font-semibold text-ink"
            >
                Tomin
            </Link>

            <nav aria-label="Principal" className="space-y-1">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-control px-3 py-2 text-body-sm font-medium",
                                // Active is a neutral surface plus a 2px Ember
                                // rule. Ember is the accent, not a background.
                                // border-l-2 always present so the label never
                                // shifts 2px when the route changes.
                                "border-l-2 border-transparent",
                                active
                                    ? "border-ember bg-fog text-ink"
                                    : "text-graphite hover:bg-fog hover:text-ink"
                            )}
                        >
                            <Icon size={18} aria-hidden />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto space-y-4">
                <Button
                    fullWidth
                    icon={<Upload size={16} />}
                    onClick={() => router.push("/documentos")}
                >
                    Subir documento
                </Button>

                <div className="flex items-center gap-3 rounded-card bg-fog p-3">
                    <div
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-body-sm font-semibold text-ink"
                    >
                        {profile.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-body-sm">
                        <div className="truncate font-medium text-ink">{profile.name}</div>
                        {(profile.email ?? profile.plan) && (
                            <div className="truncate text-label text-pewter">
                                {profile.email ?? profile.plan}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
