import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin has access to everything
    if (token?.role === 'ADMIN') {
      return NextResponse.next()
    }

    // /usuarios is admin-only
    if (path.startsWith('/usuarios')) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Check page-level permissions from allowedPages
    const allowedPages: string[] = (() => {
      try {
        const raw = token?.allowedPages as string
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    })()

    // If user has allowedPages defined, enforce them
    if (allowedPages.length > 0) {
      // Check if current path is allowed
      const isAllowed = allowedPages.some((allowed) => {
        if (allowed === '/') return path === '/'
        return path === allowed || path.startsWith(allowed + '/')
      })

      if (!isAllowed) {
        // Redirect to first allowed page, or login if none
        const firstAllowed = allowedPages[0] || '/'
        return NextResponse.redirect(new URL(firstAllowed, req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
