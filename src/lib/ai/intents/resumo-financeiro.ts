import { prisma } from '@/lib/prisma'
import { IntentResponse } from '../types'

export async function resumoFinanceiro(): Promise<IntentResponse> {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

  const lancamentos = await prisma.financialEntry.findMany({
    where: {
      dueDate: { gte: inicioMes, lte: fimMes },
    },
  })

  const receitas = lancamentos.filter((l) => l.type === 'RECEITA')
  const despesas = lancamentos.filter((l) => l.type === 'DESPESA')

  const totalReceita = receitas.reduce((s, l) => s + l.amount, 0)
  const receitaPaga = receitas.filter((l) => l.status === 'PAGO').reduce((s, l) => s + l.amount, 0)
  const receitaPendente = totalReceita - receitaPaga

  const totalDespesa = despesas.reduce((s, l) => s + l.amount, 0)
  const despesaPaga = despesas.filter((l) => l.status === 'PAGO').reduce((s, l) => s + l.amount, 0)
  const despesaPendente = totalDespesa - despesaPaga

  const saldoPrevisto = totalReceita - totalDespesa
  const saldoRealizado = receitaPaga - despesaPaga

  const atrasados = lancamentos.filter(
    (l) => l.status === 'PENDENTE' && l.dueDate < hoje
  ).length

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const items = [
    {
      label: 'Receitas do mes',
      value: fmt(totalReceita),
      meta: `Recebido: ${fmt(receitaPaga)} · Pendente: ${fmt(receitaPendente)}`,
      highlight: 'success' as const,
    },
    {
      label: 'Despesas do mes',
      value: fmt(totalDespesa),
      meta: `Pago: ${fmt(despesaPaga)} · A pagar: ${fmt(despesaPendente)}`,
      highlight: 'warning' as const,
    },
    {
      label: 'Saldo previsto',
      value: fmt(saldoPrevisto),
      meta: `Saldo ja realizado: ${fmt(saldoRealizado)}`,
      highlight: saldoPrevisto >= 0 ? ('success' as const) : ('danger' as const),
    },
  ]

  if (atrasados > 0) {
    items.push({
      label: 'Lancamentos atrasados',
      value: `${atrasados}`,
      meta: 'Contas vencidas ainda pendentes neste mes',
      highlight: 'danger' as const,
    })
  }

  return {
    title: `Resumo financeiro — ${mesNome}`,
    summary: `${receitas.length} receita(s) e ${despesas.length} despesa(s) lancadas. Saldo previsto: ${fmt(saldoPrevisto)}.`,
    items,
  }
}
