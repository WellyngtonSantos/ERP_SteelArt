import { IntentId, IntentResponse } from '../types'
import { orcamentosPendentes } from './orcamentos-pendentes'
import { clientesInativos } from './clientes-inativos'
import { estoqueCritico } from './estoque-critico'
import { resumoFinanceiro } from './resumo-financeiro'

export const INTENT_HANDLERS: Record<IntentId, () => Promise<IntentResponse>> = {
  'orcamentos-pendentes': orcamentosPendentes,
  'clientes-inativos': clientesInativos,
  'estoque-critico': estoqueCritico,
  'resumo-financeiro': resumoFinanceiro,
}

export function isIntentId(value: unknown): value is IntentId {
  return typeof value === 'string' && value in INTENT_HANDLERS
}
