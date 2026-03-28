import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const materialsJson = formData.get('materialsJson') as string
    const ironCost = parseFloat(formData.get('ironCost') as string) || 0
    const paintCost = parseFloat(formData.get('paintCost') as string) || 0
    const defaultMargin = parseFloat(formData.get('defaultMargin') as string) || 20

    if (!name) {
      return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })
    }

    // Handle image uploads - convert to base64 data URI (max 5MB per file)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const imageDataUris: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        if (file.size > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: 'Imagem muito grande (max 5MB)' }, { status: 400 })
        }
        const mimeType = file.type || 'image/jpeg'
        if (!ALLOWED_TYPES.includes(mimeType)) {
          return NextResponse.json({ error: 'Tipo de imagem nao permitido' }, { status: 400 })
        }
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        imageDataUris.push(`data:${mimeType};base64,${base64}`)
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        materialsJson: materialsJson || '[]',
        ironCost,
        paintCost,
        defaultMargin,
        images: imageDataUris.length > 0 ? imageDataUris.join('|||') : null,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const formData = await request.formData()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const materialsJson = formData.get('materialsJson') as string
    const ironCost = parseFloat(formData.get('ironCost') as string) || 0
    const paintCost = parseFloat(formData.get('paintCost') as string) || 0
    const defaultMargin = parseFloat(formData.get('defaultMargin') as string) || 20
    const existingImages = formData.get('existingImages') as string | null

    if (!id || !name) {
      return NextResponse.json({ error: 'ID e nome obrigatorios' }, { status: 400 })
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })
    }

    // Handle new image uploads - convert to base64 data URI (max 5MB per file)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const newImageDataUris: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        if (file.size > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: 'Imagem muito grande (max 5MB)' }, { status: 400 })
        }
        const mimeType = file.type || 'image/jpeg'
        if (!ALLOWED_TYPES.includes(mimeType)) {
          return NextResponse.json({ error: 'Tipo de imagem nao permitido' }, { status: 400 })
        }
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        newImageDataUris.push(`data:${mimeType};base64,${base64}`)
      }
    }

    // Merge existing images with new ones
    const keepImages = existingImages ? existingImages.split('|||').filter(Boolean) : []
    const allImages = [...keepImages, ...newImageDataUris]

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description: description || null,
        materialsJson: materialsJson || '[]',
        ironCost,
        paintCost,
        defaultMargin,
        images: allImages.length > 0 ? allImages.join('|||') : null,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }

    await prisma.product.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ message: 'Produto desativado' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Erro ao desativar produto' }, { status: 500 })
  }
}
