export interface IntentResponse {
  title: string
  summary: string
  items?: IntentItem[]
  emptyMessage?: string
}

export interface IntentItem {
  label: string
  value?: string
  meta?: string
  highlight?: 'warning' | 'danger' | 'success' | 'info'
}

export type IntentId =
  | 'orcamentos-pendentes'
  | 'clientes-inativos'
  | 'estoque-critico'
  | 'resumo-financeiro'

export interface QuickQuestion {
  id: IntentId
  label: string
  description: string
}

export const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: 'orcamentos-pendentes',
    label: 'Orcamentos aguardando resposta',
    description: 'Enviados ha mais de 7 dias sem aprovacao ou rejeicao',
  },
  {
    id: 'clientes-inativos',
    label: 'Clientes inativos',
    description: 'Sem orcamento ou venda ha mais de 60 dias',
  },
  {
    id: 'estoque-critico',
    label: 'Estoque critico',
    description: 'Materiais abaixo do estoque minimo',
  },
  {
    id: 'resumo-financeiro',
    label: 'Resumo financeiro do mes',
    description: 'Receitas, despesas e saldo do mes atual',
  },
]
