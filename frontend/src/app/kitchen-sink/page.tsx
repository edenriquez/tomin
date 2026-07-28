import { notFound } from "next/navigation";
import { KitchenSink } from "./KitchenSink";

/**
 * Dev-only gallery of every primitive in every state.
 *
 * Not `_kitchen-sink`: an underscore prefix makes the folder *private* in the
 * App Router, so it produces no route at all and the page is unreachable even
 * in development. The production gate below is what keeps it out of the build.
 */
export default function KitchenSinkPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return <KitchenSink />;
}
