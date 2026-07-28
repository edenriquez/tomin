import type { ReactNode } from "react";
import { HomeLayoutProvider } from "@/widgets/HomeLayoutProvider";

/**
 * `sheet` is a parallel route slot holding the intercepted widget picker
 * (`@sheet/(.)catalogo`). Both slots sit inside one HomeLayoutProvider so the
 * picker mutates the same layout the grid behind it is rendering.
 */
export default function InicioLayout({
    children,
    sheet,
}: {
    children: ReactNode;
    sheet: ReactNode;
}) {
    return (
        <HomeLayoutProvider>
            {children}
            {sheet}
        </HomeLayoutProvider>
    );
}
