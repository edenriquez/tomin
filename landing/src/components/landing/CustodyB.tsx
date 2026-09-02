import { GraduationCap, ShieldCheck, Timer } from "lucide-react";

const CELLS = [
    {
        icon: GraduationCap,
        title: "Aprende de ti",
        body: "Renombra «POCK*SUPERLECLERC» a «Súper de la esquina» una vez: se aplica a los parecidos y a cada estado de cuenta que subas después.",
    },
    {
        icon: ShieldCheck,
        title: "Nunca tu contraseña",
        body: "No conectamos tu banco. Un PDF que ya tienes es toda la entrada; el original se desecha al terminar de leerlo.",
    },
    {
        icon: Timer,
        title: "Un archivo basta",
        body: "Nu, Banamex, Azteca o cualquier PDF bancario. El primero ya dibuja tus gráficas; cada uno que sumes afina la historia.",
    },
];

export function CustodyB() {
    return (
        <section className="mx-auto w-full max-w-page px-5 py-6 sm:px-8">
            <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3">
                {CELLS.map(({ icon: Icon, title, body }) => (
                    <div key={title} className="bg-night p-5 sm:p-6">
                        <Icon size={16} className="text-signal" aria-hidden />
                        <h3 className="mt-2.5 text-title-sm">{title}</h3>
                        <p className="mt-1.5 text-body-sm text-dust">{body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
