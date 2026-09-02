"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AppChrome } from "@/components/AppChrome";
import { RuleEditorSheet } from "@/components/workspace/RuleEditorSheet";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";

/**
 * The Workspace chassis: the lens list on the left, the open lens on the right.
 *
 * The sidebar lives in the layout rather than in each page so it does not
 * remount on navigation — and so its list and the open detail read the same
 * array through `WorkspaceProvider`. Below `lg` it disappears entirely and
 * `/workspace` becomes the list; the detail carries its own "← Lecturas". One
 * route pair, two widths, no drawer and no gestures to teach.
 *
 * `withWindow` because a cohort reading is scoped to the period the user is
 * looking at (unlike the advisor, which ignores it). It degrades honestly on a
 * short window: the backend withholds the rates and the frame says how much
 * history is missing, rather than printing a per-month figure from ten days.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
    return (
        <AppChrome withWindow>
            <Shell>{children}</Shell>
        </AppChrome>
    );
}

/** Split so the hooks below run inside the provider. */
function Shell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { create, creation, startCreating, stopCreating } = useWorkspace();

    const activeId = pathname.startsWith("/workspace/")
        ? pathname.slice("/workspace/".length)
        : undefined;

    return (
        <>
            <div className="flex gap-8">
                <aside className="hidden lg:block">
                    <WorkspaceSidebar activeId={activeId} onNew={() => startCreating()} />
                </aside>
                {/* min-w-0 is load-bearing: without it the Apex SVG inside the
                    detail refuses to shrink and the whole page scrolls
                    sideways the first time the window narrows. */}
                <div className="min-w-0 flex-1">{children}</div>
            </div>

            <RuleEditorSheet
                open={creation !== null}
                seed={creation?.seed}
                onClose={stopCreating}
                onSave={async (draft) => {
                    const created = await create(draft);
                    // Straight into the thing you just made. Landing back on
                    // the list would make you find it yourself.
                    if (created) router.push(`/workspace/${created.id}`);
                    return created;
                }}
            />
        </>
    );
}
