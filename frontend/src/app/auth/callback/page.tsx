'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // Set the token as a cookie
            // Use Secure in production (HTTPS), Lax for development
            const isProduction = window.location.protocol === 'https:';
            const cookieString = `access_token=${token}; path=/; max-age=86400; SameSite=${isProduction ? 'None' : 'Lax'}${isProduction ? '; Secure' : ''}`;
            document.cookie = cookieString;

            console.log('Token set in cookie:', cookieString);
            console.log('Current cookies:', document.cookie);

            // Longer delay to ensure cookie is fully set before redirect
            setTimeout(() => {
                router.push('/dashboard');
            }, 100);
        } else {
            console.error('No token found in URL');
            router.push('/login');
        }
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-700 font-medium">Completing authentication...</p>
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
