// Next.js middleware enforcing auth token presence on protected routes.
import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = ['/book', '/my-reservations', '/profile'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('ct_access_token')?.value;
  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/book', '/book/:path*', '/my-reservations/:path*', '/profile/:path*'],
};
