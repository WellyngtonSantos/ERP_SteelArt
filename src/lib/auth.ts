import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'
import { checkRateLimit } from './rate-limit'

export const ALL_PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/produtos', label: 'Produtos' },
  { path: '/comercial', label: 'Comercial' },
  { path: '/producao', label: 'Producao' },
  { path: '/suprimentos', label: 'Suprimentos' },
  { path: '/rh', label: 'RH' },
  { path: '/financeiro', label: 'Financeiro' },
  { path: '/configuracoes', label: 'Configuracoes' },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate limit by email
        const { allowed } = checkRateLimit(`login:${credentials.email}`)
        if (!allowed) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.active) return null

        const isValid = await compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          allowedPages: user.allowedPages,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
        token.allowedPages = (user as any).allowedPages
      }
      // Refresh permissions on session update
      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          token.allowedPages = dbUser.allowedPages
          token.role = dbUser.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).id = token.id
        ;(session.user as any).allowedPages = token.allowedPages
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
}

// Helper: require authenticated session on API routes
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Nao autorizado' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

// Helper: require admin role
export async function requireAdmin() {
  const { error, session } = await requireAuth()
  if (error) return { error, session: null }
  if ((session!.user as any).role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), session: null }
  }
  return { error: null, session }
}

// Helper: require the authenticated user to have access to a given page path.
// Admin bypassa (vê tudo). Se allowedPages vazio → sem restricoes (default).
// Usar em rotas de API que pertencem a uma tela especifica (ex: /api/employees → /rh).
export async function requireAllowedPage(pagePath: string) {
  const { error, session } = await requireAuth()
  if (error) return { error, session: null }

  const user = session!.user as any
  if (user.role === 'ADMIN') return { error: null, session }

  let allowedPages: string[] = []
  try {
    const raw = user.allowedPages
    allowedPages = raw ? JSON.parse(raw) : []
  } catch {
    allowedPages = []
  }

  // Lista vazia = sem restricoes (comportamento historico — compat com usuarios ja cadastrados)
  if (allowedPages.length === 0) return { error: null, session }

  if (!allowedPages.includes(pagePath)) {
    return {
      error: NextResponse.json({ error: 'Acesso negado a este recurso' }, { status: 403 }),
      session: null,
    }
  }

  return { error: null, session }
}
