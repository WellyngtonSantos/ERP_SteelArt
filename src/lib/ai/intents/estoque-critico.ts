import { prisma } from '@/lib/prisma'
import { IntentResponse } from '../types'

export async function estoqueCritico(): Promise<IntentResponse> {
  const materiais = await prisma.material.findMany({
    where: {
      minStock: { gt: 0 },
    },
    orderBy: { name: 'asc' },
  })

  const criticos = materiais
    .filter((m) => m.stock <= m.minStock)
    .sort((a, b) => a.stock / (a.minStock || 1) - b.stock / (b.minStock || 1))

  if (criticos.length === 0) {
    return {
      title: 'Estoque critico',
      summary: 'Todos os materiais com estoque minimo definido estao acima do limite.',
      emptyMessage: 'Estoque saudavel.',
    }
  }

  const items = criticos.slice(0, 20).map((m) => {
    const zerado = m.stock <= 0
    const valorReposicao = (m.minStock - m.stock) * m.currentPrice
    const valorFmt = valorReposicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return {
      label: m.name,
      value: `${m.stock.toLocaleString('pt-BR')} / min ${m.minStock.toLocaleString('pt-BR')} ${m.unit}`,
      meta: `Categoria: ${m.category} · Reposicao estimada: ${valorFmt}`,
      highlight: zerado ? ('danger' as const) : ('warning' as const),
    }
  })

  const zerados = criticos.filter((m) => m.stock <= 0).length

  return {
    title: 'Estoque critico',
    summary: `${criticos.length} material(is) abaixo do estoque minimo${zerados > 0 ? `, sendo ${zerados} zerado(s)` : ''}. Priorize a compra.`,
    items,
  }
}
