import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        allowedPages: true,
        active: true,
        createdAt: true,
        _count: { select: { budgets: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuarios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const { name, email, password, role, allowedPages } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha obrigatorios' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 400 })
    }

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'VENDEDOR',
        allowedPages: JSON.stringify(allowedPages || []),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        allowedPages: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Erro ao criar usuario' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const { id, name, email, password, role, allowedPages, active } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    // Prevent admin from removing their own admin role
    if (existing.id === (session.user as any).id && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Voce nao pode remover seu proprio acesso de admin' }, { status: 400 })
    }

    const data: Record<string, any> = {}
    if (name) data.name = name
    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } })
      if (emailExists) {
        return NextResponse.json({ error: 'Email ja cadastrado por outro usuario' }, { status: 400 })
      }
      data.email = email
    }
    if (password) {
      data.password = await hash(password, 12)
    }
    if (role) data.role = role
    if (allowedPages !== undefined) {
      data.allowedPages = JSON.stringify(allowedPages)
    }
    if (active !== undefined) data.active = active

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        allowedPages: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Erro ao atualizar usuario' }, { status: 500 })
  }
}
