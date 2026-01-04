import React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    title: string;
    value: string;
    trend?: string;
    trendType?: 'positive' | 'negative';
    icon: React.ReactNode;
    iconBg: string;
}

export const MetricCard = ({ title, value, trend, trendType = 'positive', icon, iconBg }: MetricCardProps) => {
    return (
        <div className="card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</h3>
                    {trend && (
                        <div className={cn(
                            "mt-2 flex items-center gap-1 text-sm font-medium",
                            trendType === 'positive' ? "text-[#07883b]" : "text-[#d32f2f]"
                        )}>
                            {trend}
                        </div>
                    )}
                </div>
                <div className={cn("rounded-full p-2", iconBg)}>
                    {icon}
                </div>
            </div>
        </div>
    );
};
