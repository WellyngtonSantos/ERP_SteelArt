import { prisma } from '@/lib/prisma'
import { IntentResponse } from '../types'

const DIAS_LIMITE = 60

export async function clientesInativos(): Promise<IntentResponse> {
  const limite = new Date()
  limite.setDate(limite.getDate() - DIAS_LIMITE)

  const clientes = await prisma.client.findMany({
    where: { active: true },
    include: {
      budgets: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const inativos = clientes
    .map((c) => {
      const ultimoOrc = c.budgets[0]
      const ultimaData = ultimoOrc?.createdAt ?? c.createdAt
      const dias = Math.floor((Date.now() - ultimaData.getTime()) / (1000 * 60 * 60 * 24))
      return { cliente: c, ultimaData, dias, ultimoOrc }
    })
    .filter((x) => x.dias >= DIAS_LIMITE)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 20)

  if (inativos.length === 0) {
    return {
      title: 'Clientes inativos',
      summary: 'Todos os clientes ativos tiveram contato recente.',
      emptyMessage: 'Nenhum cliente inativo no momento.',
    }
  }

  const items = inativos.map(({ cliente, dias, ultimoOrc }) => ({
    label: cliente.name,
    value: `${dias} dias`,
    meta: ultimoOrc
      ? `Ultimo orcamento: ${ultimoOrc.createdAt.toLocaleDateString('pt-BR')}${cliente.phone ? ` · ${cliente.phone}` : ''}`
      : `Cadastrado em ${cliente.createdAt.toLocaleDateString('pt-BR')}${cliente.phone ? ` · ${cliente.phone}` : ''}`,
    highlight: dias > 120 ? ('danger' as const) : ('warning' as const),
  }))

  return {
    title: 'Clientes inativos',
    summary: `${inativos.length} cliente(s) sem contato ha mais de ${DIAS_LIMITE} dias. Vale uma ligacao de retomada.`,
    items,
  }
}
