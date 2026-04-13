import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // format: 2024-01

    let dateFilter = {}
    if (month) {
      const [year, m] = month.split('-').map(Number)
      const startOfMonth = new Date(year, m - 1, 1)
      const endOfMonth = new Date(year, m, 0, 23, 59, 59)
      dateFilter = {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      }
    }

    const deductions = await prisma.employeeDeduction.findMany({
      where: {
        employeeId: id,
        ...dateFilter,
      },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(deductions)
  } catch (error) {
    console.error('Erro ao buscar deducoes:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar deducoes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAllowedPage('/rh')
  if (error) return error

  try {
    const { id } = params
    const body = await request.json()

    // Validate type. FALTA = dia inteiro, MEIO_PERIODO = metade do dia.
    const validTypes = ['ALMOCO', 'MARMITA', 'VALE', 'ADIANTAMENTO', 'EPI', 'FALTA', 'MEIO_PERIODO', 'OUTROS']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'Tipo de deducao invalido' },
        { status: 400 }
      )
    }

    // Para FALTA e MEIO_PERIODO, amount e calculado a partir do dailyCost atual do funcionario
    let amount = parseFloat(body.amount) || 0
    if (body.type === 'FALTA' || body.type === 'MEIO_PERIODO') {
      const employee = await prisma.employee.findUnique({
        where: { id },
        select: { dailyCost: true },
      })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionario nao encontrado' }, { status: 404 })
      }
      amount = body.type === 'FALTA' ? employee.dailyCost : employee.dailyCost / 2
    }

    const deduction = await prisma.employeeDeduction.create({
      data: {
        employeeId: id,
        type: body.type,
        amount,
        date: body.date ? new Date(body.date) : new Date(),
        description: body.description || '',
      },
    })
    return NextResponse.json(deduction, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar deducao:', error)
    return NextResponse.json(
      { error: 'Erro ao criar deducao' },
      { status: 500 }
    )
  }
}
