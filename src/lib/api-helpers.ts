import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimitCustom } from './rate-limit'

// Erro de validacao com mensagem segura para exibir ao usuario.
// Usar em vez de `throw new Error(...)` quando a mensagem deve vazar pro frontend.
export class ValidationError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ValidationError'
    this.status = status
  }
}

// Converte erros conhecidos em resposta segura; caso contrario retorna generica e loga detalhes.
export function apiErrorResponse(err: unknown, fallbackMessage: string, logContext: string): NextResponse {
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error(logContext, err)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

// Extrai o IP do cliente levando em conta proxies (Render usa x-forwarded-for).
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  const xr = request.headers.get('x-real-ip')
  if (xr) return xr.trim()
  return 'unknown'
}

// Rate limit para rotas autenticadas. Prefere session.user.id; cai para IP quando nao autenticado.
// Retorna NextResponse (429) quando bloqueado, ou null quando liberado.
export function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  max: number,
  windowMs: number,
  identifier?: string | null
): NextResponse | null {
  const id = identifier || getClientIp(request)
  const key = `${bucket}:${id}`
  const { allowed, retryAfterMs } = checkRateLimitCustom(key, max, windowMs)
  if (allowed) return null

  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000))
  return NextResponse.json(
    { error: 'Muitas requisicoes. Aguarde alguns instantes e tente novamente.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    }
  )
}

// Tamanho aproximado em bytes de uma imagem base64 data URI (descontando prefixo e padding).
export function base64DataUriSize(dataUri: string): number {
  const commaIdx = dataUri.indexOf(',')
  const b64 = commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding)
}

// Soma o tamanho de um conjunto de imagens separadas por |||.
export function totalImagesSize(joined: string | null | undefined): number {
  if (!joined) return 0
  return joined
    .split('|||')
    .filter(Boolean)
    .reduce((acc, uri) => acc + base64DataUriSize(uri), 0)
}
