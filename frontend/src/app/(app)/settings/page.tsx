"use client";

import { useState } from "react";
import { UploadButton } from "@/components/UploadButton";
import { Card, Field, Input, PageHeader, Tabs } from "@/components/ui";

const AGGRESSIVENESS = [
    { value: "conservative", label: "Conservador" },
    { value: "balanced", label: "Balanceado" },
    { value: "aggressive", label: "Agresivo" },
];

export default function SettingsPage() {
    // Nothing here persists yet — the save path lands in F6.
    const [advice, setAdvice] = useState("balanced");

    return (
        <div className="max-w-3xl">
            <PageHeader title="Ajustes" subtitle="Administra tus preferencias." />

            <Card title="Informacion personal" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nombre completo">
                        {(p) => <Input {...p} defaultValue="Alejandro Martinez" />}
                    </Field>
                    <Field label="RFC" hint="Necesario para la integracion con el SAT.">
                        {(p) => <Input {...p} defaultValue="MARS880123H20" />}
                    </Field>
                    <Field label="Correo electronico">
                        {(p) => <Input {...p} type="email" defaultValue="alejandro@example.com" />}
                    </Field>
                    <Field label="Meta de ingreso mensual">
                        {(p) => <Input {...p} defaultValue="45,000 MXN" />}
                    </Field>
                </div>
            </Card>

            <Card title="Fuentes de datos" className="mt-6">
                <p className="text-body-sm text-pewter">
                    Sube estados de cuenta o archivos del SAT (PDF / XML). Los archivos se procesan
                    y el documento original nunca se guarda en nuestros servidores.
                </p>
                <div className="mt-4 rounded-card border border-dashed border-mist p-6">
                    <UploadButton />
                </div>
            </Card>

            <Card title="Asistente" className="mt-6">
                <p className="mb-2 text-body-sm text-graphite">Nivel de recomendaciones</p>
                <Tabs
                    aria-label="Nivel de recomendaciones"
                    items={AGGRESSIVENESS}
                    value={advice}
                    onChange={setAdvice}
                />
            </Card>
        </div>
    );
}
