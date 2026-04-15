import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// Seed idempotente das opcoes financeiras. Pode rodar quantas vezes quiser:
// nao cria duplicatas e nao sobrescreve o que ja existe. Cobre os 6 tipos
// usados em Configuracoes > Financeiro.

const SEED_DATA: Array<{ type: string; names: string[] }> = [
  {
    type: 'BANK',
    names: ['Banco A', 'Banco B', 'Banco Sicred', 'Helio', 'Jonathan'],
  },
  {
    type: 'PAYMENT_METHOD',
    names: ['Boleto', 'Cartao', 'PIX', 'Bric', 'Dinheiro'],
  },
  {
    type: 'INCOME_MAIN',
    names: [
      'Rafael Race Parts',
      'Chiodini',
      'Casa de Oracao',
      'Valmir',
      'Paulo Conveniencia',
      'Paulo G net',
      'Venda De Chale - Lisnara',
      'Outros',
    ],
  },
  {
    type: 'INCOME_OTHER',
    names: ['Investimentos', 'Outros'],
  },
  {
    type: 'COST_FIXED',
    names: [
      'Aluguel',
      'Agua',
      'Energia',
      'Internet',
      'Gas',
      'Contabilidade',
      'Hospedagem Online',
    ],
  },
  {
    type: 'COST_VARIABLE',
    names: [
      'Manutencao Equipamentos',
      'Infra-Estrutura Galpao',
      'Ferramentas/Equipamentos',
      'Combustivel',
      'Alimentos e Bebidas',
      'Higiene e Limpeza',
      'Insumos e Materiais',
      'Taxa/Documentos',
      'Pagamento Colaborador',
      'Frete',
      'Servicos Terceirizados',
      'Pro-Labore Jonathan',
      'Pro-Labore Helio',
      'Marketing',
      'Comissao Venda/DIO',
      'Cartao de Credito',
      'Investimentos',
    ],
  },
]

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const result = {
      created: 0,
      existing: 0,
      byType: {} as Record<string, { created: number; existing: number }>,
    }

    for (const entry of SEED_DATA) {
      result.byType[entry.type] = { created: 0, existing: 0 }

      for (let i = 0; i < entry.names.length; i++) {
        const name = entry.names[i]
        const existing = await prisma.financialOption.findFirst({
          where: { type: entry.type, name },
        })
        if (existing) {
          result.existing++
          result.byType[entry.type].existing++
          continue
        }
        await prisma.financialOption.create({
          data: { type: entry.type, name, order: i + 1, active: true },
        })
        result.created++
        result.byType[entry.type].created++
      }
    }

    return NextResponse.json({
      message: 'Seed de opcoes financeiras concluido',
      ...result,
    })
  } catch (err) {
    console.error('Erro no seed de opcoes financeiras:', err)
    return NextResponse.json(
      { error: 'Erro ao executar seed de opcoes financeiras' },
      { status: 500 }
    )
  }
}
