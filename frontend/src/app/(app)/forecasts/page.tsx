"use client";

import { useEffect, useState } from "react";
import { api, ForecastPoint, mxn } from "@/lib/api";
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
            <h1 className="text-2xl font-bold">Your Financial Future</h1>
            <p className="text-slate-500 text-sm">
                Visualize and optimize your strategy with AI insights.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
                <MetricCard
                    label="Projected Net Worth"
                    value={last ? mxn(last.optimized) : "-"}
                    hint="Optimized scenario"
                />
                <MetricCard
                    label="Baseline"
                    value={last ? mxn(last.baseline) : "-"}
                    hint="Sin cambios"
                    hintColor="text-slate-500"
                />
                <MetricCard
                    label="Monthly Free Cash Flow"
                    value={mxn(sim.monthly_income - sim.monthly_expenses)}
                    hint="Ingresos - Gastos"
                />
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-6">
                <section className="card md:col-span-2">
                    <h2 className="font-semibold mb-4">Net Worth Projection</h2>
                    {points.length ? (
                        <ProjectionChart points={points} />
                    ) : (
                        <p className="text-sm text-slate-500">
                            Ajusta el simulador y presiona &quot;Simular&quot;.
                        </p>
                    )}
                </section>

                <section className="card">
                    <h2 className="font-semibold mb-4">Forecast Simulator</h2>
                    <Slider
                        label="Monthly Savings"
                        value={sim.monthly_savings}
                        min={0}
                        max={30000}
                        onChange={(v) => setSim({ ...sim, monthly_savings: v })}
                        format={mxn}
                    />
                    <Slider
                        label="Discretionary Spending"
                        value={sim.monthly_expenses}
                        min={0}
                        max={40000}
                        onChange={(v) => setSim({ ...sim, monthly_expenses: v })}
                        format={mxn}
                    />
                    <Slider
                        label="Investment Return"
                        value={sim.annual_return_rate}
                        min={0.02}
                        max={0.15}
                        step={0.005}
                        onChange={(v) => setSim({ ...sim, annual_return_rate: v })}
                        format={(v) => `${(v * 100).toFixed(1)}%`}
                    />
                    <button
                        onClick={runSimulation}
                        className="mt-4 w-full rounded-lg bg-brand px-4 py-2 text-sm text-white"
                    >
                        Simular
                    </button>
                </section>
            </div>
        </div>
    );
}

function Slider({
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
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-brand">{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-brand mt-1"
            />
        </div>
    );
}
