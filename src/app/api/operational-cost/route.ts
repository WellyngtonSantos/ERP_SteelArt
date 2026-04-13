import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { BUSINESS_DAYS_PER_MONTH } from '@/lib/calculations'

// Retorna o custo operacional atual da empresa por dia.
// custoOperacionalDia = (custos fixos mensais ativos + folha diaria * 22) / 22
export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const fixedCosts = await prisma.fixedCost.aggregate({
      where: { active: true },
      _sum: { amount: true },
    })
    const employees = await prisma.employee.aggregate({
      where: { active: true },
      _sum: { dailyCost: true },
    })

    const custoFixoMensal = fixedCosts._sum.amount || 0
    const folhaDiaria = employees._sum.dailyCost || 0
    const folhaMensal = folhaDiaria * BUSINESS_DAYS_PER_MONTH
    const custoOperacionalDia = (custoFixoMensal + folhaMensal) / BUSINESS_DAYS_PER_MONTH

    return NextResponse.json({
      custoOperacionalDia,
      custoFixoMensal,
      folhaDiaria,
      folhaMensal,
      businessDays: BUSINESS_DAYS_PER_MONTH,
    })
  } catch (err) {
    console.error('Erro ao calcular custo operacional:', err)
    return NextResponse.json({ error: 'Erro ao calcular custo operacional' }, { status: 500 })
  }
}
