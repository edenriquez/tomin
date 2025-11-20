'use client';

import { motion } from 'framer-motion';

export default function AnxietySection() {
    return (
        <section className="py-24 bg-gradient-to-b from-white to-blue-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
                        Stop stressing about your dashboard
                    </h2>
                    <p className="text-xl text-gray-600 mb-12">
                        One of the main goals of Tomin is to reduce the anxiety of entering a dashboard full of information not knowing what to move to find the right information.
                    </p>
                    <blockquote className="text-2xl sm:text-3xl font-medium text-blue-900 italic">
                        "We want to get back the user the control over their finances"
                    </blockquote>
                </motion.div>
            </div>
        </section>
    );
}
