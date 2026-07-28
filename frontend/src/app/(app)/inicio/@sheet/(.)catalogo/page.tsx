"use client";

import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui";
import { WidgetCatalog } from "@/components/widgets/WidgetCatalog";

/**
 * The picker as a Sheet over the grid — an intercepting route, so the URL is
 * `/inicio/catalogo` and shareable while the page behind it stays mounted.
 * Closing is `router.back()`: the Sheet is a history entry, not a piece of
 * component state.
 */
export default function CatalogoSheet() {
    const router = useRouter();
    return (
        <Sheet
            open
            onClose={() => router.back()}
            title="Catalogo"
            description="Elige que quieres ver en tu inicio."
        >
            <WidgetCatalog />
        </Sheet>
    );
}
