import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: any = {}
    if (type) where.type = type
    if (status) where.status = status

    const entries = await prisma.financialEntry.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    })
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Erro ao buscar lancamentos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar lancamentos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const entry = await prisma.financialEntry.create({
      data: {
        type: body.type,
        category: body.category || '',
        description: body.description || '',
        amount: parseFloat(body.amount) || 0,
        dueDate: new Date(body.dueDate),
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        status: body.status || 'PENDENTE',
        budgetId: body.budgetId || null,
        projectId: body.projectId || null,
      },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar lancamento:', error)
    return NextResponse.json(
      { error: 'Erro ao criar lancamento' },
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
        { error: 'ID do lancamento e obrigatorio' },
        { status: 400 }
      )
    }

    const data: any = {}
    if (body.type !== undefined) data.type = body.type
    if (body.category !== undefined) data.category = body.category
    if (body.description !== undefined) data.description = body.description
    if (body.amount !== undefined) data.amount = parseFloat(body.amount)
    if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate)
    if (body.paidDate !== undefined) data.paidDate = body.paidDate ? new Date(body.paidDate) : null
    if (body.status !== undefined) data.status = body.status
    if (body.budgetId !== undefined) data.budgetId = body.budgetId
    if (body.projectId !== undefined) data.projectId = body.projectId

    const entry = await prisma.financialEntry.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(entry)
  } catch (error) {
    console.error('Erro ao atualizar lancamento:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar lancamento' },
      { status: 500 }
    )
  }
}
