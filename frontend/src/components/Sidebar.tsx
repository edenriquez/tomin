"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
    LayoutDashboard,
    TrendingUp,
    Wallet,
    Target,
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
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-white min-h-screen p-5 flex flex-col">
            <div className="flex items-center gap-2 font-bold text-xl mb-8">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
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
                            className={clsx(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                                active
                                    ? "bg-brand/10 text-brand"
                                    : "text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            <Icon size={18} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-8 text-xs font-semibold text-slate-400 px-3">INTELIGENCIA</div>
            <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600">
                <Sparkles size={18} className="text-purple-500" />
                Tomin AI
            </div>

            <div className="mt-auto flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="h-9 w-9 rounded-full bg-brand/20" />
                <div className="text-sm">
                    <div className="font-medium">Alejandro M.</div>
                    <div className="text-xs text-slate-500">Plan Premium</div>
                </div>
            </div>
        </aside>
    );
}
