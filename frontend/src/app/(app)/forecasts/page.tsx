"use client";

import { useEffect, useState } from "react";
import { api, ForecastPoint } from "@/lib/api";
import { mxn, pct } from "@/lib/format";
import { MetricCard } from "@/components/MetricCard";
import { ProjectionChart } from "@/components/charts/ProjectionChart";

export default function ForecastsPage() {
    const [points, setPoints] = useState<ForecastPoint[]>([]);
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
        const r = await api.simulate(sim);
        setPoints(r.points);
    }

    const last = points[points.length - 1];

    return (
        <div>
            <h1 className="text-title-md font-semibold text-ink">Your Financial Future</h1>
            <p className="text-body-sm text-pewter">
                Visualize and optimize your strategy with AI insights.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <MetricCard
                    label="Projected Net Worth"
                    value={last ? mxn(last.optimized) : "-"}
                    hint="Optimized scenario"
                />
                <MetricCard
                    label="Baseline"
                    value={last ? mxn(last.baseline) : "-"}
                    hint="Sin cambios"
                    hintColor="text-pewter"
                />
                <MetricCard
                    label="Monthly Free Cash Flow"
                    value={mxn(sim.monthly_income - sim.monthly_expenses)}
                    hint="Ingresos - Gastos"
                />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
                <section className="card md:col-span-2 min-w-0">
                    <h2 className="mb-4 text-title-sm font-semibold text-ink">
                        Net Worth Projection
                    </h2>
                    {points.length ? (
                        <ProjectionChart points={points} />
                    ) : (
                        <p className="text-body-sm text-pewter">
                            Ajusta el simulador y presiona &quot;Simular&quot;.
                        </p>
                    )}
                </section>

                <section className="card">
                    <h2 className="mb-4 text-title-sm font-semibold text-ink">
                        Forecast Simulator
                    </h2>
                    <SimSlider
                        label="Monthly Savings"
                        value={sim.monthly_savings}
                        min={0}
                        max={30000}
                        onChange={(v) => setSim({ ...sim, monthly_savings: v })}
                        format={mxn}
                    />
                    <SimSlider
                        label="Discretionary Spending"
                        value={sim.monthly_expenses}
                        min={0}
                        max={40000}
                        onChange={(v) => setSim({ ...sim, monthly_expenses: v })}
                        format={mxn}
                    />
                    <SimSlider
                        label="Investment Return"
                        value={sim.annual_return_rate}
                        min={0.02}
                        max={0.15}
                        step={0.005}
                        onChange={(v) => setSim({ ...sim, annual_return_rate: v })}
                        format={pct}
                    />
                    <button
                        onClick={runSimulation}
                        className="mt-4 w-full rounded-control bg-ember px-4 py-2 text-body-sm font-semibold text-ink"
                    >
                        Simular
                    </button>
                </section>
            </div>
        </div>
    );
}

function SimSlider({
    label,
    value,
    min,
    max,
    step = 500,
    onChange,
    format,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
}) {
    return (
        <div className="mb-4">
            <div className="flex items-center justify-between text-body-sm">
                <span className="text-graphite">{label}</span>
                <span className="tabular font-medium text-ink">{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="mt-1 w-full accent-ember"
            />
        </div>
    );
}
