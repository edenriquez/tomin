'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FeatureSectionProps {
    title: string;
    description: string;
    children: ReactNode;
    align?: 'left' | 'right';
    index: number;
}

export default function FeatureSection({ title, description, children, align = 'left', index }: FeatureSectionProps) {
    const isLeft = align === 'left';

    return (
        <section className="py-20 overflow-hidden bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`flex flex-col md:flex-row items-center gap-12 ${isLeft ? '' : 'md:flex-row-reverse'}`}>
                    <motion.div
                        className="flex-1 w-full"
                        initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.7, delay: index * 0.1 }}
                    >
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(147,51,234,0.1)] border border-white/50 min-h-[300px] flex items-center justify-center hover:shadow-[0_8px_32px_0_rgba(147,51,234,0.2)] transition-all duration-300 hover:border-purple-200/50">
                            {children}
                        </div>
                    </motion.div>

                    <motion.div
                        className="flex-1 text-center md:text-left"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.7, delay: index * 0.1 + 0.2 }}
                    >
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
                        <p className="text-lg text-gray-600 leading-relaxed font-light">{description}</p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
