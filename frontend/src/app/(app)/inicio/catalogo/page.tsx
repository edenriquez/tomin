"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, PageHeader } from "@/components/ui";
import { WidgetCatalog } from "@/components/widgets/WidgetCatalog";

/**
 * The hard-navigation fallback for the picker.
 *
 * A Sheet rendered over `/inicio` is the normal experience (see
 * `@sheet/(.)catalogo`), but a pasted link, a refresh or an open-in-new-tab
 * reaches this. Same component, full page — the URL is real either way.
 */
export default function CatalogoPage() {
    return (
        <div className="space-y-8">
            <PageHeader
                title="Catalogo"
                subtitle="Elige que quieres ver en tu inicio."
                actions={
                    <Link href="/inicio">
                        <Button variant="secondary" icon={<ArrowLeft size={16} />}>
                            Volver
                        </Button>
                    </Link>
                }
            />
            <div className="max-w-2xl">
                <WidgetCatalog />
            </div>
        </div>
    );
}
