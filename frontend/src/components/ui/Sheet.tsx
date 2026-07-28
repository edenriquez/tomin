"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlay } from "./useOverlay";
import { usePortal } from "./usePortal";

/** Right-hand drawer, 480px, full height. Escape closes, Tab stays inside. */
export function Sheet({
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
    children: ReactNode;
    width?: number;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const mounted = usePortal();
    useOverlay(open, onClose, panelRef);

    if (!mounted || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-sheet flex justify-end">
            <div
                onClick={onClose}
                aria-hidden
                className="absolute inset-0 bg-abyss/40"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                style={{ width }}
                className={cn(
                    "relative flex h-full max-w-full flex-col border-l border-mist bg-paper",
                    "outline-none"
                )}
            >
                <div className="flex items-start justify-between gap-4 border-b border-mist px-6 py-4">
                    <div className="min-w-0">
                        <h2 className="text-title-sm font-semibold text-ink">{title}</h2>
                        {description && (
                            <p className="mt-0.5 text-body-sm text-pewter">{description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="-mr-1 shrink-0 rounded-control p-1 text-graphite hover:bg-fog hover:text-ink"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
                {footer && (
                    <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
