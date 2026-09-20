"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Retired: Precios is a face of Movimientos. The next.config redirect handles
 * bookmarks and the link the phone hands out after a ticket; this covers client
 * navigations that still carry the old path.
 */
export default function PreciosRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/?cara=precios");
    }, [router]);
    return null;
}
