import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

function getDateRange(periodo: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  let start: Date

  switch (periodo) {
    case 'hoje':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      break
    case 'semana': {
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday as start
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0)
      break
    }
    case 'ano':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      break
    case 'mes':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
  }

  return { start, end }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'mes'
    const { start, end } = getDateRange(periodo)

    // Custo Empresa / Dia
    const fixedCosts = await prisma.fixedCost.aggregate({
      where: { active: true },
      _sum: { amount: true },
    })

    const employees = await prisma.employee.aggregate({
      where: { active: true },
      _sum: { monthlyCost: true },
    })

    const custoFixoMensal = fixedCosts._sum.amount || 0
    const folhaSalarial = employees._sum.monthlyCost || 0
    const custoEmpresaDia = (custoFixoMensal + folhaSalarial) / 22

    // Saldo em Caixa (all time - paid entries)
    const receitasPagas = await prisma.financialEntry.aggregate({
      where: { type: 'RECEITA', status: 'PAGO' },
      _sum: { amount: true },
    })

    const despesasPagas = await prisma.financialEntry.aggregate({
      where: { type: 'DESPESA', status: 'PAGO' },
      _sum: { amount: true },
    })

    const saldoCaixa = (receitasPagas._sum.amount || 0) - (despesasPagas._sum.amount || 0)

    // Obras Ativas
    const obrasAtivas = await prisma.project.count({
      where: { status: 'EM_PRODUCAO' },
    })

    // DRE Data (filtered by period)
    const receitaBrutaResult = await prisma.financialEntry.aggregate({
      where: {
        type: 'RECEITA',
        status: 'PAGO',
        paidDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    })
    const receitaBruta = receitaBrutaResult._sum.amount || 0

    // Impostos - estimate from active tax configs
    const taxConfigs = await prisma.taxConfig.findMany({
      where: { active: true },
    })
    const totalTaxRate = taxConfigs.reduce((sum, tax) => sum + tax.rate, 0)
    const impostos = receitaBruta * (totalTaxRate / 100)

    // Insumos (DESPESA with category FORNECEDOR in period)
    const insumosResult = await prisma.financialEntry.aggregate({
      where: {
        type: 'DESPESA',
        category: 'FORNECEDOR',
        status: 'PAGO',
        paidDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    })
    const insumos = insumosResult._sum.amount || 0

    // Mao de Obra (DESPESA with category VALE + proportional employee costs)
    const valesResult = await prisma.financialEntry.aggregate({
      where: {
        type: 'DESPESA',
        category: 'VALE',
        status: 'PAGO',
        paidDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    })

    // Calculate proportional employee cost for the period
    const totalDaysInPeriod = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    )
    const maoDeObra =
      (valesResult._sum.amount || 0) + (folhaSalarial / 30) * totalDaysInPeriod

    // Custos Fixos (proportional for the period)
    const custosFixosProporcional = (custoFixoMensal / 30) * totalDaysInPeriod

    // Custos fixos via financial entries in period
    const custosFixosEntries = await prisma.financialEntry.aggregate({
      where: {
        type: 'DESPESA',
        category: 'CUSTO_FIXO',
        status: 'PAGO',
        paidDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    })
    const custosFixos = custosFixosEntries._sum.amount || custosFixosProporcional

    const lucroLiquido = receitaBruta - impostos - insumos - maoDeObra - custosFixos

    // Fluxo de Caixa - last 6 months
    const sixMonthsAgo = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 5,
      1,
      0,
      0,
      0,
      0
    )

    const fluxoEntries = await prisma.financialEntry.findMany({
      where: {
        status: 'PAGO',
        paidDate: { gte: sixMonthsAgo },
      },
      select: {
        type: true,
        amount: true,
        paidDate: true,
      },
    })

    // Group by month
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ]

    const fluxoMap = new Map<string, { entradas: number; saidas: number }>()

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
      const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      fluxoMap.set(key, { entradas: 0, saidas: 0 })
    }

    for (const entry of fluxoEntries) {
      if (!entry.paidDate) continue
      const d = new Date(entry.paidDate)
      const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      const bucket = fluxoMap.get(key)
      if (!bucket) continue

      if (entry.type === 'RECEITA') {
        bucket.entradas += entry.amount
      } else {
        bucket.saidas += entry.amount
      }
    }

    const fluxoCaixa = Array.from(fluxoMap.entries()).map(([mes, values]) => ({
      mes,
      entradas: values.entradas,
      saidas: values.saidas,
    }))

    return NextResponse.json({
      custoEmpresaDia,
      saldoCaixa,
      obrasAtivas,
      dre: {
        receitaBruta,
        impostos,
        insumos,
        maoDeObra,
        custosFixos,
        lucroLiquido,
      },
      fluxoCaixa,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dados do dashboard' },
      { status: 500 }
    )
  }
}
