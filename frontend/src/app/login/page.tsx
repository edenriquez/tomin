'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Tomin</h1>
          </div>

          {/* Sign in heading */}
          <div>
            <h2 className="text-3xl text-center font-bold text-gray-900">
              Iniciar sesión
            </h2>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error === 'access_denied'
                      ? 'Acceso denegado. Por favor intenta de nuevo.'
                      : 'Ocurrió un error durante la autenticación. Por favor intenta de nuevo.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <div className="mt-8">
            <button
              onClick={login}
              className="group relative w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </button>
          </div>

          {/* Additional links */}
          <div className="text-center text-sm text-gray-600">
            <p>Al continuar, aceptas nuestros términos y condiciones</p>
          </div>
        </div>
      </div>

      {/* Right Side - Branded Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-white via-purple-50/30 to-white relative overflow-hidden">
        {/* Decorative elements - matching landing page */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-purple-300/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-300/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300/40 rounded-full mix-blend-multiply filter blur-[120px] opacity-50"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Large Logo/Brand */}
          <div className="mb-12">
            <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-4">T</div>
            <p className="text-sm text-gray-600 tracking-wider font-medium">Tomin</p>
          </div>

          {/* Welcome Message */}
          <div className="max-w-lg text-center space-y-6">
            <h1 className="text-4xl font-bold leading-tight text-gray-900">
              Bienvenido a Tomin
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Tomin es una plataforma centrada en el usuario, buscamos ser la nueva herramienta para la generación que merece mejor educación financiera.
            </p>
          </div>

          {/* Glassmorphic card - matching landing page style */}
          <div className="mt-12 bg-white/60 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-[0_8px_32px_0_rgba(147,51,234,0.12)] max-w-md">
            <p className="text-sm text-gray-600 mb-4 font-medium">¿Por qué Tomin?</p>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                Análisis inteligente de gastos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                Pronósticos financieros personalizados
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-pink-600 rounded-full"></div>
                Control total de tus finanzas
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
