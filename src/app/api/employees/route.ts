import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { BUSINESS_DAYS_PER_MONTH } from '@/lib/calculations'

// Derive dailyCost from legacy monthlyCost quando necessario
function deriveDailyFromMonthly(monthlyCost: number): number {
  return monthlyCost / BUSINESS_DAYS_PER_MONTH
}

// Mantem monthlyCost como dailyCost * 22 pra compat com codigo antigo
function computeMonthlyFromDaily(dailyCost: number): number {
  return dailyCost * BUSINESS_DAYS_PER_MONTH
}

// Backfill lazy do dailyCost. Roda uma unica vez por instancia.
let employeesBackfilled = false
async function backfillDailyCostOnce() {
  if (employeesBackfilled) return
  employeesBackfilled = true
  try {
    const pending = await prisma.employee.findMany({
      where: { dailyCost: 0, monthlyCost: { gt: 0 } },
      select: { id: true, monthlyCost: true },
    })
    for (const emp of pending) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { dailyCost: deriveDailyFromMonthly(emp.monthlyCost) },
      })
    }
  } catch (err) {
    console.error('Erro no backfill de dailyCost:', err)
    employeesBackfilled = false
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    await backfillDailyCostOnce()

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // YYYY-MM opcional
    let refDate = new Date()
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number)
      if (y && m) refDate = new Date(y, m - 1, 1)
    }
    const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
    const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59)

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
  const { error } = await requireAllowedPage('/rh')
  if (error) return error

  try {
    const body = await request.json()
    // Prioriza dailyCost do cliente; se veio so monthlyCost (legado), deriva.
    const dailyCost = typeof body.dailyCost === 'number' && body.dailyCost >= 0
      ? body.dailyCost
      : deriveDailyFromMonthly(parseFloat(body.monthlyCost) || 0)
    const monthlyCost = computeMonthlyFromDaily(dailyCost)

    const employee = await prisma.employee.create({
      data: {
        name: body.name,
        role: body.role,
        dailyCost,
        monthlyCost,
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
  const { error } = await requireAllowedPage('/rh')
  if (error) return error

  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID do funcionario e obrigatorio' },
        { status: 400 }
      )
    }

    const dailyCost = typeof body.dailyCost === 'number' && body.dailyCost >= 0
      ? body.dailyCost
      : deriveDailyFromMonthly(parseFloat(body.monthlyCost) || 0)
    const monthlyCost = computeMonthlyFromDaily(dailyCost)

    const employee = await prisma.employee.update({
      where: { id: body.id },
      data: {
        name: body.name,
        role: body.role,
        dailyCost,
        monthlyCost,
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
