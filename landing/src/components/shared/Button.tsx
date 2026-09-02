import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * The frontend Button, trimmed for a marketing page: renders an <a> when
 * given `href`, no loading state. Same rules — the filled Signal pill is the
 * one chromatic fill, one per viewport; Ink label on Signal (5.6:1), never
 * white. `tone="dark"` only retunes the hairline variants.
 */
const VARIANTS: Record<ButtonVariant, Record<"light" | "dark", string>> = {
    primary: {
        light: "bg-signal text-ink font-medium border border-edge hover:brightness-[0.97] active:brightness-95",
        dark: "bg-signal text-ink font-medium border border-edge hover:brightness-105 active:brightness-95",
    },
    secondary: {
        light: "bg-transparent text-ink border border-mist hover:bg-paper hover:border-muted",
        dark: "bg-transparent text-bone border border-lineStrong hover:bg-slate",
    },
    ghost: {
        light: "bg-transparent text-graphite hover:bg-fog hover:text-ink",
        dark: "bg-transparent text-dust hover:bg-slate hover:text-bone",
    },
};

const SIZES: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-body-sm gap-1.5",
    md: "h-9 px-4 text-body gap-2",
    lg: "h-11 px-6 text-body gap-2",
};

type Common = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    tone?: "light" | "dark";
    className?: string;
    children: ReactNode;
};

export type ButtonProps = Common &
    (
        | ({ href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">)
        | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
    );

export function Button({
    variant = "primary",
    size = "md",
    tone = "light",
    className,
    children,
    ...rest
}: ButtonProps) {
    const classes = cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-control",
        "transition-[filter,background-color,border-color] duration-100",
        VARIANTS[variant][tone],
        SIZES[size],
        className
    );
    if ("href" in rest && rest.href !== undefined) {
        const { href, ...anchor } = rest as { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>;
        return (
            <a href={href} className={classes} {...anchor}>
                {children}
            </a>
        );
    }
    const button = rest as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
        <button type="button" className={classes} {...button}>
            {children}
        </button>
    );
}
