import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'

export async function GET() {
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

    // Handle image uploads
    const imagePaths: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', fileName)
        await writeFile(filePath, buffer)
        imagePaths.push(`/uploads/products/${fileName}`)
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
        images: imagePaths.length > 0 ? imagePaths.join(',') : null,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    // Handle new image uploads
    const newImagePaths: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', fileName)
        await writeFile(filePath, buffer)
        newImagePaths.push(`/uploads/products/${fileName}`)
      }
    }

    // Merge existing images with new ones
    const keepImages = existingImages ? existingImages.split(',').filter(Boolean) : []
    const allImages = [...keepImages, ...newImagePaths]

    // Delete removed images from disk
    const oldImages = existing.images ? existing.images.split(',').filter(Boolean) : []
    for (const oldImg of oldImages) {
      if (!keepImages.includes(oldImg)) {
        try {
          const fullPath = path.join(process.cwd(), 'public', oldImg)
          await unlink(fullPath)
        } catch {}
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description: description || null,
        materialsJson: materialsJson || '[]',
        ironCost,
        paintCost,
        defaultMargin,
        images: allImages.length > 0 ? allImages.join(',') : null,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
