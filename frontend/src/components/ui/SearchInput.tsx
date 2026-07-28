"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type SearchInputProps = {
    /** Fires `delay` ms after the last keystroke, and immediately on clear. */
    onSearch: (value: string) => void;
    placeholder?: string;
    delay?: number;
    defaultValue?: string;
    className?: string;
    "aria-label"?: string;
};

export function SearchInput({
    onSearch,
    placeholder = "Buscar...",
    delay = 250,
    defaultValue = "",
    className,
    "aria-label": ariaLabel = "Buscar",
}: SearchInputProps) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keeping the callback in a ref means a caller passing an inline arrow
    // function doesn't restart the debounce on every parent render.
    const onSearchRef = useRef(onSearch);
    onSearchRef.current = onSearch;

    const firstRun = useRef(true);
    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        const id = setTimeout(() => onSearchRef.current(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);

    function clear() {
        setValue("");
        onSearchRef.current("");
        inputRef.current?.focus();
    }

    return (
        <div
            className={cn(
                "flex h-10 items-center gap-2 rounded-control border border-mist bg-paper px-3",
                "focus-within:border-ink",
                className
            )}
        >
            <Search size={16} aria-hidden className="shrink-0 text-steel" />
            <input
                ref={inputRef}
                type="search"
                aria-label={ariaLabel}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && value && clear()}
                placeholder={placeholder}
                className={cn(
                    "min-w-0 flex-1 bg-transparent text-body-sm text-ink outline-none",
                    "placeholder:text-steel",
                    // The UA's own clear affordance would sit next to ours.
                    "[&::-webkit-search-cancel-button]:appearance-none"
                )}
            />
            {value && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Limpiar búsqueda"
                    className="shrink-0 rounded-tag p-0.5 text-steel hover:text-ink"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
