'use client';

import { Search, Calendar, ChevronDown, Download } from 'lucide-react';
import { useState } from 'react';

interface DashboardHeaderProps {
    userName?: string;
    userEmail?: string;
    userImage?: string;
}

export default function DashboardHeader({ userName = 'Daniel William', userEmail = 'Personal Account', userImage }: DashboardHeaderProps) {
    const [dateRange, setDateRange] = useState({ start: 'Jan 1, 2024', end: 'Jan 1, 2025' });

    return (
        <header className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between">
                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="text-sm text-gray-700">{dateRange.start}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm text-gray-700">{dateRange.end}</span>
                    </div>

                    {/* Widget Button */}
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="text-sm text-gray-700">📊 Widget</span>
                    </button>

                    {/* Export Button */}
                    <button className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30">
                        <Download size={16} />
                        <span className="text-sm font-medium">Export</span>
                    </button>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                        <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{userName}</div>
                            <div className="text-xs text-gray-500">{userEmail}</div>
                        </div>
                        <div className="relative">
                            {userImage ? (
                                <img src={userImage} alt={userName} className="w-10 h-10 rounded-full" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium">
                                    {userName.split(' ').map(n => n[0]).join('')}
                                </div>
                            )}
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />
                    </div>
                </div>
            </div>
        </header>
    );
}
