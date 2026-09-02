import { FIGURES } from "@/lib/data";
import { DARK } from "@/components/shared/mock/palette";
import { ScatterMock } from "@/components/shared/mock/ScatterMock";
import { StackMock } from "@/components/shared/mock/StackMock";
import { CalendarMock } from "@/components/shared/mock/CalendarMock";
import { ForecastMock } from "@/components/shared/mock/ForecastMock";
import { TicketMock } from "@/components/shared/mock/TicketMock";
import { SealMock } from "@/components/shared/mock/SealMock";
import { BentoCard } from "./BentoCard";

/** The product as six readings. Sizes follow weight: the ledger is widest. */
export function BentoB() {
    return (
        <section aria-label="Lo que vas a ver" className="mx-auto w-full max-w-page px-5 py-10 sm:px-8 sm:py-14">
            <p className="eyebrow">Lo que vas a ver</p>
            <h2 className="mt-3 max-w-[22ch] text-title-md sm:text-title-lg">
                Seis lecturas de un solo PDF.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                <BentoCard
                    className="lg:col-span-7"
                    eyebrow="Movimientos"
                    metric={String(FIGURES.movements)}
                    title="Cada movimiento, dibujado"
                    body="Un punto por cargo: el sospechoso y el más caro saltan a la vista. Tócalo y edítalo ahí mismo."
                    mock={<ScatterMock p={DARK} />}
                    mockClassName="sm:h-52"
                />
                <BentoCard
                    className="lg:col-span-5"
                    eyebrow="Categorías"
                    metric={`${FIGURES.categoriesTop} ${FIGURES.categoriesTopShare}`}
                    title="Cada mes, por categoría"
                    body="Columnas apiladas que dicen cuánto costó cada mes y en qué."
                    mock={<StackMock p={DARK} />}
                    mockClassName="sm:h-52"
                />
                <BentoCard
                    className="lg:col-span-4"
                    eyebrow="Fijos"
                    metric={`${FIGURES.fixedMonthly}/mes`}
                    title="Tus cobros recurrentes"
                    body={`${FIGURES.fixedCount} ${FIGURES.fixedCaption}, con su ritmo y su próximo cobro.`}
                    mock={<CalendarMock p={DARK} />}
                />
                <BentoCard
                    className="lg:col-span-4"
                    eyebrow="Pronóstico"
                    metric={FIGURES.forecastNeed}
                    title="Lo que necesitas antes de la quincena"
                    body="Tus ingresos etiquetados contra lo que ya está comprometido."
                    mock={<ForecastMock p={DARK} />}
                />
                <BentoCard
                    className="lg:col-span-4"
                    eyebrow="Precios"
                    metric={FIGURES.ticketDelta}
                    title={FIGURES.ticketLine}
                    body="Fotografía el ticket del súper. El teléfono lo lee y Tomin sigue el precio de cada producto."
                    mock={<TicketMock p={DARK} />}
                />
                <BentoCard
                    className="sm:col-span-2 lg:col-span-12"
                    eyebrow="Custodia"
                    title="Tu archivo no se guarda"
                    body="Leemos el PDF, extraemos los movimientos y lo desechamos. Solo tus números se quedan — y son tuyos."
                    mock={<SealMock p={DARK} className="h-full w-full max-w-[200px]" />}
                    mockClassName="h-32 items-center justify-center sm:h-36"
                />
            </div>
        </section>
    );
}
