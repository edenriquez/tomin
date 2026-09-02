const STEPS = [
    { title: "Subes el archivo", body: "El PDF de tu banco o el XML del SAT, arrastrado a la pantalla. Nada de credenciales." },
    { title: "Tomin lo lee y lo desecha", body: "Extrae los movimientos, detecta el banco, categoriza y descarta el archivo original." },
    { title: "Ves tu dinero", body: "Gráficas, categorías y cobros recurrentes desde el primer documento — y mejores con cada corrección tuya." },
];

/** Three steps on one rule: a timeline read left to right. */
export function StepsB() {
    return (
        <section id="como-funciona" className="mx-auto w-full max-w-page scroll-mt-20 px-5 py-14 sm:px-8 sm:py-20">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="mt-3 text-title-md sm:text-title-lg">Tres pasos. Ninguno pide tu contraseña.</h2>
            <ol className="relative mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
                <span aria-hidden className="absolute left-0 right-0 top-[7px] hidden h-px bg-lineStrong sm:block" />
                {STEPS.map((s, i) => (
                    <li key={s.title} className="relative sm:pt-8">
                        <span
                            aria-hidden
                            className="absolute left-0 top-0 hidden h-[15px] w-[15px] rounded-full border-2 border-signal bg-night sm:block"
                        />
                        <span className="eyebrow">Paso {i + 1}</span>
                        <h3 className="mt-2 text-title-sm">{s.title}</h3>
                        <p className="mt-1.5 text-body-sm text-dust">{s.body}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
