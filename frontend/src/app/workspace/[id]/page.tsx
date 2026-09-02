"use client";

import { useParams } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { WorkstationDetail } from "@/components/workspace/WorkstationDetail";

/**
 * One saved lens.
 *
 * The workstation is read out of the layout's list rather than fetched again —
 * it is already there, and a second fetch would let the title and the sidebar
 * disagree for a moment after a rename.
 */
export default function WorkstationPage() {
    const { id } = useParams<{ id: string }>();
    const { items } = useWorkspace();

    if (items === null) {
        return (
            <div className="min-w-0">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="mt-6 h-24 w-full" />
                <Skeleton className="mt-6 h-64 w-full" />
            </div>
        );
    }

    const workstation = items.find((w) => w.id === id);
    if (!workstation) {
        // Reachable by a stale link or a lens deleted in another tab. A 404
        // that says so beats a spinner that never resolves.
        return (
            <EmptyState icon={FlaskConical} title="Esta lectura ya no existe">
                Puede que lo hayas borrado. Elige otro de la lista o crea uno nuevo.
            </EmptyState>
        );
    }

    return <WorkstationDetail workstation={workstation} />;
}
