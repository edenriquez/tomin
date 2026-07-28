"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { colors } from "@/design/tokens";

export type SliderProps = {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    /** Renders the current value next to the label. Pass `mxn`, `pct`, etc. */
    format?: (value: number) => string;
    disabled?: boolean;
    className?: string;
};

/**
 * Mist track, Ember fill. The fill is painted with a gradient sized off the
 * current value because `::-webkit-slider-runnable-track` has no way to know
 * where the thumb is.
 */
export function Slider({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    format,
    disabled = false,
    className,
}: SliderProps) {
    const id = useId();
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

    return (
        <div className={cn("min-w-0", className)}>
            <div className="flex items-center justify-between gap-3 text-body-sm">
                <label htmlFor={id} className="text-graphite">
                    {label}
                </label>
                <span className="tabular font-medium text-ink">
                    {format ? format(value) : value}
                </span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{
                    background:
                        `linear-gradient(to right, ${colors.ember} 0%, ${colors.ember} ${pct}%,` +
                        ` ${colors.mist} ${pct}%, ${colors.mist} 100%)`,
                }}
                className={cn(
                    "mt-2 h-1 w-full cursor-pointer appearance-none rounded-full accent-ember",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                    "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink",
                    "[&::-webkit-slider-thumb]:bg-paper",
                    "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
                    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border",
                    "[&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-paper"
                )}
            />
        </div>
    );
}
