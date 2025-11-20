'use client';

import { motion } from 'framer-motion';

export default function AnxietySection() {
    return (
        <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-purple-200/20 rounded-full filter blur-[100px]"></div>
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-200/20 rounded-full filter blur-[100px]"></div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="bg-white/60 backdrop-blur-xl rounded-3xl p-12 shadow-[0_8px_32px_0_rgba(147,51,234,0.12)] border border-white/60"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
                        Deja de estresarte por tu dashboard
                    </h2>
                    <p className="text-xl text-gray-600 mb-12 font-light">
                        Uno de los principales objetivos de Tomin es reducir la ansiedad de entrar a un dashboard lleno de información sin saber qué mover para encontrar la información correcta.
                    </p>
                    <blockquote className="text-2xl sm:text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 italic">
                        "Queremos devolverle al usuario el control sobre sus finanzas"
                    </blockquote>
                </motion.div>
            </div>
        </section>
    );
}
