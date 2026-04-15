import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { ValidationError, apiErrorResponse } from '@/lib/api-helpers'

// BANK/CATEGORY/GROUP: tipos legados (mantidos pra nao quebrar lancamentos antigos)
// PAYMENT_METHOD: formas de pagamento (Boleto, Cartao, PIX, Bric, Dinheiro...)
// INCOME_MAIN: receitas principais (clientes/vendas)
// INCOME_OTHER: receitas outras (investimentos, outros)
// COST_FIXED: custos fixos (aluguel, agua, energia...)
// COST_VARIABLE: custos variaveis (manutencao, combustivel, frete...)
const VALID_TYPES = [
  'BANK',
  'CATEGORY',
  'GROUP',
  'PAYMENT_METHOD',
  'INCOME_MAIN',
  'INCOME_OTHER',
  'COST_FIXED',
  'COST_VARIABLE',
]

function validateType(type: string | null): string {
  if (!type || !VALID_TYPES.includes(type)) {
    throw new ValidationError(`Tipo invalido. Use um de: ${VALID_TYPES.join(', ')}.`)
  }
  return type
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get('type')

    const where: any = {}
    if (typeParam) {
      where.type = validateType(typeParam)
    }

    const options = await prisma.financialOption.findMany({
      where,
      orderBy: [{ type: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(options)
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao buscar opcoes', 'Erro ao buscar opcoes:')
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const body = await request.json()
    const type = validateType(body.type)
    const name = (body.name || '').trim()
    if (!name) throw new ValidationError('Nome e obrigatorio.')
    if (name.length > 80) throw new ValidationError('Nome muito longo (max 80 caracteres).')

    const option = await prisma.financialOption.create({
      data: {
        type,
        name,
        active: body.active !== false,
        order: typeof body.order === 'number' ? body.order : 0,
      },
    })
    return NextResponse.json(option, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ja existe uma opcao com este nome neste tipo.' }, { status: 400 })
    }
    return apiErrorResponse(err, 'Erro ao criar opcao', 'Erro ao criar opcao:')
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const body = await request.json()
    if (!body.id) throw new ValidationError('ID obrigatorio.')

    const data: any = {}
    if (body.name !== undefined) {
      const n = body.name.trim()
      if (!n) throw new ValidationError('Nome nao pode ser vazio.')
      data.name = n
    }
    if (body.active !== undefined) data.active = !!body.active
    if (body.order !== undefined) data.order = body.order

    const option = await prisma.financialOption.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(option)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ja existe uma opcao com este nome neste tipo.' }, { status: 400 })
    }
    return apiErrorResponse(err, 'Erro ao atualizar opcao', 'Erro ao atualizar opcao:')
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) throw new ValidationError('ID obrigatorio.')
    await prisma.financialOption.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao excluir opcao', 'Erro ao excluir opcao:')
  }
}
