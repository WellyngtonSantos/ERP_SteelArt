import { prisma } from '@/lib/prisma'
import { IntentResponse } from '../types'

const DIAS_LIMITE = 7

export async function orcamentosPendentes(): Promise<IntentResponse> {
  const limite = new Date()
  limite.setDate(limite.getDate() - DIAS_LIMITE)

  const pendentes = await prisma.budget.findMany({
    where: {
      status: 'ENVIADO',
      updatedAt: { lt: limite },
    },
    orderBy: { updatedAt: 'asc' },
    take: 20,
  })

  if (pendentes.length === 0) {
    return {
      title: 'Orcamentos aguardando resposta',
      summary: 'Nenhum orcamento enviado ha mais de 7 dias sem retorno.',
      emptyMessage: 'Voce esta em dia com os follow-ups.',
    }
  }

  const hoje = new Date()
  const items = pendentes.map((b) => {
    const dias = Math.floor((hoje.getTime() - b.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    const valor = b.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return {
      label: b.clientName,
      value: valor,
      meta: `${dias} dias sem retorno${b.clientPhone ? ` · ${b.clientPhone}` : ''}`,
      highlight: dias > 15 ? ('danger' as const) : ('warning' as const),
    }
  })

  const totalValor = pendentes.reduce((sum, b) => sum + b.totalPrice, 0)
  const totalFmt = totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return {
    title: 'Orcamentos aguardando resposta',
    summary: `${pendentes.length} orcamento(s) enviado(s) ha mais de ${DIAS_LIMITE} dias. Total em negociacao: ${totalFmt}.`,
    items,
  }
}
