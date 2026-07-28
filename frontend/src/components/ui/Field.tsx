"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClassName =
    "w-full rounded-control border border-mist bg-paper px-3 text-body-sm text-ink " +
    "placeholder:text-steel disabled:bg-fog disabled:text-steel " +
    "aria-[invalid=true]:border-negative";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, invalid, ...rest },
    ref
) {
    return (
        <input
            ref={ref}
            aria-invalid={invalid || undefined}
            className={cn(inputClassName, "h-10", className)}
            {...rest}
        />
    );
});

export type FieldProps = {
    label: string;
    /** Explains the input before the user gets it wrong. Hidden while an error shows. */
    hint?: string;
    /** Presence switches the field into its error state. */
    error?: string;
    required?: boolean;
    className?: string;
    /** Receives the id and aria-describedby the label and messages are wired to. */
    children: (props: {
        id: string;
        "aria-describedby": string | undefined;
        "aria-invalid": true | undefined;
    }) => ReactNode;
};

/**
 * Label + control + one message. Only ever one message: showing a hint and an
 * error at once makes the user read both to find out which one matters.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
    const id = useId();
    const messageId = `${id}-message`;
    const message = error ?? hint;

    return (
        <div className={cn("min-w-0", className)}>
            <label htmlFor={id} className="mb-1 block text-body-sm text-graphite">
                {label}
                {required && (
                    <span className="ml-0.5 text-negative" aria-hidden>
                        *
                    </span>
                )}
            </label>
            {children({
                id,
                "aria-describedby": message ? messageId : undefined,
                "aria-invalid": error ? true : undefined,
            })}
            {message && (
                <p
                    id={messageId}
                    role={error ? "alert" : undefined}
                    className={cn("mt-1 text-label", error ? "text-negative" : "text-pewter")}
                >
                    {message}
                </p>
            )}
        </div>
    );
}
