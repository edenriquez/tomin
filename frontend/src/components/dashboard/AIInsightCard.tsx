import React from 'react';
import { Sparkles } from 'lucide-react';

export const AIInsightCard: React.FC = () => {
    return (
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm dark:from-[#1a2332] dark:to-blue-900/10 dark:border-blue-900/30">
            <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <Sparkles size={20} />
                    <h3>Tomin AI Insight</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    ¡Estás gastando un <strong>15% menos</strong> en restaurantes este mes! Sigue así para alcanzar tu meta de viaje a Cancún más rápido.
                </p>
                <button className="w-full btn-primary py-2 text-sm">
                    Ver detalles
                </button>
            </div>
        </div>
    );
};
