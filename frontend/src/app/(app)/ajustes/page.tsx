"use client";

import { useState } from "react";
import { UploadButton } from "@/components/UploadButton";
import { Card, Field, Input, PageHeader, Tabs } from "@/components/ui";
import { useProfile } from "@/lib/profile";

const AGGRESSIVENESS = [
    { value: "conservative", label: "Conservador" },
    { value: "balanced", label: "Balanceado" },
    { value: "aggressive", label: "Agresivo" },
];

export default function AjustesPage() {
    // Nothing here persists yet — the save path lands in F6.
    const [advice, setAdvice] = useState("balanced");
    const profile = useProfile();

    return (
        <div className="max-w-3xl space-y-12">
            <PageHeader title="Ajustes" subtitle="Administra tus preferencias." />

            {/* Empty inputs with placeholders, not invented values: a fake RFC
                sitting in a real form reads as data Tomin already has. */}
            <Card title="Informacion personal">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nombre completo">
                        {(p) => (
                            <Input {...p} defaultValue={profile.name} placeholder="Tu nombre" />
                        )}
                    </Field>
                    <Field label="RFC" hint="Necesario para la integracion con el SAT.">
                        {(p) => <Input {...p} defaultValue="" placeholder="XAXX010101000" />}
                    </Field>
                    <Field label="Correo electronico">
                        {(p) => (
                            <Input
                                {...p}
                                type="email"
                                defaultValue={profile.email ?? ""}
                                placeholder="tu@correo.com"
                            />
                        )}
                    </Field>
                    <Field label="Meta de ingreso mensual" hint="En pesos, sin centavos.">
                        {(p) => (
                            <Input {...p} inputMode="numeric" defaultValue="" placeholder="45000" />
                        )}
                    </Field>
                </div>
            </Card>

            <Card title="Fuentes de datos">
                <p className="text-body-sm text-pewter">
                    Sube estados de cuenta o facturas del SAT (PDF / XML). Los archivos se procesan
                    y el documento original nunca se guarda en nuestros servidores.
                </p>
                <div className="mt-4 rounded-card border border-dashed border-mist p-6">
                    <UploadButton />
                </div>
            </Card>

            <Card title="Asistente">
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
