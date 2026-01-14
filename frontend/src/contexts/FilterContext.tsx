"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
    period: string;
    setPeriod: (period: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [period, setPeriod] = useState<string>('weekly');

    return (
        <FilterContext.Provider value={{ period, setPeriod }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
};
