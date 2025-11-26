import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isPublicFile = request.nextUrl.pathname.match(/\.(.*)$/);

  // Debug logging
  console.log('Middleware:', {
    path: request.nextUrl.pathname,
    hasToken: !!token?.value,
    isDashboard: isDashboardPage,
    isCallback: isAuthCallback,
  });

  // Allow auth callback and API routes without checks
  if (isApiRoute || isPublicFile || isAuthCallback) {
    return NextResponse.next();
  }

  if (!token?.value && !isAuthPage && isDashboardPage) {
    console.log('No token, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token?.value && isAuthPage) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
