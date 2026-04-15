import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const clients = await prisma.client.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { budgets: true } },
      },
    })
    return NextResponse.json(clients)
  } catch (err) {
    console.error('Erro ao buscar clientes:', err)
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

function validatePersonType(t: unknown): 'PESSOA_FISICA' | 'PESSOA_JURIDICA' {
  return t === 'PESSOA_FISICA' ? 'PESSOA_FISICA' : 'PESSOA_JURIDICA'
}

export async function POST(request: NextRequest) {
  const { error } = await requireAllowedPage('/clientes')
  if (error) return error

  try {
    const body = await request.json()
    const { name, cnpj, phone, email, address, notes } = body
    const personType = validatePersonType(body.personType)
    const expectedLen = personType === 'PESSOA_FISICA' ? 11 : 14

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome e obrigatorio' }, { status: 400 })
    }

    const docClean = cnpj ? String(cnpj).replace(/\D/g, '') : ''
    if (docClean && docClean.length === expectedLen) {
      const existing = await prisma.client.findUnique({ where: { cnpj: docClean } })
      if (existing) {
        return NextResponse.json({ error: `${personType === 'PESSOA_FISICA' ? 'CPF' : 'CNPJ'} ja cadastrado` }, { status: 409 })
      }
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        personType,
        cnpj: docClean && docClean.length === expectedLen ? docClean : null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (err) {
    console.error('Erro ao criar cliente:', err)
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAllowedPage('/clientes')
  if (error) return error

  try {
    const body = await request.json()
    const { id, name, cnpj, phone, email, address, notes, active } = body
    const personType = validatePersonType(body.personType)
    const expectedLen = personType === 'PESSOA_FISICA' ? 11 : 14

    if (!id) {
      return NextResponse.json({ error: 'ID e obrigatorio' }, { status: 400 })
    }

    const docClean = cnpj ? String(cnpj).replace(/\D/g, '') : ''
    if (docClean && docClean.length === expectedLen) {
      const existing = await prisma.client.findUnique({ where: { cnpj: docClean } })
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: `${personType === 'PESSOA_FISICA' ? 'CPF' : 'CNPJ'} ja cadastrado por outro cliente` }, { status: 409 })
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: name?.trim(),
        personType,
        cnpj: docClean && docClean.length === expectedLen ? docClean : null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        ...(typeof active === 'boolean' ? { active } : {}),
      },
    })

    return NextResponse.json(client)
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err)
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAllowedPage('/clientes')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID e obrigatorio' }, { status: 400 })
    }

    // Soft delete - just deactivate
    await prisma.client.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao excluir cliente:', err)
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 })
  }
}
