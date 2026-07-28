"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button, useToast } from "@/components/ui";

export function UploadButton({ onDone }: { onDone?: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    async function handleFile(file: File) {
        setUploading(true);
        try {
            const result = await api.uploadStatement(file);
            toast(
                `Listo: ${result.transactions_created} movimientos (${result.template})`,
                "positive"
            );
            onDone?.();
        } catch (e) {
            toast(`No se pudo procesar el archivo: ${(e as Error).message}`, "negative");
        } finally {
            setUploading(false);
            // Without this, re-selecting the same file fires no change event.
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    return (
        <div>
            <Button
                variant="secondary"
                fullWidth
                loading={uploading}
                icon={<Upload size={16} />}
                onClick={() => inputRef.current?.click()}
            >
                Subir documento
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.xml"
                hidden
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
        </div>
    );
}
