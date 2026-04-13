import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { base64DataUriSize, ValidationError, apiErrorResponse } from '@/lib/api-helpers'

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024 // 3MB por boleto
const ALLOWED_ATTACHMENT_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

function validateAttachment(dataUri: string | null | undefined) {
  if (!dataUri) return
  const match = dataUri.match(/^data:([^;]+);base64,/)
  if (!match) throw new ValidationError('Anexo invalido — envie um arquivo (PDF ou imagem).')
  const mime = match[1]
  if (!ALLOWED_ATTACHMENT_MIMES.includes(mime)) {
    throw new ValidationError('Tipo de anexo nao suportado. Use PDF, JPG, PNG ou WEBP.')
  }
  const size = base64DataUriSize(dataUri)
  if (size > MAX_ATTACHMENT_BYTES) {
    throw new ValidationError('Anexo muito grande (maximo 3MB).')
  }
}

// Gera code humano unico: DSP-2026-0001 (despesa) ou RCB-2026-0001 (receita)
async function generateEntryCode(type: string): Promise<string> {
  const prefix = type === 'RECEITA' ? 'RCB' : 'DSP'
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${year}-`

  // Busca o maior numero sequencial ja usado neste ano/tipo
  const last = await prisma.financialEntry.findFirst({
    where: { code: { startsWith: pattern } },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  let next = 1
  if (last?.code) {
    const parts = last.code.split('-')
    const n = parseInt(parts[2] || '0', 10)
    if (!isNaN(n)) next = n + 1
  }

  return `${pattern}${String(next).padStart(4, '0')}`
}

// Backfill lazy de codes para entradas antigas. Roda uma unica vez por instancia.
let codesBackfilled = false
async function backfillCodesOnce() {
  if (codesBackfilled) return
  codesBackfilled = true
  try {
    const pending = await prisma.financialEntry.findMany({
      where: { code: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, type: true, createdAt: true },
    })
    if (pending.length === 0) return

    // Agrupa por ano+tipo e numera sequencialmente
    const counters = new Map<string, number>()
    for (const entry of pending) {
      const year = new Date(entry.createdAt).getFullYear()
      const prefix = entry.type === 'RECEITA' ? 'RCB' : 'DSP'
      const pattern = `${prefix}-${year}-`

      if (!counters.has(pattern)) {
        const last = await prisma.financialEntry.findFirst({
          where: { code: { startsWith: pattern } },
          orderBy: { code: 'desc' },
          select: { code: true },
        })
        let start = 0
        if (last?.code) {
          const n = parseInt(last.code.split('-')[2] || '0', 10)
          if (!isNaN(n)) start = n
        }
        counters.set(pattern, start)
      }

      const nextNum = (counters.get(pattern) || 0) + 1
      counters.set(pattern, nextNum)
      await prisma.financialEntry.update({
        where: { id: entry.id },
        data: { code: `${pattern}${String(nextNum).padStart(4, '0')}` },
      })
    }
  } catch (err) {
    console.error('Erro no backfill de codes:', err)
    codesBackfilled = false // permite tentar de novo na proxima request
  }
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    await backfillCodesOnce()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: any = {}
    if (type) where.type = type
    if (status) where.status = status

    const entries = await prisma.financialEntry.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    })
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Erro ao buscar lancamentos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar lancamentos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAllowedPage('/financeiro')
  if (error) return error

  try {
    const body = await request.json()
    validateAttachment(body.attachmentData)
    const type = body.type || 'DESPESA'
    const code = await generateEntryCode(type)
    const entry = await prisma.financialEntry.create({
      data: {
        code,
        type,
        category: body.category || '',
        description: body.description || '',
        amount: parseFloat(body.amount) || 0,
        dueDate: new Date(body.dueDate),
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        status: body.status || 'PENDENTE',
        attachmentData: body.attachmentData || null,
        attachmentName: body.attachmentName || null,
        bankName: body.bankName || null,
        categoryName: body.categoryName || null,
        groupName: body.groupName || null,
        budgetId: body.budgetId || null,
        projectId: body.projectId || null,
      },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, 'Erro ao criar lancamento', 'Erro ao criar lancamento:')
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAllowedPage('/financeiro')
  if (error) return error

  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID do lancamento e obrigatorio' },
        { status: 400 }
      )
    }

    if (body.attachmentData !== undefined) validateAttachment(body.attachmentData)

    const data: any = {}
    if (body.type !== undefined) data.type = body.type
    if (body.category !== undefined) data.category = body.category
    if (body.description !== undefined) data.description = body.description
    if (body.amount !== undefined) data.amount = parseFloat(body.amount)
    if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate)
    if (body.paidDate !== undefined) data.paidDate = body.paidDate ? new Date(body.paidDate) : null
    if (body.status !== undefined) data.status = body.status
    if (body.attachmentData !== undefined) data.attachmentData = body.attachmentData || null
    if (body.attachmentName !== undefined) data.attachmentName = body.attachmentName || null
    if (body.bankName !== undefined) data.bankName = body.bankName || null
    if (body.categoryName !== undefined) data.categoryName = body.categoryName || null
    if (body.groupName !== undefined) data.groupName = body.groupName || null
    if (body.budgetId !== undefined) data.budgetId = body.budgetId
    if (body.projectId !== undefined) data.projectId = body.projectId

    const entry = await prisma.financialEntry.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(entry)
  } catch (error) {
    return apiErrorResponse(error, 'Erro ao atualizar lancamento', 'Erro ao atualizar lancamento:')
  }
}
