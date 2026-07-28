"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
    LayoutDashboard,
    TrendingUp,
    Wallet,
    LineChart,
    FileText,
    Settings,
    Sparkles,
} from "lucide-react";

const NAV = [
    { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
    { href: "/transactions", label: "Transacciones", icon: Wallet },
    { href: "/spending", label: "Gastos", icon: TrendingUp },
    { href: "/statements", label: "Estados de Cuenta", icon: FileText },
    { href: "/forecasts", label: "Proyecciones", icon: LineChart },
    { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    return (
        <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-mist bg-paper p-5">
            <div className="mb-8 flex items-center gap-2 text-title-sm font-semibold text-ink">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-ember font-semibold text-ink">
                    T
                </span>
                Tomin
            </div>
            <nav className="space-y-1">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={clsx(
                                "flex items-center gap-3 rounded-control px-3 py-2 text-body-sm font-medium",
                                active
                                    ? "bg-fog text-ink"
                                    : "text-graphite hover:bg-fog hover:text-ink"
                            )}
                        >
                            <Icon size={18} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-8 px-3 text-label font-semibold text-pewter">INTELIGENCIA</div>
            <div className="mt-2 flex items-center gap-3 rounded-control px-3 py-2 text-body-sm text-graphite">
                <Sparkles size={18} className="text-steel" />
                Tomin AI
            </div>

            <div className="mt-auto flex items-center gap-3 rounded-card bg-fog p-3">
                <div className="h-9 w-9 rounded-full bg-mist" />
                <div className="text-body-sm">
                    <div className="font-medium text-ink">Alejandro M.</div>
                    <div className="text-label text-pewter">Plan Premium</div>
                </div>
            </div>
        </aside>
    );
}
