"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { api } from "@/lib/api";

export function UploadButton({ onDone }: { onDone?: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<string | null>(null);

    async function handleFile(file: File) {
        setStatus("Procesando...");
        try {
            const result = await api.uploadStatement(file);
            setStatus(`Listo: ${result.transactions_created} movimientos (${result.template})`);
            onDone?.();
        } catch (e) {
            setStatus(`Error: ${(e as Error).message}`);
        }
    }

    return (
        <div>
            <button
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
                <Upload size={16} /> Subir Estado de Cuenta
            </button>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.xml"
                hidden
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
        </div>
    );
}
