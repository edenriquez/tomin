import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, X } from 'lucide-react';

interface NotificationToastProps {
    message: string;
    onRefresh?: () => void;
    onClose: () => void;
}

export const NotificationToast = ({ message, onRefresh, onClose }: NotificationToastProps) => {
    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-4 rounded-2xl border border-blue-200/50 bg-white/80 p-4 shadow-2xl backdrop-blur-xl dark:border-blue-900/30 dark:bg-[#1a2332]/90">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                    <CheckCircle2 size={24} />
                </div>

                <div className="flex flex-col">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Actualización Completa</p>
                    <p className="text-xs text-gray-500">{message}</p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
                        >
                            <RefreshCw size={14} className="animate-spin-slow" />
                            Refrescar
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
