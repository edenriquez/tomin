"use client";

import React, { useState } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    onChange: (val: number) => void;
    color?: string;
}

const SimulatorSlider = ({ label, value, min, max, unit, onChange, color = "bg-[#135bec]" }: SliderProps) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="group">
            <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {unit === '$' ? `$${value.toLocaleString()}` : `${value}${unit}`}
                </span>
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer">
                <div
                    className={`absolute h-full rounded-full ${color}`}
                    style={{ width: `${percentage}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 size-5 bg-white border-2 border-gray-400 rounded-full shadow transition-transform group-hover:scale-110"
                    style={{ left: `calc(${percentage}% - 10px)` }}
                />
            </div>
        </div>
    );
};

export const ForecastSimulator = () => {
    const [savings, setSavings] = useState(15000);
    const [spending, setSpending] = useState(8500);
    const [returns, setReturns] = useState(10);

    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-6">
                <Settings2 className="text-[#135bec]" size={20} />
                <h3 className="text-lg font-bold">Simulador de Futuro</h3>
            </div>

            <div className="space-y-8">
                <SimulatorSlider
                    label="Ahorro Mensual"
                    value={savings}
                    min={0}
                    max={30000}
                    unit="$"
                    onChange={setSavings}
                />
                <SimulatorSlider
                    label="Gasto Variable"
                    value={spending}
                    min={0}
                    max={20000}
                    unit="$"
                    onChange={setSpending}
                    color="bg-gray-800 dark:bg-gray-500"
                />
                <SimulatorSlider
                    label="Rendimiento Inversión"
                    value={returns}
                    min={1}
                    max={15}
                    unit="%"
                    onChange={setReturns}
                    color="bg-gray-800 dark:bg-gray-500"
                />

                <button
                    onClick={() => { setSavings(15000); setSpending(8500); setReturns(10); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <RotateCcw size={16} />
                    Restablecer Valores
                </button>
            </div>
        </div>
    );
};
