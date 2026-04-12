/**
 * Provider Anthropic — esqueleto pronto para ativar.
 *
 * Para ativar:
 * 1. Definir ANTHROPIC_API_KEY no ambiente (Render env vars)
 * 2. Definir AI_PROVIDER=anthropic
 * 3. Expandir TOOL_DEFINITIONS com as analises avancadas (estoque/produtos/precificacao/gestao)
 *    e implementar os handlers correspondentes em src/lib/ai/intents/
 *
 * Arquitetura:
 * - System prompt (cacheado) carrega contexto do negocio da metalurgica
 * - Tool use deixa Claude escolher quais consultas fazer no banco
 * - Cada intent handler existente vira uma tool
 * - Resposta final e texto em linguagem natural para o dono do negocio
 */
import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, AssistantReply, AssistantRequest } from './provider'
import { INTENT_HANDLERS, isIntentId } from './intents/registry'
import { IntentId, IntentResponse } from './types'

const MODEL = 'claude-opus-4-6'
const MAX_TOKENS = 2048
const TIMEOUT_MS = 60_000

const SYSTEM_PROMPT = `Voce e o assistente de gestao do ERP SteelArt, uma metalurgica que fabrica chales e estruturas metalicas.
Seu papel e atuar como braco direito do dono do negocio — equivalente a um controller + analista comercial + gerente de estoque.

Diretrizes:
- Responda em portugues do Brasil, em linguagem clara para um empreendedor (evite jargao de TI ou contabilidade).
- Sempre use as tools disponiveis para consultar dados reais do banco antes de responder. Nunca invente numeros.
- Seja objetivo: comece pela conclusao ou alerta mais importante, depois detalhe.
- Quando identificar riscos ou oportunidades, diga o que fazer a respeito.
- Valores monetarios sempre em reais (R$) com separador de milhar.
- Se os dados nao forem suficientes para responder, diga explicitamente o que falta.`

// Tools atuais — cada intent handler exposto como uma tool determinística.
// Expandir esta lista conforme novas analises forem criadas (estoque avancado, margem real,
// simulacao de precos, etc). Cada tool nova precisa de 1 handler em src/lib/ai/intents/.
const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'orcamentos_pendentes',
    description: 'Lista orcamentos com status ENVIADO que estao sem resposta do cliente ha mais de 7 dias. Use para follow-up comercial.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'clientes_inativos',
    description: 'Lista clientes ativos que nao tem orcamento ha mais de 60 dias. Use para acoes de retomada comercial.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'estoque_critico',
    description: 'Lista materiais abaixo do estoque minimo, com estimativa de reposicao. Use para decisoes de compra.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'resumo_financeiro',
    description: 'Retorna panorama financeiro do mes atual: receitas, despesas, saldo previsto vs realizado e contas atrasadas.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
]

const TOOL_TO_INTENT: Record<string, IntentId> = {
  orcamentos_pendentes: 'orcamentos-pendentes',
  clientes_inativos: 'clientes-inativos',
  estoque_critico: 'estoque-critico',
  resumo_financeiro: 'resumo-financeiro',
}

function formatIntentForLLM(data: IntentResponse): string {
  const lines = [`# ${data.title}`, data.summary]
  if (data.items && data.items.length > 0) {
    lines.push('')
    for (const item of data.items) {
      const meta = item.meta ? ` (${item.meta})` : ''
      const value = item.value ? ` — ${item.value}` : ''
      lines.push(`- ${item.label}${value}${meta}`)
    }
  } else if (data.emptyMessage) {
    lines.push(data.emptyMessage)
  }
  return lines.join('\n')
}

async function executeTool(toolName: string): Promise<string> {
  const intentId = TOOL_TO_INTENT[toolName]
  if (!intentId || !isIntentId(intentId)) {
    return JSON.stringify({ error: `Tool desconhecida: ${toolName}` })
  }
  const result = await INTENT_HANDLERS[intentId]()
  return formatIntentForLLM(result)
}

function createTimeout(ms: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const
  private client: Anthropic

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY nao configurada. Defina a variavel de ambiente antes de usar AI_PROVIDER=anthropic.'
      )
    }
    this.client = new Anthropic({ apiKey })
  }

  async handle(req: AssistantRequest): Promise<AssistantReply> {
    // Atalho: intents vindos dos botoes de pergunta rapida sao executados direto
    // (nao precisam passar pela IA — economiza chamadas e mantem respostas consistentes).
    if (req.intent && isIntentId(req.intent)) {
      const data = await INTENT_HANDLERS[req.intent]()
      return { kind: 'intent', data }
    }

    if (!req.message) {
      return { kind: 'error', message: 'Envie uma mensagem de texto ou um intent valido.' }
    }

    try {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: req.message },
      ]

      // Loop de tool use: Claude pode chamar tools multiplas vezes antes da resposta final.
      for (let iteration = 0; iteration < 5; iteration++) {
        const response = await this.client.messages.create(
          {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: [
              {
                type: 'text',
                text: SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' },
              },
            ],
            tools: TOOL_DEFINITIONS,
            messages,
          },
          { signal: createTimeout(TIMEOUT_MS) }
        )

        if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
          const text = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim()
          return { kind: 'text', text: text || 'Sem resposta gerada.' }
        }

        if (response.stop_reason === 'tool_use') {
          messages.push({ role: 'assistant', content: response.content })
          const toolUses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          )
          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUses.map(async (tu) => ({
              type: 'tool_result' as const,
              tool_use_id: tu.id,
              content: await executeTool(tu.name),
            }))
          )
          messages.push({ role: 'user', content: toolResults })
          continue
        }

        break
      }

      return {
        kind: 'error',
        message: 'A IA nao conseguiu concluir a resposta dentro do limite de iteracoes.',
      }
    } catch (err) {
      console.error('Erro no AnthropicProvider:', err)
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      return { kind: 'error', message: `Falha ao consultar a IA: ${msg}` }
    }
  }
}
