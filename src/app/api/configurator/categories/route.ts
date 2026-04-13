import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { ValidationError, apiErrorResponse } from '@/lib/api-helpers'

const VALID_SELECTION_TYPES = ['SINGLE', 'MULTIPLE']

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const categories = await prisma.configuratorCategory.findMany({
      include: {
        options: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(categories)
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao buscar categorias', 'Erro ao buscar configurator categories:')
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const body = await request.json()
    const name = (body.name || '').trim()
    if (!name) throw new ValidationError('Nome obrigatorio')
    if (name.length > 80) throw new ValidationError('Nome muito longo (max 80 caracteres)')

    const selectionType = body.selectionType || 'SINGLE'
    if (!VALID_SELECTION_TYPES.includes(selectionType)) {
      throw new ValidationError('Tipo de selecao invalido (use SINGLE ou MULTIPLE)')
    }

    const category = await prisma.configuratorCategory.create({
      data: {
        name,
        description: body.description || null,
        selectionType,
        order: typeof body.order === 'number' ? body.order : 0,
        active: body.active !== false,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ja existe categoria com este nome' }, { status: 400 })
    }
    return apiErrorResponse(err, 'Erro ao criar categoria', 'Erro ao criar configurator category:')
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
    if (body.selectionType !== undefined) {
      if (!VALID_SELECTION_TYPES.includes(body.selectionType)) {
        throw new ValidationError('Tipo de selecao invalido')
      }
      data.selectionType = body.selectionType
    }
    if (body.order !== undefined) data.order = body.order
    if (body.active !== undefined) data.active = !!body.active

    const category = await prisma.configuratorCategory.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(category)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ja existe categoria com este nome' }, { status: 400 })
    }
    return apiErrorResponse(err, 'Erro ao atualizar categoria', 'Erro ao atualizar configurator category:')
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) throw new ValidationError('ID obrigatorio')
    // Cascade delete options tambem
    await prisma.configuratorCategory.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao excluir categoria', 'Erro ao excluir configurator category:')
  }
}
