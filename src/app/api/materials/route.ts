import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const materials = await prisma.material.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Erro ao buscar materiais:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar materiais' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const material = await prisma.material.create({
      data: {
        name: body.name,
        unit: body.unit,
        currentPrice: parseFloat(body.currentPrice) || 0,
        stock: parseFloat(body.stock) || 0,
        minStock: parseFloat(body.minStock) || 0,
        category: body.category || '',
      },
    })
    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar material:', error)
    return NextResponse.json(
      { error: 'Erro ao criar material' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID do material e obrigatorio' },
        { status: 400 }
      )
    }
    const material = await prisma.material.update({
      where: { id: body.id },
      data: {
        name: body.name,
        unit: body.unit,
        currentPrice: parseFloat(body.currentPrice) || 0,
        stock: parseFloat(body.stock) || 0,
        minStock: parseFloat(body.minStock) || 0,
        category: body.category || '',
      },
    })
    return NextResponse.json(material)
  } catch (error) {
    console.error('Erro ao atualizar material:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar material' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'ID do material e obrigatorio' },
        { status: 400 }
      )
    }
    await prisma.material.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar material:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar material' },
      { status: 500 }
    )
  }
}
