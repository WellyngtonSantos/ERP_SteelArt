import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const taxes = await prisma.taxConfig.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(taxes)
  } catch (error) {
    console.error('Error fetching taxes:', error)
    return NextResponse.json({ error: 'Erro ao buscar impostos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAllowedPage('/financeiro')
  if (error) return error

  try {
    const body = await request.json()
    const { name, type, rate, appliesTo, active } = body

    if (!name || !type || rate === undefined || !appliesTo) {
      return NextResponse.json({ error: 'Campos obrigatorios: name, type, rate, appliesTo' }, { status: 400 })
    }

    const tax = await prisma.taxConfig.create({
      data: {
        name,
        type,
        rate: Number(rate),
        appliesTo,
        active: active !== undefined ? active : true,
      },
    })

    return NextResponse.json(tax, { status: 201 })
  } catch (error) {
    console.error('Error creating tax:', error)
    return NextResponse.json({ error: 'Erro ao criar imposto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAllowedPage('/financeiro')
  if (error) return error

  try {
    const body = await request.json()
    const { id, name, type, rate, appliesTo, active } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }

    const tax = await prisma.taxConfig.update({
      where: { id },
      data: {
        name,
        type,
        rate: Number(rate),
        appliesTo,
        active,
      },
    })

    return NextResponse.json(tax)
  } catch (error) {
    console.error('Error updating tax:', error)
    return NextResponse.json({ error: 'Erro ao atualizar imposto' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAllowedPage('/financeiro')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }

    await prisma.taxConfig.delete({ where: { id } })

    return NextResponse.json({ message: 'Imposto excluido' })
  } catch (error) {
    console.error('Error deleting tax:', error)
    return NextResponse.json({ error: 'Erro ao excluir imposto' }, { status: 500 })
  }
}
