import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { fontSize } from "@/design/tokens";

/**
 * tailwind-merge cannot tell `text-body-sm` (a font size) from `text-ink` (a
 * colour) without being told, and silently drops the earlier of the two. Feed
 * it the token scale so both survive on the same element.
 */
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [{ text: Object.keys(fontSize) }],
        },
    },
});

/** Conditional classes with later Tailwind utilities winning over earlier ones. */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
