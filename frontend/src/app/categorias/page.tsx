"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Retired: Categorías is a face of Movimientos. The next.config redirect
 * handles bookmarks; this covers client navigations that still have the path.
 */
export default function CategoriasRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/");
    }, [router]);
    return null;
}
