import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { IntentId, IntentResponse } from '@/lib/ai/types'
import { orcamentosPendentes } from '@/lib/ai/intents/orcamentos-pendentes'
import { clientesInativos } from '@/lib/ai/intents/clientes-inativos'
import { estoqueCritico } from '@/lib/ai/intents/estoque-critico'
import { resumoFinanceiro } from '@/lib/ai/intents/resumo-financeiro'

const HANDLERS: Record<IntentId, () => Promise<IntentResponse>> = {
  'orcamentos-pendentes': orcamentosPendentes,
  'clientes-inativos': clientesInativos,
  'estoque-critico': estoqueCritico,
  'resumo-financeiro': resumoFinanceiro,
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await req.json()
    const intent = body?.intent as IntentId | undefined

    if (!intent || !(intent in HANDLERS)) {
      return NextResponse.json(
        {
          error: 'Intent nao reconhecido.',
          availableIntents: Object.keys(HANDLERS),
        },
        { status: 400 }
      )
    }

    const response = await HANDLERS[intent]()
    return NextResponse.json(response)
  } catch (err) {
    console.error('Erro no assistente:', err)
    return NextResponse.json(
      { error: 'Erro ao processar solicitacao do assistente.' },
      { status: 500 }
    )
  }
}
