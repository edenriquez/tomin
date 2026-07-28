"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePortal } from "./usePortal";

export type ToastTone = "neutral" | "positive" | "negative";

type Toast = { id: number; message: string; tone: ToastTone };

type ToastApi = {
    toast: (message: string, tone?: ToastTone) => void;
    dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Throws rather than no-oping: a status message that silently vanishes is worse
 *  than a crash in development. */
export function useToast(): ToastApi {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}

const TONE_ACCENT: Record<ToastTone, string> = {
    neutral: "border-l-mist",
    positive: "border-l-positive",
    negative: "border-l-negative",
};

/**
 * Bottom-left, Abyss on Paper text. Bottom-left rather than the usual
 * top-right: primary actions in this app live at the top-right, and a toast
 * that covers the button you just pressed is a bad joke.
 */
export function ToastProvider({
    children,
    duration = 5000,
}: {
    children: ReactNode;
    duration?: number;
}) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(1);
    const mounted = usePortal();

    const dismiss = useCallback((id: number) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    const toast = useCallback(
        (message: string, tone: ToastTone = "neutral") => {
            const id = nextId.current++;
            setToasts((t) => [...t, { id, message, tone }]);
            // Errors stay until dismissed; the user may need to read the detail.
            if (tone !== "negative") {
                setTimeout(() => dismiss(id), duration);
            }
        },
        [dismiss, duration]
    );

    const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            {mounted &&
                createPortal(
                    <div
                        role="status"
                        aria-live="polite"
                        className="pointer-events-none fixed bottom-4 left-4 z-toast flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
                    >
                        {toasts.map((t) => (
                            <div
                                key={t.id}
                                className={cn(
                                    "pointer-events-auto flex items-start gap-3 rounded-card",
                                    "border-l-2 bg-abyss px-4 py-3 text-body-sm text-paper",
                                    TONE_ACCENT[t.tone]
                                )}
                            >
                                <span className="min-w-0 flex-1 break-words">{t.message}</span>
                                <button
                                    type="button"
                                    onClick={() => dismiss(t.id)}
                                    aria-label="Cerrar aviso"
                                    className="-mr-1 shrink-0 rounded-tag p-0.5 text-steel hover:text-paper"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
        </ToastContext.Provider>
    );
}
