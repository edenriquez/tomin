"use client";

import React, { useState } from 'react';
import { Mail, Lock, Chrome, ArrowRight, ShieldCheck, Wallet, ChevronLeft } from 'lucide-react';
import { loginWithPassword, signup, verifyOtp, loginWithGoogle } from './actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
    const searchParams = useSearchParams();
    const initialMode = (searchParams.get('mode') as 'login' | 'signup') || 'login';
    const initialEmail = searchParams.get('email') || '';

    const [mode, setMode] = useState<'login' | 'signup' | 'otp'>(initialMode);
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        if (mode === 'login') {
            const result = await loginWithPassword(formData);
            if (result?.error) {
                if (result.error === 'Email not confirmed') {
                    setMode('otp');
                    setMessage('Por favor ingresa el código OTP enviado a tu correo.');
                } else {
                    setError(result.error);
                }
            }
        } else if (mode === 'signup') {
            const result = await signup(formData);
            if (result.error) {
                setError(result.error);
            } else {
                setMode('otp');
                setMessage('Cuenta creada. Ingresa el código OTP enviado a tu correo.');
            }
        } else if (mode === 'otp') {
            const result = await verifyOtp(formData);
            if (result?.error) {
                setError(result.error);
            }
        }

        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const result = await loginWithGoogle();
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f6f6f8] dark:bg-[#101622] transition-colors duration-200">
            {/* Left Side: Branding & Info */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#135bec] p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 0 L100 0 L100 100 Z" fill="white" />
                    </svg>
                </div>

                <Link href="/" className="flex items-center gap-2 text-white relative z-10">
                    <div className="size-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Wallet className="text-white" size={24} />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">Tomin</span>
                </Link>

                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white leading-tight mb-6">
                        Domina tus finanzas con el poder de la IA.
                    </h1>
                    <p className="text-blue-100 text-xl max-w-lg">
                        Únete a Tomin y descubre una nueva forma de gestionar tu dinero de manera inteligente y automática.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-blue-100/60 text-sm">
                    <div className="flex items-center gap-1">
                        <ShieldCheck size={16} />
                        <span>Encriptación grado bancario</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-blue-100/30" />
                    <span>© 2026 Tomin Inc.</span>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-md flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                        {mode === 'otp' ? (
                            <button
                                onClick={() => setMode('login')}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#135bec] transition-colors w-fit mb-2"
                            >
                                <ChevronLeft size={16} /> Volver al login
                            </button>
                        ) : null}
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {mode === 'login' ? 'Bienvenido de nuevo' : mode === 'signup' ? 'Crea tu cuenta' : 'Verifica tu correo'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            {mode === 'login'
                                ? 'Ingresa tus credenciales para acceder a tu panel.'
                                : mode === 'signup'
                                    ? 'Comienza tu viaje hacia la libertad financiera.'
                                    : 'Hemos enviado un código de seguridad a tu bandeja de entrada.'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-[#135bec] dark:text-blue-400 text-sm">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {mode !== 'otp' ? (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1" htmlFor="email">Correo electrónico</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#135bec] transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full h-12 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 pl-11 pr-4 focus:border-[#135bec] focus:ring-4 focus:ring-[#135bec]/10 outline-none transition-all"
                                            placeholder="nombre@ejemplo.com"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="password">Contraseña</label>
                                        {mode === 'login' && (
                                            <a href="#" className="text-xs font-semibold text-[#135bec] hover:underline">¿Olvidaste tu contraseña?</a>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#135bec] transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-12 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 pl-11 pr-4 focus:border-[#135bec] focus:ring-4 focus:ring-[#135bec]/10 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <input type="hidden" name="email" value={email} />
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1" htmlFor="token">Código OTP</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#135bec] transition-colors">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <input
                                        id="token"
                                        name="token"
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        className="w-full h-12 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 pl-11 pr-4 tracking-[0.5em] text-center text-lg font-bold focus:border-[#135bec] focus:ring-4 focus:ring-[#135bec]/10 outline-none transition-all"
                                        placeholder="000000"
                                        maxLength={8}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-2 bg-[#135bec] hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                        >
                            {loading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Iniciar Sesión' : mode === 'signup' ? 'Registrarse' : 'Verificar Código'}
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {mode !== 'otp' && (
                        <>
                            <div className="relative flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                                <span>O</span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                            </div>

                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full h-12 border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                            >
                                <Chrome size={20} />
                                Continuar con Google
                            </button>

                            <p className="text-center text-sm text-gray-500">
                                {mode === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                                <button
                                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                    className="ml-1 text-[#135bec] font-bold hover:underline"
                                >
                                    {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-[#f6f6f8] dark:bg-[#101622]">
                <div className="size-10 border-4 border-[#135bec]/30 border-t-[#135bec] rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
