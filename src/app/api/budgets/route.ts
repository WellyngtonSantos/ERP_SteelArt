import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcOrcamento, calcValorHora } from '@/lib/calculations'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { enforceRateLimit, totalImagesSize, ValidationError, apiErrorResponse } from '@/lib/api-helpers'

const MAX_TOTAL_IMAGES_BYTES = 10 * 1024 * 1024 // 10MB agregado por orcamento

async function parseRequestBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const dataStr = formData.get('data') as string
    const body = JSON.parse(dataStr)

    // Handle image uploads - convert to base64 data URI (max 5MB per file)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const imageDataUris: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        if (file.size > MAX_IMAGE_SIZE) throw new ValidationError('Imagem muito grande (max 5MB)')
        const mimeType = file.type || 'image/jpeg'
        if (!ALLOWED_TYPES.includes(mimeType)) throw new ValidationError('Tipo de imagem nao permitido')
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        imageDataUris.push(`data:${mimeType};base64,${base64}`)
      }
    }

    // Merge existing images with new uploads
    const existingImages = body.existingImages ? body.existingImages.split('|||').filter(Boolean) : []
    body.images = [...existingImages, ...imageDataUris].join('|||') || null
    delete body.existingImages

    if (totalImagesSize(body.images) > MAX_TOTAL_IMAGES_BYTES) {
      throw new ValidationError('Total de imagens excede 10MB por orcamento')
    }
    return body
  }

  const body = await request.json()
  // Handle existingImages from JSON requests too
  if (body.existingImages !== undefined) {
    body.images = body.existingImages || null
    delete body.existingImages
  }
  if (totalImagesSize(body.images) > MAX_TOTAL_IMAGES_BYTES) {
    throw new Error('Total de imagens excede 10MB por orcamento')
  }
  return body
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const budgets = await prisma.budget.findMany({
      include: {
        items: { include: { material: true } },
        employees: { include: { employee: true } },
        project: true,
        product: true,
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(budgets)
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Erro ao buscar orcamentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAllowedPage('/comercial')
  if (error) return error

  const userId = (session!.user as any).id as string | undefined
  const blocked = enforceRateLimit(request, 'budgets:write', 30, 60 * 1000, userId)
  if (blocked) return blocked

  try {
    const body = await parseRequestBody(request)
    const {
      clientId,
      clientName,
      clientCnpj,
      clientPhone,
      clientEmail,
      clientAddress,
      productId,
      type,
      status,
      ironCost,
      paintCost,
      profitMargin,
      casualtyMargin,
      entryPercent,
      deliveryPercent,
      taxRate,
      notes,
      images,
      items,
      employees,
    } = body

    // Calculate material costs from items
    const custoMateriais = (items || []).reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    ) + (ironCost || 0)

    // Calculate labor cost from allocated employees
    let custoMaoDeObra = 0
    if (employees && employees.length > 0) {
      const employeeIds = employees.map((e: { employeeId: string }) => e.employeeId)
      const dbEmployees = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
      })
      const costMap = new Map(dbEmployees.map((e) => [e.id, e.monthlyCost]))
      custoMaoDeObra = employees.reduce(
        (sum: number, e: { employeeId: string; hoursAllocated: number }) => {
          const monthlyCost = costMap.get(e.employeeId) || 0
          const valorHora = calcValorHora(monthlyCost)
          return sum + valorHora * e.hoursAllocated
        },
        0
      )
    }

    const calc = calcOrcamento({
      custoMateriais,
      custoMaoDeObra,
      custoPintura: paintCost || 0,
      margemLucro: profitMargin || 20,
      margemCausalidade: casualtyMargin || 5,
      aliquotaImposto: taxRate || 0,
    })

    const budget = await prisma.budget.create({
      data: {
        clientId: clientId || null,
        clientName,
        clientCnpj: clientCnpj || null,
        clientPhone: clientPhone || null,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        productId: productId || null,
        type: type || 'PRODUTO',
        status: status || 'RASCUNHO',
        ironCost: ironCost || 0,
        paintCost: paintCost || 0,
        profitMargin: profitMargin || 20,
        casualtyMargin: casualtyMargin || 5,
        entryPercent: entryPercent || 50,
        deliveryPercent: deliveryPercent || 50,
        totalCost: calc.custoBase,
        totalPrice: calc.precoFinal,
        taxRate: taxRate || 0,
        notes: notes || null,
        images: images || null,
        items: {
          create: (items || []).map(
            (item: {
              materialId?: string
              description: string
              quantity: number
              unitPrice: number
            }) => ({
              materialId: item.materialId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })
          ),
        },
        employees: {
          create: (employees || []).map(
            (emp: { employeeId: string; hoursAllocated: number }) => ({
              employeeId: emp.employeeId,
              hoursAllocated: emp.hoursAllocated,
            })
          ),
        },
      },
      include: {
        items: { include: { material: true } },
        employees: { include: { employee: true } },
      },
    })

    // If approved, create project and financial entries
    if (status === 'APROVADO') {
      const project = await prisma.project.create({
        data: {
          budgetId: budget.id,
          status: type === 'VENDA' ? 'CONCLUIDO' : 'PENDENTE',
          progress: type === 'VENDA' ? 100 : 0,
        },
      })

      const now = new Date()
      const deliveryDate = new Date(now)
      deliveryDate.setDate(deliveryDate.getDate() + 30)

      const entryAmount = calc.precoFinal * ((entryPercent || 50) / 100)
      const deliveryAmount = calc.precoFinal * ((deliveryPercent || 50) / 100)

      await prisma.financialEntry.createMany({
        data: [
          {
            type: 'RECEITA',
            category: 'PARCELA',
            description: `Entrada - ${clientName}`,
            amount: entryAmount,
            dueDate: now,
            status: 'PENDENTE',
            budgetId: budget.id,
            projectId: project.id,
          },
          {
            type: 'RECEITA',
            category: 'PARCELA',
            description: `Entrega - ${clientName}`,
            amount: deliveryAmount,
            dueDate: deliveryDate,
            status: 'PENDENTE',
            budgetId: budget.id,
            projectId: project.id,
          },
        ],
      })

      // For VENDA type: deduct items from stock
      if (type === 'VENDA' && items && items.length > 0) {
        for (const item of items) {
          if (item.materialId) {
            await prisma.material.update({
              where: { id: item.materialId },
              data: { stock: { decrement: item.quantity } },
            })
          }
        }
      }
    }

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, 'Erro ao criar orcamento', 'Error creating budget:')
  }
}

export async function PUT(request: NextRequest) {
  const { error, session } = await requireAllowedPage('/comercial')
  if (error) return error

  const userId = (session!.user as any).id as string | undefined
  const blocked = enforceRateLimit(request, 'budgets:write', 30, 60 * 1000, userId)
  if (blocked) return blocked

  try {
    const body = await parseRequestBody(request)
    const {
      id,
      clientId,
      clientName,
      clientCnpj,
      clientPhone,
      clientEmail,
      clientAddress,
      productId,
      type,
      status,
      ironCost,
      paintCost,
      profitMargin,
      casualtyMargin,
      entryPercent,
      deliveryPercent,
      taxRate,
      notes,
      images,
      items,
      employees,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }

    // Check if budget exists
    const existing = await prisma.budget.findUnique({
      where: { id },
      include: { project: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Orcamento nao encontrado' }, { status: 404 })
    }

    // Calculate costs
    const custoMateriais = (items || []).reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    ) + (ironCost || 0)

    let custoMaoDeObra = 0
    if (employees && employees.length > 0) {
      const employeeIds = employees.map((e: { employeeId: string }) => e.employeeId)
      const dbEmployees = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
      })
      const costMap = new Map(dbEmployees.map((e) => [e.id, e.monthlyCost]))
      custoMaoDeObra = employees.reduce(
        (sum: number, e: { employeeId: string; hoursAllocated: number }) => {
          const monthlyCost = costMap.get(e.employeeId) || 0
          const valorHora = calcValorHora(monthlyCost)
          return sum + valorHora * e.hoursAllocated
        },
        0
      )
    }

    const calc = calcOrcamento({
      custoMateriais,
      custoMaoDeObra,
      custoPintura: paintCost || 0,
      margemLucro: profitMargin || 20,
      margemCausalidade: casualtyMargin || 5,
      aliquotaImposto: taxRate || 0,
    })

    // Delete old items and employees, then recreate
    await prisma.budgetItem.deleteMany({ where: { budgetId: id } })
    await prisma.budgetEmployee.deleteMany({ where: { budgetId: id } })

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        clientId: clientId || null,
        clientName,
        clientCnpj: clientCnpj || null,
        clientPhone: clientPhone || null,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        productId: productId || null,
        type: type || 'PRODUTO',
        status: status || existing.status,
        ironCost: ironCost || 0,
        paintCost: paintCost || 0,
        profitMargin: profitMargin || 20,
        casualtyMargin: casualtyMargin || 5,
        entryPercent: entryPercent || 50,
        deliveryPercent: deliveryPercent || 50,
        totalCost: calc.custoBase,
        totalPrice: calc.precoFinal,
        taxRate: taxRate || 0,
        notes: notes || null,
        images: images !== undefined ? (images || null) : undefined,
        items: {
          create: (items || []).map(
            (item: {
              materialId?: string
              description: string
              quantity: number
              unitPrice: number
            }) => ({
              materialId: item.materialId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })
          ),
        },
        employees: {
          create: (employees || []).map(
            (emp: { employeeId: string; hoursAllocated: number }) => ({
              employeeId: emp.employeeId,
              hoursAllocated: emp.hoursAllocated,
            })
          ),
        },
      },
      include: {
        items: { include: { material: true } },
        employees: { include: { employee: true } },
      },
    })

    // If status changed to APROVADO and no project exists, create project + financial entries
    if (status === 'APROVADO' && !existing.project) {
      const budgetType = type || existing.type
      const project = await prisma.project.create({
        data: {
          budgetId: budget.id,
          status: budgetType === 'VENDA' ? 'CONCLUIDO' : 'PENDENTE',
          progress: budgetType === 'VENDA' ? 100 : 0,
        },
      })

      const now = new Date()
      const deliveryDate = new Date(now)
      deliveryDate.setDate(deliveryDate.getDate() + 30)

      const entryAmount = calc.precoFinal * ((entryPercent || 50) / 100)
      const deliveryAmount = calc.precoFinal * ((deliveryPercent || 50) / 100)

      await prisma.financialEntry.createMany({
        data: [
          {
            type: 'RECEITA',
            category: 'PARCELA',
            description: `Entrada - ${clientName}`,
            amount: entryAmount,
            dueDate: now,
            status: 'PENDENTE',
            budgetId: budget.id,
            projectId: project.id,
          },
          {
            type: 'RECEITA',
            category: 'PARCELA',
            description: `Entrega - ${clientName}`,
            amount: deliveryAmount,
            dueDate: deliveryDate,
            status: 'PENDENTE',
            budgetId: budget.id,
            projectId: project.id,
          },
        ],
      })

      // For VENDA type: deduct items from stock
      if (budgetType === 'VENDA' && items && items.length > 0) {
        for (const item of items) {
          if (item.materialId) {
            await prisma.material.update({
              where: { id: item.materialId },
              data: { stock: { decrement: item.quantity } },
            })
          }
        }
      }
    }

    return NextResponse.json(budget)
  } catch (error) {
    return apiErrorResponse(error, 'Erro ao atualizar orcamento', 'Error updating budget:')
  }
}
