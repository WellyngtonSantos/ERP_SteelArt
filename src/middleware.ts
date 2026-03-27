import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Role-based access control
    if (path === '/' && token?.role === 'OPERADOR') {
      return NextResponse.redirect(new URL('/producao', req.url))
    }

    if (path.startsWith('/financeiro') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (path.startsWith('/rh') && !['ADMIN', 'ENGENHEIRO'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/', req.url))
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
  matcher: ['/((?!login|api/auth|api/seed|_next/static|_next/image|favicon.ico).*)'],
}
