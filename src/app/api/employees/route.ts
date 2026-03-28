import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const employees = await prisma.employee.findMany({
      include: {
        deductions: {
          where: {
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Erro ao buscar funcionarios:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar funcionarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const employee = await prisma.employee.create({
      data: {
        name: body.name,
        role: body.role,
        monthlyCost: parseFloat(body.monthlyCost) || 0,
        benefits: parseFloat(body.benefits) || 0,
        active: body.active ?? true,
      },
    })
    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar funcionario:', error)
    return NextResponse.json(
      { error: 'Erro ao criar funcionario' },
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
        { error: 'ID do funcionario e obrigatorio' },
        { status: 400 }
      )
    }
    const employee = await prisma.employee.update({
      where: { id: body.id },
      data: {
        name: body.name,
        role: body.role,
        monthlyCost: parseFloat(body.monthlyCost) || 0,
        benefits: parseFloat(body.benefits) || 0,
        active: body.active,
      },
    })
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Erro ao atualizar funcionario:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar funcionario' },
      { status: 500 }
    )
  }
}
