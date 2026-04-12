import { NextRequest, NextResponse } from 'next/server'
import { requireAllowedPage } from '@/lib/auth'
import { getAIProvider } from '@/lib/ai/factory'
import { isIntentId } from '@/lib/ai/intents/registry'

export async function POST(req: NextRequest) {
  const { error } = await requireAllowedPage('/assistente')
  if (error) return error

  try {
    const body = await req.json()
    const intent = body?.intent
    const message = typeof body?.message === 'string' ? body.message : undefined

    if (intent && !isIntentId(intent)) {
      return NextResponse.json({ error: 'Intent nao reconhecido.' }, { status: 400 })
    }

    if (!intent && !message) {
      return NextResponse.json(
        { error: 'Envie um intent ou uma mensagem.' },
        { status: 400 }
      )
    }

    const provider = getAIProvider()
    const reply = await provider.handle({ intent: intent || undefined, message })

    if (reply.kind === 'error') {
      return NextResponse.json({ error: reply.message }, { status: 500 })
    }

    if (reply.kind === 'intent') {
      return NextResponse.json({ kind: 'intent', ...reply.data })
    }

    return NextResponse.json({ kind: 'text', text: reply.text })
  } catch (err) {
    console.error('Erro no assistente:', err)
    return NextResponse.json(
      { error: 'Erro ao processar solicitacao do assistente.' },
      { status: 500 }
    )
  }
}
