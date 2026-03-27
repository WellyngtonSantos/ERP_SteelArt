import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

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
  },
}
