'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden bg-gradient-to-b from-white via-purple-50/30 to-white">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
                        Tomin <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">La herramienta que te ayuda a predecir </span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">tus finanzas</span>
                    </h1>
                    <div className="flex justify-center gap-4">
                        <Link
                            href="/login"
                            className="group inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 md:text-lg transition-all shadow-[0_4px_20px_0_rgba(147,51,234,0.3)] hover:shadow-[0_8px_30px_0_rgba(147,51,234,0.4)] hover:scale-105"
                        >
                            Iniciar sesión
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Background decoration */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full z-0 pointer-events-none">
                <div className="absolute top-20 left-10 w-96 h-96 bg-purple-300/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob"></div>
                <div className="absolute top-20 right-10 w-96 h-96 bg-blue-300/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-blob animation-delay-4000"></div>
            </div>
        </section>
    );
}
