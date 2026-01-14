import React from 'react';
import { useFilters } from '@/contexts/FilterContext';

interface TimePeriodFilterProps {
    value?: string;
    onChange?: (period: string) => void;
}

export const TimePeriodFilter = ({ value: propValue, onChange: propOnChange }: TimePeriodFilterProps) => {
    const { period: contextValue, setPeriod: contextSetPeriod } = useFilters();

    // Choose between prop and context
    const currentValue = propValue !== undefined ? propValue : contextValue;
    const handleChange = propOnChange !== undefined ? propOnChange : contextSetPeriod;

    const periods = [
        { id: 'weekly', label: 'Semanal (7d)' },
        { id: 'biweekly', label: 'Quincenal' },
        { id: 'last_month', label: 'Mes Anterior' },
        { id: 'last_3_months', label: 'Últimos 3 Meses' },
    ];

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {periods.map((period) => (
                <button
                    key={period.id}
                    onClick={() => handleChange(period.id)}
                    className={`h-8 px-4 rounded-full text-sm font-medium transition-colors ${currentValue === period.id
                        ? 'bg-[#135bec] text-white border border-[#135bec]'
                        : 'bg-white dark:bg-gray-800 text-[#616f89] dark:text-gray-300 border border-[#dbdfe6] dark:border-gray-600 hover:border-[#135bec] hover:text-[#135bec]'
                        }`}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );
};
