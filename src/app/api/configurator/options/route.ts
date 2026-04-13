import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { ValidationError, apiErrorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const where: any = {}
    if (categoryId) where.categoryId = categoryId

    const options = await prisma.configuratorOption.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(options)
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao buscar opcoes', 'Erro ao buscar configurator options:')
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const body = await request.json()
    if (!body.categoryId) throw new ValidationError('Categoria obrigatoria')
    const name = (body.name || '').trim()
    if (!name) throw new ValidationError('Nome obrigatorio')
    if (name.length > 120) throw new ValidationError('Nome muito longo (max 120 caracteres)')

    const option = await prisma.configuratorOption.create({
      data: {
        categoryId: body.categoryId,
        name,
        description: body.description || null,
        unitPrice: parseFloat(body.unitPrice) || 0,
        tempoDias: parseFloat(body.tempoDias) || 0,
        order: typeof body.order === 'number' ? body.order : 0,
        active: body.active !== false,
      },
    })
    return NextResponse.json(option, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao criar opcao', 'Erro ao criar configurator option:')
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const body = await request.json()
    if (!body.id) throw new ValidationError('ID obrigatorio')

    const data: any = {}
    if (body.name !== undefined) {
      const n = body.name.trim()
      if (!n) throw new ValidationError('Nome nao pode ser vazio')
      data.name = n
    }
    if (body.description !== undefined) data.description = body.description || null
    if (body.unitPrice !== undefined) data.unitPrice = parseFloat(body.unitPrice) || 0
    if (body.tempoDias !== undefined) data.tempoDias = parseFloat(body.tempoDias) || 0
    if (body.order !== undefined) data.order = body.order
    if (body.active !== undefined) data.active = !!body.active

    const option = await prisma.configuratorOption.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(option)
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao atualizar opcao', 'Erro ao atualizar configurator option:')
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) throw new ValidationError('ID obrigatorio')
    await prisma.configuratorOption.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao excluir opcao', 'Erro ao excluir configurator option:')
  }
}
