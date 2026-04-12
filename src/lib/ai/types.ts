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

export type AnalysisCategory = 'estoque' | 'produtos' | 'precificacao' | 'gestao'

export interface AnalysisPreview {
  id: string
  category: AnalysisCategory
  question: string
  description: string
  example: string
}

export const ANALYSIS_CATEGORIES: { id: AnalysisCategory; label: string; color: string }[] = [
  { id: 'estoque', label: 'Estoque', color: '#10b981' },
  { id: 'produtos', label: 'Produtos', color: '#8b5cf6' },
  { id: 'precificacao', label: 'Precificacao', color: '#d97706' },
  { id: 'gestao', label: 'Gestao Executiva', color: '#3b82f6' },
]

export const ANALYSIS_PREVIEWS: AnalysisPreview[] = [
  // Estoque
  {
    id: 'capital-parado',
    category: 'estoque',
    question: 'Quanto capital esta parado no estoque?',
    description: 'Identifica materiais com giro lento travando dinheiro',
    example: 'R$ 12.430 parados em 4 materiais. O aco 6m representa 58% desse total e nao e consumido ha 40 dias.',
  },
  {
    id: 'previsao-esgotamento',
    category: 'estoque',
    question: 'Em quantos dias o aco vai acabar?',
    description: 'Projeta esgotamento baseado no consumo dos projetos ativos',
    example: 'Considerando os 3 projetos em producao, o aco 12mm esgota em 8 dias. Sugerimos compra ate sexta.',
  },
  {
    id: 'risco-producao',
    category: 'estoque',
    question: 'Ha material zerado em orcamento aprovado?',
    description: 'Cruza aprovacoes com estoque para alertar travamentos',
    example: '2 projetos aprovados usam tinta galvanica que esta zerada. Risco de atraso de 5 dias na entrega.',
  },
  {
    id: 'sugestao-compra',
    category: 'estoque',
    question: 'O que devo comprar essa semana?',
    description: 'Lista priorizada baseada em consumo historico + projetos ativos',
    example: 'Top 3: aco 12mm (urgente), parafuso M10 (7 dias), tinta galvanica (reposicao). Total estimado: R$ 4.200.',
  },
  // Produtos
  {
    id: 'margem-real',
    category: 'produtos',
    question: 'Qual produto tem a maior margem real?',
    description: 'Margem real considera custos indiretos, nao so a margem configurada',
    example: 'Chale 3x3 tem margem real de 34% (configurada: 25%). Chale 4x4 tem margem real de 12% (configurada: 25%) — custo de mao de obra subestimado.',
  },
  {
    id: 'taxa-aprovacao',
    category: 'produtos',
    question: 'Que produto e orcado muito e aprovado pouco?',
    description: 'Identifica produtos com preco possivelmente fora do mercado',
    example: 'Chale 4x4: 12 orcamentos, so 2 aprovados (16%). Media de outros produtos: 45%. Avaliar reducao de 8-10%.',
  },
  {
    id: 'mix-lucrativo',
    category: 'produtos',
    question: 'Qual mix de produtos gera mais lucro por hora-homem?',
    description: 'Otimiza alocacao da equipe pelo retorno por hora trabalhada',
    example: 'Chale 3x3 retorna R$ 180/hora-homem, enquanto servicos sob medida retornam R$ 95/hora. Priorizar catalogo padrao.',
  },
  // Precificacao
  {
    id: 'cobertura-custos',
    category: 'precificacao',
    question: 'Minha margem cobre custos fixos + impostos?',
    description: 'Calcula break-even considerando tudo que a empresa gasta',
    example: 'Margem atual de 20% cobre custos fixos ate 8 projetos/mes. Abaixo disso, prejuizo de R$ 340/projeto.',
  },
  {
    id: 'preco-minimo',
    category: 'precificacao',
    question: 'Qual o preco minimo pra nao ter prejuizo?',
    description: 'Piso de precificacao considerando custo total real',
    example: 'Neste orcamento, o piso e R$ 4.820 (material + mao de obra + rateio de custo fixo + impostos). Abaixo, prejuizo.',
  },
  {
    id: 'simulacao-cenario',
    category: 'precificacao',
    question: 'Se o aco subir 5%, quanto perco em margem?',
    description: 'Simulacao de sensibilidade a mudancas de custo',
    example: 'Alta de 5% no aco reduz margem media de 22% para 18%. Pra manter, repassar 3% no preco final.',
  },
  // Gestao
  {
    id: 'resumo-executivo',
    category: 'gestao',
    question: 'Me da o panorama do negocio essa semana',
    description: 'Resumo executivo em linguagem natural, como um controller faria',
    example: 'Semana positiva: 3 orcamentos aprovados (R$ 28k), 2 projetos entregues no prazo. Atencao: 4 contas a pagar vencem terca e o saldo previsto e apertado.',
  },
  {
    id: 'onde-perco-dinheiro',
    category: 'gestao',
    question: 'Onde estou perdendo dinheiro esse mes?',
    description: 'Identifica ralos financeiros e ineficiencias',
    example: 'Principal ralo: horas nao faturadas na producao (R$ 2.100 em retrabalho). Em segundo: deducoes de EPI acima da media.',
  },
  {
    id: 'prioridades-semana',
    category: 'gestao',
    question: 'Quais sao as 3 prioridades dessa semana?',
    description: 'Lista de acoes de maior impacto baseada no estado do negocio',
    example: '1) Cobrar os 2 orcamentos de R$ 15k+ enviados ha 10 dias. 2) Comprar aco antes de sexta. 3) Fechar o projeto X — ja consumiu 110% das horas previstas.',
  },
  {
    id: 'alertas-proativos',
    category: 'gestao',
    question: 'Tem algum alerta que eu deveria ver?',
    description: 'Monitor proativo de riscos: atrasos, prejuizos, contas, travamentos',
    example: 'Alerta: projeto Y tem entrada paga mas entrega atrasada em 8 dias — risco de multa contratual. Alerta: cliente Z tem historico de pagamento em atraso e novo orcamento aprovado.',
  },
]

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
