import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/api/auth'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // Not authenticated
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Locked account → redirect to login
  if (token.status === 'locked') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin routes require admin role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (token.role !== 'admin') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 })
        : NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/deals/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/api/deals/:path*',
    '/api/profile/:path*',
    '/api/admin/:path*',
    '/api/emails/:path*',
    '/api/scrape/:path*',
  ],
};
