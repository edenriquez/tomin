"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Button, type ButtonVariant } from "./Button";
import { useOverlay } from "./useOverlay";
import { usePortal } from "./usePortal";

/**
 * Centred 480px dialog. This is the one component allowed `shadow-float`:
 * it floats over the middle of the page with no edge to anchor a border to.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    footer,
    children,
    width = 480,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    footer?: ReactNode;
    children?: ReactNode;
    width?: number;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const mounted = usePortal();
    useOverlay(open, onClose, panelRef);

    if (!mounted || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div onClick={onClose} aria-hidden className="absolute inset-0 bg-abyss/40" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                style={{ width }}
                className={cn(
                    "relative max-h-full w-full overflow-y-auto rounded-sheet",
                    "border border-mist bg-paper p-6 shadow-float outline-none"
                )}
            >
                <h2 className="text-title-sm font-semibold text-ink">{title}</h2>
                {description && <p className="mt-2 text-body-sm text-graphite">{description}</p>}
                {children && <div className="mt-4">{children}</div>}
                {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

/**
 * The `window.confirm` replacement. Confirm buttons say what they do
 * ("Eliminar"), never "OK" — the user should not have to re-read the prompt
 * to work out what the button means.
 */
export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "danger",
    loading = false,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ButtonVariant;
    loading?: boolean;
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </>
            }
        />
    );
}
