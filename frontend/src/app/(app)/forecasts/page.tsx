"use client";

import { useEffect, useState } from "react";
import { LineChart } from "lucide-react";
import { api, ForecastPoint } from "@/lib/api";
import { mxn, pct } from "@/lib/format";
import { ProjectionChart } from "@/components/charts/ProjectionChart";
import {
    Button,
    Card,
    EmptyState,
    PageHeader,
    Slider,
    StatTile,
    Tag,
    useToast,
} from "@/components/ui";

export default function ForecastsPage() {
    const [points, setPoints] = useState<ForecastPoint[]>([]);
    const [running, setRunning] = useState(false);
    const { toast } = useToast();
    const [sim, setSim] = useState({
        starting_net_worth: 10000,
        monthly_income: 45000,
        monthly_expenses: 28000,
        monthly_savings: 15000,
        annual_return_rate: 0.105,
        months: 12,
    });

    useEffect(() => {
        api.forecast()
            .then((r) => r.points.length && setPoints(r.points))
            .catch(() => {});
    }, []);

    async function runSimulation() {
        setRunning(true);
        try {
            const r = await api.simulate(sim);
            setPoints(r.points);
        } catch (e) {
            toast(`No se pudo simular: ${(e as Error).message}`, "negative");
        } finally {
            setRunning(false);
        }
    }

    const last = points[points.length - 1];

    return (
        <div>
            <PageHeader
                title="Tu futuro financiero"
                subtitle="Visualiza y optimiza tu estrategia."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatTile
                    label="Patrimonio proyectado"
                    value={last ? mxn(last.optimized) : undefined}
                    delta="Escenario optimizado"
                    aside={<Tag tone="estimate">Modelado</Tag>}
                />
                <StatTile
                    label="Base"
                    value={last ? mxn(last.baseline) : undefined}
                    delta="Sin cambios"
                />
                <StatTile
                    label="Flujo libre mensual"
                    value={mxn(sim.monthly_income - sim.monthly_expenses)}
                    delta="Ingresos - Gastos"
                />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
                <Card title="Proyeccion de patrimonio" className="min-w-0 md:col-span-2">
                    {points.length ? (
                        <ProjectionChart points={points} />
                    ) : (
                        <EmptyState
                            icon={<LineChart size={18} />}
                            title="Sin proyeccion todavia"
                            description="Ajusta el simulador y presiona Simular."
                        />
                    )}
                </Card>

                <Card title="Simulador">
                    <div className="space-y-5">
                        <Slider
                            label="Ahorro mensual"
                            value={sim.monthly_savings}
                            min={0}
                            max={30000}
                            step={500}
                            onChange={(v) => setSim({ ...sim, monthly_savings: v })}
                            format={mxn}
                        />
                        <Slider
                            label="Gasto discrecional"
                            value={sim.monthly_expenses}
                            min={0}
                            max={40000}
                            step={500}
                            onChange={(v) => setSim({ ...sim, monthly_expenses: v })}
                            format={mxn}
                        />
                        <Slider
                            label="Rendimiento anual"
                            value={sim.annual_return_rate}
                            min={0.02}
                            max={0.15}
                            step={0.005}
                            onChange={(v) => setSim({ ...sim, annual_return_rate: v })}
                            format={pct}
                        />
                    </div>
                    <Button className="mt-5" fullWidth loading={running} onClick={runSimulation}>
                        Simular
                    </Button>
                </Card>
            </div>
        </div>
    );
}
