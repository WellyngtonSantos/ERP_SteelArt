import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { enforceRateLimit, totalImagesSize } from '@/lib/api-helpers'

const MAX_TOTAL_IMAGES_BYTES = 25 * 1024 * 1024 // 25MB agregado por produto

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      include: {
        configuratorDefaults: {
          orderBy: { order: 'asc' },
          include: {
            option: {
              include: { category: true },
            },
          },
        },
      },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

// Parse e valida a lista de opcoes padrao do configurador vinda do form
// Formato esperado: JSON array [{ optionId, quantity }]
async function parseConfiguratorDefaults(raw: string | null | undefined): Promise<Array<{ optionId: string; quantity: number; order: number }>> {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const seen = new Set<string>()
  const result: Array<{ optionId: string; quantity: number; order: number }> = []
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as { optionId?: string; quantity?: number } | null
    if (!item || typeof item.optionId !== 'string' || !item.optionId) continue
    if (seen.has(item.optionId)) continue
    seen.add(item.optionId)
    const q = typeof item.quantity === 'number' && isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1
    result.push({ optionId: item.optionId, quantity: q, order: i })
  }
  // Filtra IDs que nao existem no banco
  if (result.length === 0) return []
  const existing = await prisma.configuratorOption.findMany({
    where: { id: { in: result.map((r) => r.optionId) } },
    select: { id: true },
  })
  const validIds = new Set(existing.map((e) => e.id))
  return result.filter((r) => validIds.has(r.optionId))
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAllowedPage('/produtos')
  if (error) return error

  const userId = (session!.user as any).id as string | undefined
  const blocked = enforceRateLimit(request, 'products:write', 30, 60 * 1000, userId)
  if (blocked) return blocked

  try {
    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const materialsJson = formData.get('materialsJson') as string
    const ironCost = parseFloat(formData.get('ironCost') as string) || 0
    const paintCost = parseFloat(formData.get('paintCost') as string) || 0
    const defaultMargin = parseFloat(formData.get('defaultMargin') as string) || 20
    const tempoProducaoDias = parseFloat(formData.get('tempoProducaoDias') as string) || 0
    const tempoMontagemDias = parseFloat(formData.get('tempoMontagemDias') as string) || 0

    if (!name) {
      return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })
    }

    // Handle image uploads - convert to base64 data URI (max 10MB per file)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const imageDataUris: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        if (file.size > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: 'Imagem muito grande (max 10MB)' }, { status: 400 })
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

    const joinedImages = imageDataUris.length > 0 ? imageDataUris.join('|||') : null
    if (totalImagesSize(joinedImages) > MAX_TOTAL_IMAGES_BYTES) {
      return NextResponse.json({ error: 'Total de imagens excede 25MB por produto' }, { status: 400 })
    }

    const defaults = await parseConfiguratorDefaults(formData.get('configuratorDefaults') as string | null)

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        materialsJson: materialsJson || '[]',
        ironCost,
        paintCost,
        defaultMargin,
        tempoProducaoDias,
        tempoMontagemDias,
        images: joinedImages,
        configuratorDefaults: defaults.length > 0 ? {
          create: defaults.map((d) => ({
            optionId: d.optionId,
            quantity: d.quantity,
            order: d.order,
          })),
        } : undefined,
      },
      include: {
        configuratorDefaults: {
          include: { option: { include: { category: true } } },
        },
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error, session } = await requireAllowedPage('/produtos')
  if (error) return error

  const userId = (session!.user as any).id as string | undefined
  const blocked = enforceRateLimit(request, 'products:write', 30, 60 * 1000, userId)
  if (blocked) return blocked

  try {
    const formData = await request.formData()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const materialsJson = formData.get('materialsJson') as string
    const ironCost = parseFloat(formData.get('ironCost') as string) || 0
    const paintCost = parseFloat(formData.get('paintCost') as string) || 0
    const defaultMargin = parseFloat(formData.get('defaultMargin') as string) || 20
    const tempoProducaoDias = parseFloat(formData.get('tempoProducaoDias') as string) || 0
    const tempoMontagemDias = parseFloat(formData.get('tempoMontagemDias') as string) || 0
    const existingImages = formData.get('existingImages') as string | null

    if (!id || !name) {
      return NextResponse.json({ error: 'ID e nome obrigatorios' }, { status: 400 })
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })
    }

    // Handle new image uploads - convert to base64 data URI (max 10MB per file)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const newImageDataUris: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        if (file.size > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: 'Imagem muito grande (max 10MB)' }, { status: 400 })
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
    const joinedImages = allImages.length > 0 ? allImages.join('|||') : null

    if (totalImagesSize(joinedImages) > MAX_TOTAL_IMAGES_BYTES) {
      return NextResponse.json({ error: 'Total de imagens excede 25MB por produto' }, { status: 400 })
    }

    const defaults = await parseConfiguratorDefaults(formData.get('configuratorDefaults') as string | null)

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name,
          description: description || null,
          materialsJson: materialsJson || '[]',
          ironCost,
          paintCost,
          defaultMargin,
          tempoProducaoDias,
          tempoMontagemDias,
          images: joinedImages,
        },
      })
      // Substitui o conjunto de defaults por completo (simples e idempotente)
      await tx.productConfiguratorDefault.deleteMany({ where: { productId: id } })
      if (defaults.length > 0) {
        await tx.productConfiguratorDefault.createMany({
          data: defaults.map((d) => ({
            productId: id,
            optionId: d.optionId,
            quantity: d.quantity,
            order: d.order,
          })),
        })
      }
      return tx.product.findUnique({
        where: { id: updated.id },
        include: {
          configuratorDefaults: {
            include: { option: { include: { category: true } } },
          },
        },
      })
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAllowedPage('/produtos')
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
