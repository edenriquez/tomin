"use client";

import React from 'react';
import Link from 'next/link';
import {
    Wallet,
    Menu,
    Mail,
    CheckCircle,
    Lock,
    PieChart,
    TrendingUp,
    BarChart3,
    ArrowRight,
    ArrowUp,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] dark:bg-[#101622] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#101622]/80 backdrop-blur-md">
                <div className="px-4 md:px-10 py-3 max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#135bec]">
                        <div className="size-8 rounded bg-[#135bec]/10 flex items-center justify-center">
                            <Wallet className="text-[#135bec]" size={20} />
                        </div>
                        <h2 className="text-gray-900 dark:text-white text-xl font-bold tracking-tight">Tomin</h2>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <nav className="flex gap-6 items-center">
                            <a className="text-sm font-medium hover:text-[#135bec] transition-colors text-gray-700 dark:text-gray-300" href="#features">Funciones</a>
                            <a className="text-sm font-medium hover:text-[#135bec] transition-colors text-gray-700 dark:text-gray-300" href="#pricing">Precios</a>
                            <Link href="/login" className="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-[#135bec] transition-colors">Iniciar Sesión</Link>
                        </nav>
                        <Link
                            href="/login?mode=signup"
                            className="bg-[#135bec] hover:bg-blue-700 text-white text-sm font-bold h-10 px-5 rounded-lg transition-colors flex items-center"
                        >
                            Comenzar Ahora
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-gray-700 dark:text-gray-300"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#101622] border-b border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4">
                        <a className="text-sm font-medium text-gray-700 dark:text-gray-300" href="#features">Funciones</a>
                        <a className="text-sm font-medium text-gray-700 dark:text-gray-300" href="#pricing">Precios</a>
                        <Link href="/login" className="text-sm font-bold text-gray-700 dark:text-gray-300">Iniciar Sesión</Link>
                        <Link
                            href="/login?mode=signup"
                            className="bg-[#135bec] text-white text-center font-bold py-3 rounded-lg"
                        >
                            Comenzar Ahora
                        </Link>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="w-full px-4 md:px-10 py-12 md:py-20 max-w-7xl mx-auto">
                <div className="flex flex-col-reverse lg:flex-row gap-12 items-center">
                    {/* Content */}
                    <div className="flex flex-col gap-6 flex-1 max-w-2xl">
                        <div className="flex flex-col gap-4 text-left">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-gray-900 dark:text-white">
                                Toma el control de tu Peso. <span className="text-[#135bec]">Analiza, Proyecta y Crece</span> con IA.
                            </h1>
                            <h2 className="text-lg text-gray-600 dark:text-gray-400 font-normal leading-relaxed max-w-xl">
                                Tomin se conecta a tus cuentas para brindarte información automatizada, ayudándote a detectar hábitos de gasto y predecir tu futuro financiero sin el dolor de cabeza de las hojas de cálculo.
                            </h2>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                                window.location.href = `/login?mode=signup&email=${encodeURIComponent(email)}`;
                            }}
                            className="flex flex-col sm:flex-row gap-2 w-full max-w-lg mt-2"
                        >
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                    <Mail size={20} />
                                </div>
                                <input
                                    name="email"
                                    className="w-full h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white placeholder-gray-500 pl-10 pr-4 focus:ring-2 focus:ring-[#135bec] outline-none"
                                    placeholder="Ingresa tu correo electrónico"
                                    type="email"
                                    required
                                />
                            </div>
                            <button type="submit" className="h-12 px-6 bg-[#135bec] hover:bg-blue-700 text-white text-base font-bold rounded-lg whitespace-nowrap transition-colors">
                                Prueba Gratis Ahora
                            </button>
                        </form>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                            <div className="flex items-center gap-1">
                                <CheckCircle className="text-green-500" size={18} />
                                <span>Sin tarjeta de crédito</span>
                            </div>
                            <div className="hidden sm:block text-gray-300">|</div>
                            <div className="flex items-center gap-1">
                                <Lock className="text-green-500" size={18} />
                                <span>Seguridad bancaria</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Image */}
                    <div className="w-full lg:w-1/2 flex justify-center">
                        <div
                            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 bg-cover bg-center"
                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDVId_zatZHnDtSyosJqUv431iNf8I3CtjJn2m2IfgwfR4xRO-lRt4eLNUXRqQNUGjL2oMzi6q0NHzdTieHNOFp6-5r_j7wAg2RjEsJ1olA69WFN99OQMkYN1ObAQfp4ShhuQOm3BX2wFGCGLrFv2YtNkefe_uo8N60ovlQqCn9xHCya63qYRb8sziJCGk84vjhrVcPS-HctkpludB3dX19CeoHwciwOO3LV1Lkhudf00n_owoDZ17xDdjQeAVn7RrGiTCwgOuk2gg')" }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#135bec]/20 to-transparent mix-blend-overlay"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="w-full bg-white dark:bg-gray-900 py-20 border-y border-gray-100 dark:border-gray-800">
                <div className="px-4 md:px-10 max-w-7xl mx-auto flex flex-col gap-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Finanzas Inteligentes</h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400">Todo lo que necesitas para reducir la ansiedad y aumentar tu patrimonio, impulsado por integraciones con la banca mexicana.</p>
                        </div>
                        <a className="text-[#135bec] font-bold hover:underline flex items-center gap-1" href="#">
                            Ver todas las funciones
                            <ArrowRight size={16} />
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-[#135bec]/50 transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-[#135bec] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <PieChart size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Análisis de Ingresos con IA</h3>
                            <p className="text-gray-600 dark:text-gray-400">Comprende exactamente a dónde va tu dinero con la categorización automática adaptada al estilo de vida mexicano.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-[#135bec]/50 transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pronósticos Inteligentes</h3>
                            <p className="text-gray-600 dark:text-gray-400">Mira tu saldo con 30 días de anticipación basado en tu historial de gastos y facturas recurrentes.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-[#135bec]/50 transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Seguimiento de Hábitos</h3>
                            <p className="text-gray-600 dark:text-gray-400">Identifica los pequeños "gastos hormiga" que se comen tu billetera y establece límites inteligentes para detenerlos a tiempo.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visualization Section */}
            <section className="py-20 px-4 md:px-10 max-w-5xl mx-auto w-full">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Visualiza Tu Futuro Financiero</h2>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Deja de adivinar. Mira exactamente cómo crecerán tus ahorros durante el próximo mes con nuestro motor predictivo.</p>
                </div>

                {/* Chart Component */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Crecimiento Proyectado (MXN)</p>
                            <div className="flex items-baseline gap-3 mt-1">
                                <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">$45,200</p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <ArrowUp size={14} className="mr-1" /> 12%
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Pronóstico para los próximos 30 días</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-sm font-medium rounded-full bg-[#135bec] text-white">Mensual</button>
                            <button className="px-3 py-1 text-sm font-medium rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Anual</button>
                        </div>
                    </div>

                    <div className="relative h-64 w-full">
                        {/* Custom Chart SVG from Mock */}
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 472 149">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#135bec" stopOpacity="0.2"></stop>
                                    <stop offset="100%" stopColor="#135bec" stopOpacity="0"></stop>
                                </linearGradient>
                            </defs>
                            <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H0V109Z" fill="url(#chartGradient)"></path>
                            <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" fill="none" stroke="#135bec" strokeLinecap="round" strokeWidth="3"></path>
                            <circle className="fill-white stroke-[#135bec] stroke-2" cx="363.077" cy="1" r="6"></circle>
                        </svg>
                    </div>
                    <div className="flex justify-between mt-4 px-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semana 1</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semana 2</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semana 3</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Semana 4</p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="w-full bg-[#135bec] text-white py-20 px-4">
                <div className="max-w-4xl mx-auto text-center flex flex-col gap-8 items-center">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight">¿Listo para dejar de preocuparte por el dinero?</h2>
                    <p className="text-lg md:text-xl text-blue-100 max-w-2xl">Únete a miles de mexicanos que están tomando el control de sus finanzas con los conocimientos impulsados por la IA de Tomin.</p>
                    <Link
                        href="/dashboard"
                        className="bg-white text-[#135bec] hover:bg-gray-100 text-lg font-bold h-14 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center"
                    >
                        Crea Tu Cuenta Gratis
                    </Link>
                    <p className="text-sm text-blue-200">Gratis para siempre en funciones básicas. Sin tarjeta de crédito.</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white dark:bg-[#101622] border-t border-gray-200 dark:border-gray-800 pt-16 pb-8">
                <div className="px-4 md:px-10 max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-[#135bec]">
                                <Wallet className="text-[#135bec]" size={24} />
                                <span className="text-xl font-bold text-gray-900 dark:text-white">Tomin</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Haciendo que la libertad financiera sea accesible para todos en México a través de la inteligencia artificial.</p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="font-bold text-gray-900 dark:text-white">Producto</h4>
                            <nav className="flex flex-col gap-2">
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Funciones</a>
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Precios</a>
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Seguridad</a>
                            </nav>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="font-bold text-gray-900 dark:text-white">Compañía</h4>
                            <nav className="flex flex-col gap-2">
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Acerca de</a>
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Carreras</a>
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Blog</a>
                            </nav>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="font-bold text-gray-900 dark:text-white">Legal</h4>
                            <nav className="flex flex-col gap-2">
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Privacidad</a>
                                <a className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#135bec]" href="#">Términos</a>
                            </nav>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-400">© 2026 Tomin Inc. Todos los derechos reservados.</p>
                        <div className="flex gap-4">
                            <a className="text-gray-400 hover:text-[#135bec] transition-colors" href="#">
                                <span className="sr-only">Twitter</span>
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
