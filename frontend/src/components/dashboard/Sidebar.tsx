'use client';

import { Home, BarChart2, CreditCard, HelpCircle, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
    onLogout?: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
        { icon: BarChart2, label: 'Analytics', href: '/dashboard/analytics', active: false },
        { icon: CreditCard, label: 'Transactions', href: '/dashboard/transactions', active: false },
        { icon: HelpCircle, label: 'Help', href: '/dashboard/help', active: false },
    ];

    return (
        <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 fixed left-0 top-0 h-full">
            {/* Logo */}
            <div className="mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9" />
                        <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col gap-4 w-full px-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
                ${isActive
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                }
              `}
                            title={item.label}
                        >
                            <Icon size={20} />
                        </Link>
                    );
                })}
            </nav>

            {/* Settings */}
            <div className="mt-auto flex flex-col gap-4 w-full px-4">
                <button
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-200"
                    title="Settings"
                >
                    <Settings size={20} />
                </button>

                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                )}
            </div>
        </aside>
    );
}
