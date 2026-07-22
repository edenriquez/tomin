"use client";

import { UploadButton } from "@/components/UploadButton";

export default function SettingsPage() {
    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-slate-500 text-sm">Manage your preferences</p>

            <section className="card mt-6">
                <h2 className="font-semibold">Personal Information</h2>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <Field label="Full Name" defaultValue="Alejandro Martinez" />
                    <Field label="RFC (Tax ID)" defaultValue="MARS880123H20" hint="Required for SAT integration." />
                    <Field label="Email Address" defaultValue="alejandro@example.com" />
                    <Field label="Monthly Income Goal" defaultValue="45,000 MXN" />
                </div>
            </section>

            <section className="card mt-6">
                <h2 className="font-semibold">Financial Data Sources</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Upload bank statements or SAT files (PDF / XML). Files are processed and the raw
                    document is never stored on our servers.
                </p>
                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 p-6">
                    <UploadButton />
                </div>
            </section>

            <section className="card mt-6">
                <h2 className="font-semibold">AI Assistant</h2>
                <label className="mt-3 block text-sm text-slate-600">Advice Aggressiveness</label>
                <div className="mt-2 inline-flex rounded-lg border border-slate-200 p-1 text-sm">
                    {["Conservative", "Balanced", "Aggressive"].map((o) => (
                        <button
                            key={o}
                            className="rounded-md px-3 py-1 data-[active=true]:bg-brand data-[active=true]:text-white"
                            data-active={o === "Balanced"}
                        >
                            {o}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

function Field({
    label,
    defaultValue,
    hint,
}: {
    label: string;
    defaultValue: string;
    hint?: string;
}) {
    return (
        <div>
            <label className="text-sm text-slate-600">{label}</label>
            <input
                defaultValue={defaultValue}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
    );
}
