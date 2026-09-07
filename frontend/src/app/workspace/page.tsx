"use client";

import { FlaskConical } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";

/**
 * Three starters, each of which pre-fills a rule.
 *
 * An empty state that only says "create one" hands the user a blank rule
 * builder and asks them to invent the concept. These name the three sets almost
 * everyone actually has, and each one is a working example of what a rule *is*
 * — the catalog doubling as the explanation, the same trick the widget picker
 * used for locked widgets.
 */
const STARTERS = [
    { name: "Recargas telefónicas", needle: "recarga" },
    { name: "Retiros de efectivo", needle: "retiro" },
    { name: "Suscripciones", needle: "suscripcion" },
] as const;

/**
 * The Workspace landing.
 *
 * At `lg` and up the sidebar is already showing on the left, so this is the
 * "nothing open yet" panel. Below `lg` there is no sidebar, so this *is* the
 * list. Same component either way.
 */
export default function WorkspacePage() {
    const { items, startCreating } = useWorkspace();

    return (
        <div className="min-w-0">
            <div className="lg:hidden">
                <WorkspaceSidebar variant="page" onNew={() => startCreating()} />
            </div>

            <div className="hidden lg:block">
                {items?.length ? (
                    <EmptyState icon={FlaskConical} title="Elige una lectura">
                        O crea una nueva para aislar un grupo de movimientos y entenderlo.
                    </EmptyState>
                ) : (
                    <EmptyState
                        icon={FlaskConical}
                        title="Aísla un grupo de movimientos"
                        action={
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {STARTERS.map((s) => (
                                    <Button
                                        key={s.name}
                                        variant="ghost"
                                        onClick={() => startCreating(s.needle)}
                                    >
                                        {s.name}
                                    </Button>
                                ))}
                            </div>
                        }
                    >
                        Una lectura es una regla guardada («recarga», entre $10 y $300) y lo
                        que cae dentro. Puedes sumar varios filtros en un mismo grupo: spotify{" "}
                        <em>y</em> netflix <em>y</em> el gimnasio, leídos juntos.
                    </EmptyState>
                )}
            </div>
        </div>
    );
}
