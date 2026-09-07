"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { api, UploadError, type UploadResult } from "@/lib/api";
import { cn } from "@/lib/cn";
import { isEncryptedPdf } from "@/lib/pdf";
import { Button, useToast } from "@/components/ui";
import { PdfPasswordDialog } from "@/components/PdfPasswordDialog";

const ACCEPT = ".pdf,.xml";
const ACCEPTED_EXTENSIONS = [".pdf", ".xml"];

/**
 * Upload-a-statement as a hook, so the full-screen dropzone and the small
 * header button on the dashboard are the same behaviour with different
 * chrome — same validation, same toasts, same completion callback.
 *
 * The extension is checked before the request goes out: a rejected upload
 * that costs a round-trip to learn "that was a .docx" is a worse answer than
 * an instant one.
 */
export function useStatementUpload(
    onUploaded?: () => void,
    /** Richer sibling of `onUploaded`: receives the parse outcome, so the
     *  onboarding review can show what the OCR understood. */
    onResult?: (result: UploadResult) => void
) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    /**
     * Set when an encrypted PDF needs a password. `wrong` distinguishes the
     * first ask from a retry after the PDF rejected one. The file is kept so
     * the dialog's submit can re-run the same upload; the password itself
     * lives only inside the dialog and dies when it closes.
     */
    const [passwordFor, setPasswordFor] = useState<{ file: File; wrong: boolean } | null>(null);
    const { toast } = useToast();

    const upload = useCallback(
        async (file: File, password?: string) => {
            const name = file.name.toLowerCase();
            if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
                toast("Solo entran PDF de tu banco o XML del SAT.", "negative");
                return;
            }

            // Sniffed before the request goes out, same reasoning as the
            // extension check above: asking for the password costs nothing
            // locally, learning it was needed costs a round trip.
            if (!password && name.endsWith(".pdf")) {
                const bytes = new Uint8Array(await file.arrayBuffer());
                if (isEncryptedPdf(bytes)) {
                    setPasswordFor({ file, wrong: false });
                    return;
                }
            }

            setUploading(true);
            try {
                const result = await api.uploadStatement(file, password);
                setPasswordFor(null);
                // The template id is a backend name, not something to read.
                toast(
                    result.transactions_created === 1
                        ? "Listo: 1 movimiento leído"
                        : `Listo: ${result.transactions_created} movimientos leídos`,
                    "positive"
                );
                onUploaded?.();
                onResult?.(result);
            } catch (e) {
                const code = e instanceof UploadError ? e.code : undefined;
                if (code === "pdf_password_required" || code === "pdf_password_incorrect") {
                    // The dialog is the message here — a toast on top would
                    // say the same thing twice.
                    setPasswordFor({ file, wrong: code === "pdf_password_incorrect" });
                } else {
                    setPasswordFor(null);
                    toast(`No se pudo leer el archivo: ${(e as Error).message}`, "negative");
                }
            } finally {
                setUploading(false);
                // Without this, re-selecting the same file fires no change event.
                if (inputRef.current) inputRef.current.value = "";
            }
        },
        [onUploaded, onResult, toast]
    );

    const pick = useCallback(() => inputRef.current?.click(), []);

    /** Render this once next to whatever triggers `pick()`. The password
     *  dialog rides along so every upload surface gets it for free. */
    const input = (
        <>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <PdfPasswordDialog
                open={passwordFor !== null}
                filename={passwordFor?.file.name}
                wrong={passwordFor?.wrong}
                busy={uploading}
                onCancel={() => setPasswordFor(null)}
                onSubmit={(password) => passwordFor && upload(passwordFor.file, password)}
            />
        </>
    );

    return { upload, pick, uploading, input };
}

/**
 * The upload surface for the first statement. A dropzone rather than a bare
 * button because this is the whole job on the whole screen — the target
 * should be the size of the decision, not the size of a toolbar control.
 * On touch devices the drop affordance is inert and the button is the path,
 * which is why the button is the filled primary and the drop copy is a hint.
 */
export function StatementDropzone({
    onUploaded,
    onResult,
    className,
    autoFocus = false,
}: {
    /** Fires after a statement parses. The caller re-probes and swaps state. */
    onUploaded?: () => void;
    /** Receives the parse outcome — bank, period, template — for review UIs. */
    onResult?: (result: UploadResult) => void;
    className?: string;
    /** Put the "Elegir archivo" button in focus on mount: for arrivals whose
     *  previous click was already "Comenzar". Browsers refuse to open the file
     *  picker without a gesture, so focus (and Enter/Space) is as close as the
     *  web allows to "the picker is ready". */
    autoFocus?: boolean;
}) {
    const { upload, pick, uploading, input } = useStatementUpload(onUploaded, onResult);
    const [dragging, setDragging] = useState(false);
    const pickRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!autoFocus) return;
        const el = pickRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "center" });
    }, [autoFocus]);

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
    }

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
                "rounded-panel border border-dashed bg-paper px-6 py-10 text-center sm:px-8 sm:py-12",
                "transition-colors duration-100",
                // Signal only while the file is actually over the target. A
                // dropzone that is permanently cyan is just a coloured box.
                dragging ? "border-signal bg-wash/20" : "border-muted",
                className
            )}
        >
            <div
                aria-hidden
                className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-input border border-mist bg-canvas text-ash"
            >
                {uploading ? (
                    <Loader2 size={18} className="animate-spin text-signal" />
                ) : (
                    <FileUp size={18} />
                )}
            </div>

            <p className="font-display text-title-md font-normal text-ink">
                {uploading ? "Leyendo tu estado de cuenta…" : "Sube tu estado de cuenta"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-body text-graphite">
                {uploading
                    ? "Tomin saca los movimientos y desecha el archivo. Toma unos segundos."
                    : "PDF de tu banco o XML del SAT. Tomin lo lee y lo desecha: solo guarda los movimientos."}
            </p>

            <div className="mt-6">
                <Button
                    ref={pickRef}
                    loading={uploading}
                    onClick={pick}
                    icon={<FileUp size={16} />}
                    className="text-ink"
                >
                    Elegir archivo
                </Button>
            </div>
            <p className="mt-3 hidden text-label text-ash sm:block">
                …o arrástralo aquí desde tu carpeta de descargas.
            </p>

            {input}
        </div>
    );
}
