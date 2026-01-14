"use client";

import { FilterProvider } from "@/contexts/FilterContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <FilterProvider>
            {children}
        </FilterProvider>
    );
}
