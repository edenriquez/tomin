import React from 'react';
import { LayoutDashboard, TrendingUp, CreditCard, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { icon: LayoutDashboard, label: 'Resumen', href: '/dashboard' },
    { icon: TrendingUp, label: 'Pronósticos', href: '/forecasts' },
    { icon: CreditCard, label: 'Gastos', href: '#' },
    { icon: Target, label: 'Metas', href: '#' },
];

export const Sidebar = () => {
    return (
        <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1a2332] md:flex h-screen sticky top-0">
            <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#135bec] text-white">
                    <LayoutDashboard size={20} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Tomin</h1>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                item.label === 'Resumen' // Simplified check
                                    ? "bg-[#135bec]/10 text-[#135bec]"
                                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            )}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

                <div className="px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-2 tracking-wider">Inteligencia</p>
                    <a href="#" className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-500 hover:bg-gradient-to-r hover:from-[#135bec]/10 hover:to-transparent dark:text-gray-400">
                        <Sparkles size={18} className="text-[#135bec] group-hover:animate-pulse" />
                        <span className="text-sm font-medium">Tomin AI</span>
                    </a>
                </div>

                <div className="mt-auto">
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <div className="size-10 rounded-full bg-cover bg-center bg-[url('https://avatar.vercel.sh/alejandro')]" />
                        <div className="flex flex-col overflow-hidden">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">Alejandro M.</p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">Plan Premium</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};
