"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
    // Ink on Ember, not white: white is 3.14:1 and fails AA at button sizes.
    primary: "bg-ember text-ink font-semibold hover:brightness-95 active:brightness-90",
    secondary: "bg-paper text-ink border border-mist hover:bg-fog",
    ghost: "bg-transparent text-graphite hover:bg-fog hover:text-ink",
    danger: "bg-paper text-negative border border-negative hover:bg-fog",
};

const SIZES: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-body-sm gap-1.5",
    md: "h-10 px-4 text-body-sm gap-2",
    lg: "h-12 px-6 text-body gap-2",
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
                "transition-[filter,background-color] duration-100",
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
