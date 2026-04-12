import { INTENT_HANDLERS, isIntentId } from './intents/registry'
import { AIProvider, AssistantReply, AssistantRequest } from './provider'
import { IntentId, QUICK_QUESTIONS } from './types'

// Mapeamento simples de palavras-chave para intents.
// Usado quando o usuario digita texto livre e o provider Anthropic ainda nao esta ativo.
const KEYWORD_MAP: { keywords: RegExp; intent: IntentId }[] = [
  { keywords: /\b(orcament|proposta|cotac)/i, intent: 'orcamentos-pendentes' },
  { keywords: /\bpendent|aguardando|sem retorno|follow.?up/i, intent: 'orcamentos-pendentes' },
  { keywords: /\bclient|comprador/i, intent: 'clientes-inativos' },
  { keywords: /\binativ|sumi|parou de comprar/i, intent: 'clientes-inativos' },
  { keywords: /\b(estoque|material|materia.prima|aco|tinta|parafuso)/i, intent: 'estoque-critico' },
  { keywords: /\bcritic|acabando|zerado|falta/i, intent: 'estoque-critico' },
  { keywords: /\b(financeiro|receita|despesa|saldo|caixa|mes|faturamento)/i, intent: 'resumo-financeiro' },
]

function matchIntent(message: string): IntentId | null {
  for (const { keywords, intent } of KEYWORD_MAP) {
    if (keywords.test(message)) return intent
  }
  return null
}

function fallbackMessage(): string {
  const opcoes = QUICK_QUESTIONS.map((q) => `• ${q.label}`).join('\n')
  return [
    'Ainda nao consigo entender perguntas em texto livre — isso ficara disponivel quando a IA avancada for ativada.',
    '',
    'Por enquanto, posso responder estas perguntas rapidas:',
    opcoes,
    '',
    'Clique em um dos botoes abaixo ou reformule sua pergunta usando essas palavras-chave.',
  ].join('\n')
}

export class MockProvider implements AIProvider {
  readonly name = 'mock' as const

  async handle(req: AssistantRequest): Promise<AssistantReply> {
    if (req.intent && isIntentId(req.intent)) {
      const data = await INTENT_HANDLERS[req.intent]()
      return { kind: 'intent', data }
    }

    if (req.message) {
      const matched = matchIntent(req.message)
      if (matched) {
        const data = await INTENT_HANDLERS[matched]()
        return { kind: 'intent', data }
      }
      return { kind: 'text', text: fallbackMessage() }
    }

    return { kind: 'error', message: 'Envie um intent valido ou uma mensagem de texto.' }
  }
}
