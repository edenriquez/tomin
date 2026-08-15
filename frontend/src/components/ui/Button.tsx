"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * The filled Signal pill is the only chromatic filled element the system
 * permits — one per viewport, on the single action that matters. Everything
 * else is a hairline pill, which is why the accent still reads as "switched
 * on" three screens deep.
 *
 * Ink on Signal, not white: white on #3ba6f1 is 2.36:1 and fails AA at every
 * size. Ink is 5.60:1.
 */
const VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-signal text-ink font-medium border border-edge hover:brightness-[0.97] active:brightness-95",
    secondary: "bg-transparent text-ink border border-mist hover:bg-paper hover:border-muted",
    ghost: "bg-transparent text-graphite hover:bg-fog hover:text-ink",
    danger: "bg-transparent text-negative border border-negative/40 hover:bg-fog hover:border-negative",
};

const SIZES: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-body-sm gap-1.5",
    md: "h-9 px-4 text-body gap-2",
    lg: "h-11 px-6 text-body gap-2",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Swaps the label for a spinner without changing the button's width. */
    loading?: boolean;
    icon?: ReactNode;
    fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = "primary",
        size = "md",
        loading = false,
        icon,
        fullWidth = false,
        className,
        children,
        disabled,
        type = "button",
        ...rest
    },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(
                "relative inline-flex items-center justify-center rounded-control",
                "transition-[filter,background-color,border-color] duration-100",
                "disabled:cursor-not-allowed disabled:opacity-50",
                VARIANTS[variant],
                SIZES[size],
                fullWidth && "w-full",
                className
            )}
            {...rest}
        >
            {/* The label stays in flow while loading so the button keeps its
                width — a button that shrinks mid-request moves the layout. */}
            <span
                className={cn(
                    "inline-flex items-center gap-2",
                    loading && "invisible"
                )}
            >
                {icon}
                {children}
            </span>
            {loading && (
                <Loader2
                    aria-hidden
                    size={size === "lg" ? 18 : 16}
                    className="absolute animate-spin"
                />
            )}
        </button>
    );
});
