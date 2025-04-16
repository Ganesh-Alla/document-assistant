
import type { NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  return updateSession(request)
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}