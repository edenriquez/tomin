"use client";

import { UploadButton } from "@/components/UploadButton";

export default function SettingsPage() {
    return (
        <div className="max-w-3xl">
            <h1 className="text-title-md font-semibold text-ink">Settings</h1>
            <p className="text-body-sm text-pewter">Manage your preferences</p>

            <section className="card mt-6">
                <h2 className="text-title-sm font-semibold text-ink">Personal Information</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <SettingField label="Full Name" defaultValue="Alejandro Martinez" />
                    <SettingField
                        label="RFC (Tax ID)"
                        defaultValue="MARS880123H20"
                        hint="Required for SAT integration."
                    />
                    <SettingField label="Email Address" defaultValue="alejandro@example.com" />
                    <SettingField label="Monthly Income Goal" defaultValue="45,000 MXN" />
                </div>
            </section>

            <section className="card mt-6">
                <h2 className="text-title-sm font-semibold text-ink">Financial Data Sources</h2>
                <p className="mt-1 text-body-sm text-pewter">
                    Upload bank statements or SAT files (PDF / XML). Files are processed and the raw
                    document is never stored on our servers.
                </p>
                <div className="mt-4 rounded-card border border-dashed border-mist p-6">
                    <UploadButton />
                </div>
            </section>

            <section className="card mt-6">
                <h2 className="text-title-sm font-semibold text-ink">AI Assistant</h2>
                <label className="mt-3 block text-body-sm text-graphite">
                    Advice Aggressiveness
                </label>
                <div className="mt-2 inline-flex rounded-control border border-mist p-1 text-body-sm">
                    {["Conservative", "Balanced", "Aggressive"].map((o) => (
                        <button
                            key={o}
                            className="rounded-tag px-3 py-1 text-graphite data-[active=true]:bg-ember data-[active=true]:font-semibold data-[active=true]:text-ink"
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

function SettingField({
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
            <label className="text-body-sm text-graphite">{label}</label>
            <input
                defaultValue={defaultValue}
                className="mt-1 w-full rounded-control border border-mist bg-paper px-3 py-2 text-body-sm text-ink"
            />
            {hint && <p className="mt-1 text-label text-pewter">{hint}</p>}
        </div>
    );
}
