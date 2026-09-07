"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { useOverlay } from "@/components/ui/useOverlay";
import { usePortal } from "@/components/ui/usePortal";

/**
 * Centered modal asking for an encrypted PDF's password. A modal rather than a
 * Sheet because it interrupts a drop the user just made — the answer belongs
 * where their eyes already are, not in a drawer edge.
 *
 * The password is handed to `onSubmit` and never stored here beyond the open
 * dialog: closing it clears the field.
 */
export function PdfPasswordDialog({
    open,
    filename,
    wrong,
    busy,
    onCancel,
    onSubmit,
}: {
    open: boolean;
    /** Shown so the user knows *which* file wants a password. */
    filename?: string;
    /** True on a retry: the PDF rejected the previous password. */
    wrong?: boolean;
    /** True while the upload with the supplied password is in flight. */
    busy?: boolean;
    onCancel: () => void;
    onSubmit: (password: string) => void;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const mounted = usePortal();
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    useOverlay(open, onCancel, panelRef);

    // A password typed for one file must not survive for the next one.
    useEffect(() => {
        if (!open) {
            setPassword("");
            setVisible(false);
        }
    }, [open]);

    if (!mounted || !open) return null;

    function submit(e: FormEvent) {
        e.preventDefault();
        if (password.length > 0) onSubmit(password);
    }

    return createPortal(
        <div className="fixed inset-0 z-sheet flex items-center justify-center p-4">
            <div onClick={onCancel} aria-hidden className="absolute inset-0 bg-soot/40" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Este PDF tiene contraseña"
                tabIndex={-1}
                className="relative w-full max-w-md rounded-panel border border-mist bg-paper p-6 outline-none"
            >
                <div className="flex items-start gap-3">
                    <div
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input border border-mist bg-canvas text-ash"
                    >
                        <Lock size={16} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-title-sm font-normal text-ink">
                            Este PDF tiene contraseña
                        </h2>
                        <p className="mt-1 text-body-sm text-graphite">
                            {filename ? (
                                <>
                                    <span className="break-all font-medium text-ink">{filename}</span>{" "}
                                    está protegido.{" "}
                                </>
                            ) : null}
                            Escríbela para poder leerlo: la usamos una sola vez para abrir el
                            archivo y no la guardamos.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="mt-5">
                    <label className="block">
                        <span className="text-label text-graphite">Contraseña del PDF</span>
                        <div className="relative mt-1.5">
                            <input
                                type={visible ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="off"
                                disabled={busy}
                                aria-invalid={wrong || undefined}
                                className={cn(
                                    "h-10 w-full rounded-input border bg-paper pl-3 pr-10",
                                    "text-body text-ink outline-none placeholder:text-ash",
                                    wrong ? "border-negative" : "border-mist focus:border-ink"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setVisible((v) => !v)}
                                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ash hover:text-ink"
                            >
                                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </label>

                    {wrong && (
                        <p role="alert" className="mt-2 text-body-sm text-negative">
                            La contraseña no funcionó. Revísala e inténtalo de nuevo.
                        </p>
                    )}

                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="ghost" onClick={onCancel} disabled={busy}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={busy} disabled={password.length === 0}>
                            Desbloquear y subir
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
