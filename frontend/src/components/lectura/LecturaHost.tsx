"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BottomSheet } from "@/components/ui";
import type { Workstation } from "@/lib/workstations";
import { useLectura } from "./LecturaProvider";
import { LecturaPanel } from "./LecturaPanel";

/** The open set, as a bottom sheet over whichever view committed it. Hidden
 *  on the Lecturas list itself — that route already *is* the reading. */
export function LecturaHost() {
    const pathname = usePathname();
    const { workstation, close } = useLectura();
    const hidden = pathname.startsWith("/workspace");
    const [shown, setShown] = useState<Workstation | null>(null);

    useEffect(() => {
        if (workstation) setShown(workstation);
    }, [workstation]);

    return (
        <BottomSheet
            open={Boolean(workstation) && !hidden}
            onClose={close}
            title={shown?.name ?? "Lectura"}
        >
            {shown && <LecturaPanel workstation={shown} onClose={close} />}
        </BottomSheet>
    );
}
