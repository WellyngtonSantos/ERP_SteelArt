import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const costs = await prisma.fixedCost.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(costs)
  } catch (error) {
    console.error('Erro ao buscar custos fixos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar custos fixos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const cost = await prisma.fixedCost.create({
      data: {
        name: body.name,
        amount: parseFloat(body.amount) || 0,
        category: body.category || 'OUTROS',
        active: body.active ?? true,
      },
    })
    return NextResponse.json(cost, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar custo fixo:', error)
    return NextResponse.json(
      { error: 'Erro ao criar custo fixo' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID do custo fixo e obrigatorio' },
        { status: 400 }
      )
    }
    const cost = await prisma.fixedCost.update({
      where: { id: body.id },
      data: {
        name: body.name,
        amount: parseFloat(body.amount) || 0,
        category: body.category,
        active: body.active,
      },
    })
    return NextResponse.json(cost)
  } catch (error) {
    console.error('Erro ao atualizar custo fixo:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar custo fixo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'ID do custo fixo e obrigatorio' },
        { status: 400 }
      )
    }
    await prisma.fixedCost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar custo fixo:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar custo fixo' },
      { status: 500 }
    )
  }
}
