"use client";

import { useState } from "react";
import { UploadButton } from "@/components/UploadButton";
import { Button, Card, Field, Input, PageHeader, Tabs, Tag } from "@/components/ui";
import { useProfile } from "@/lib/profile";

const AGGRESSIVENESS = [
    { value: "conservative", label: "Conservador" },
    { value: "balanced", label: "Balanceado" },
    { value: "aggressive", label: "Agresivo" },
];

/**
 * There is no profiles endpoint yet: the API has nothing to PUT a name, an RFC
 * or a preference to. Rather than render a Guardar button that throws the form
 * away on reload — the worst outcome, because the user believes it saved — the
 * editable sections are shown disabled and labelled "Proximamente".
 *
 * Two fields were removed outright rather than disabled. "RFC" and "Meta de
 * ingreso mensual" were never wired to anything and there is no feature waiting
 * on them, so a greyed-out input would only be a promise nobody made.
 *
 * What stays is what Tomin actually knows (`lib/profile.ts`) and what actually
 * works (the uploader). When `PUT /api/profile` lands, delete `readOnly` here.
 */
const PROXIMAMENTE = <Tag tone="estimate">Proximamente</Tag>;

export default function AjustesPage() {
    const [advice, setAdvice] = useState("balanced");
    const profile = useProfile();

    return (
        <div className="max-w-3xl space-y-12">
            <PageHeader title="Ajustes" subtitle="Administra tus preferencias." />

            <Card title="Informacion personal" actions={PROXIMAMENTE}>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nombre">
                        {(p) => <Input {...p} value={profile.name} disabled readOnly />}
                    </Field>
                    <Field label="Correo electronico">
                        {(p) => (
                            <Input
                                {...p}
                                type="email"
                                value={profile.email ?? ""}
                                placeholder="Sin cuenta todavia"
                                disabled
                                readOnly
                            />
                        )}
                    </Field>
                </div>
                <div className="mt-4 flex items-center gap-3">
                    <Button disabled>Guardar</Button>
                    <p className="text-label text-pewter">
                        Tomin funciona sin registro por ahora, asi que no hay a donde guardar un
                        perfil. Llega con las cuentas de usuario.
                    </p>
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

            <Card title="Asistente" actions={PROXIMAMENTE}>
                <p className="mb-2 text-body-sm text-graphite">Nivel de recomendaciones</p>
                <Tabs
                    aria-label="Nivel de recomendaciones"
                    items={AGGRESSIVENESS}
                    value={advice}
                    onChange={setAdvice}
                />
                <p className="mt-3 text-label text-pewter">
                    La seleccion se pierde al recargar: todavia no cambia las recomendaciones.
                </p>
            </Card>
        </div>
    );
}
