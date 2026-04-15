import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { ValidationError, apiErrorResponse } from '@/lib/api-helpers'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const partners = await prisma.partner.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })

    // Seed automatico na primeira chamada: popula padrao da SteelArt (Helio + Jonathan + Caixa)
    if (partners.length === 0) {
      await prisma.partner.createMany({
        data: [
          { name: 'Helio', kind: 'PARTNER', sharePercent: 33.3, order: 1 },
          { name: 'Jonathan', kind: 'PARTNER', sharePercent: 33.3, order: 2 },
          { name: 'Caixa Empresa', kind: 'COMPANY_CASH', sharePercent: 33.4, order: 3 },
        ],
      })
      const seeded = await prisma.partner.findMany({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      })
      return NextResponse.json(seeded)
    }

    return NextResponse.json(partners)
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao buscar socios', 'Erro ao buscar socios:')
  }
}

function validateKind(k: unknown): 'PARTNER' | 'COMPANY_CASH' {
  return k === 'COMPANY_CASH' ? 'COMPANY_CASH' : 'PARTNER'
}

export async function POST(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const body = await request.json()
    const name = (body.name || '').trim()
    if (!name) throw new ValidationError('Nome e obrigatorio.')
    const share = typeof body.sharePercent === 'number' ? body.sharePercent : 0
    if (share < 0 || share > 100) throw new ValidationError('Participacao deve estar entre 0 e 100.')

    const partner = await prisma.partner.create({
      data: {
        name,
        kind: validateKind(body.kind),
        sharePercent: share,
        order: typeof body.order === 'number' ? body.order : 0,
        active: body.active !== false,
      },
    })
    return NextResponse.json(partner, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao criar socio', 'Erro ao criar socio:')
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
    if (body.kind !== undefined) data.kind = validateKind(body.kind)
    if (body.sharePercent !== undefined) {
      const s = Number(body.sharePercent)
      if (isNaN(s) || s < 0 || s > 100) throw new ValidationError('Participacao deve estar entre 0 e 100.')
      data.sharePercent = s
    }
    if (body.order !== undefined) data.order = Number(body.order) || 0
    if (body.active !== undefined) data.active = !!body.active

    const partner = await prisma.partner.update({ where: { id: body.id }, data })
    return NextResponse.json(partner)
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao atualizar socio', 'Erro ao atualizar socio:')
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) throw new ValidationError('ID obrigatorio.')
    await prisma.partner.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Erro ao excluir socio', 'Erro ao excluir socio:')
  }
}
