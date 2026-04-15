import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcOrcamento, calcOrcamentoOperacional, calcValorHora } from '@/lib/calculations'
import { requireAuth, requireAllowedPage } from '@/lib/auth'
import { enforceRateLimit, totalImagesSize, ValidationError, apiErrorResponse } from '@/lib/api-helpers'

const MAX_TOTAL_IMAGES_BYTES = 25 * 1024 * 1024 // 25MB agregado por orcamento

// Gera FinancialEntry DESPESA PENDENTE pra cada socio (PARTNER) a partir do lucro do orcamento.
// Caixa empresa (COMPANY_CASH) nao gera despesa — fica retido na empresa.
async function createProLaboreEntries(params: {
  budgetId: string
  projectId: string
  clientName: string
  lucroLiquido: number
  due: Date
}) {
  const { budgetId, projectId, clientName, lucroLiquido, due } = params
  if (lucroLiquido <= 0) return
  const partners = await prisma.partner.findMany({
    where: { active: true, kind: 'PARTNER' },
    orderBy: { order: 'asc' },
  })
  if (partners.length === 0) return

  const data = partners.map((p) => ({
    type: 'DESPESA',
    category: 'PRO_LABORE',
    group: 'CUSTO_VARIAVEL',
    description: `Pro-Labore ${p.name} - ${clientName}`,
    amount: (lucroLiquido * (p.sharePercent || 0)) / 100,
    dueDate: due,
    status: 'PENDENTE',
    budgetId,
    projectId,
  }))
  await prisma.financialEntry.createMany({ data })
}

async function parseRequestBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const dataStr = formData.get('data') as string
    const body = JSON.parse(dataStr)

    // Handle image uploads - convert to base64 data URI (max 10MB per file)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const imageDataUris: string[] = []
    const files = formData.getAll('images') as File[]
    for (const file of files) {
      if (file.size > 0) {
        if (file.size > MAX_IMAGE_SIZE) throw new ValidationError('Imagem muito grande (max 10MB)')
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
      throw new ValidationError('Total de imagens excede 25MB por orcamento')
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
    throw new Error('Total de imagens excede 25MB por orcamento')
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
        payments: { orderBy: { order: 'asc' } },
        configuratorPicks: { orderBy: { order: 'asc' } },
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
      corteDobraCost,
      instalacaoCost,
      profitMargin,
      casualtyMargin,
      discountPercent,
      entryPercent,
      deliveryPercent,
      taxRate,
      notes,
      images,
      items,
      employees,
      modoCalculo,
      diasExecucao,
      custoOperacionalDia,
      payments,
      picks,
      clientPersonType,
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

    // Soma picks do configurador ao custoMateriais e dias
    const custoPicks = (picks || []).reduce(
      (s: number, p: { unitPrice: number; quantity?: number }) => s + (p.unitPrice || 0) * (p.quantity ?? 1),
      0
    )
    const diasPicks = (picks || []).reduce(
      (s: number, p: { tempoDias: number; quantity?: number }) => s + (p.tempoDias || 0) * (p.quantity ?? 1),
      0
    )
    const custoMateriaisTotal = custoMateriais + custoPicks

    const isOperacional = modoCalculo === 'OPERACIONAL'
    const calc = isOperacional
      ? calcOrcamentoOperacional({
          custoOperacionalDia: custoOperacionalDia || 0,
          diasExecucao: (diasExecucao || 0) + diasPicks,
          custoMateriais: custoMateriaisTotal,
          margemLucro: profitMargin || 20,
          margemCausalidade: casualtyMargin || 5,
          aliquotaImposto: taxRate || 0,
          descontoPercent: discountPercent || 0,
        })
      : calcOrcamento({
          custoMateriais: custoMateriaisTotal,
          custoMaoDeObra,
          custoPintura: paintCost || 0,
          corteDobra: corteDobraCost || 0,
          instalacao: instalacaoCost || 0,
          margemLucro: profitMargin || 20,
          margemCausalidade: casualtyMargin || 5,
          aliquotaImposto: taxRate || 0,
          descontoPercent: discountPercent || 0,
        })

    const budget = await prisma.budget.create({
      data: {
        clientId: clientId || null,
        clientName,
        clientPersonType: clientPersonType === 'PESSOA_FISICA' ? 'PESSOA_FISICA' : 'PESSOA_JURIDICA',
        clientCnpj: clientCnpj || null,
        clientPhone: clientPhone || null,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        productId: productId || null,
        type: type || 'PRODUTO',
        status: status || 'RASCUNHO',
        ironCost: ironCost || 0,
        paintCost: paintCost || 0,
        corteDobraCost: corteDobraCost || 0,
        instalacaoCost: instalacaoCost || 0,
        profitMargin: profitMargin || 20,
        casualtyMargin: casualtyMargin || 5,
        discountPercent: discountPercent || 0,
        entryPercent: entryPercent || 50,
        deliveryPercent: deliveryPercent || 50,
        totalCost: calc.custoBase,
        totalPrice: calc.precoComDesconto,
        taxRate: taxRate || 0,
        modoCalculo: isOperacional ? 'OPERACIONAL' : 'MANUAL',
        diasExecucao: diasExecucao || 0,
        custoOperacionalDia: isOperacional ? (custoOperacionalDia || 0) : 0,
        notes: notes || null,
        images: images || null,
        items: {
          create: (items || []).map(
            (item: {
              materialId?: string
              description: string
              quantity: number
              unitPrice: number
              kind?: string
            }) => ({
              materialId: item.materialId || null,
              kind: item.kind === 'FRETE' || item.kind === 'OPCIONAL_PRODUTO' ? item.kind : 'MATERIAL',
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

      // Gera FinancialEntries a partir dos payments (pagamento misto) ou fallback para entryPercent/deliveryPercent
      const hasPayments = Array.isArray(payments) && payments.length > 0
      if (hasPayments) {
        await prisma.financialEntry.createMany({
          data: payments.map((p: { method: string; amount: number; taxRate?: number; dueOffset?: number }, idx: number) => {
            const dueDate = new Date(now)
            dueDate.setDate(dueDate.getDate() + (p.dueOffset || 0))
            const total = (p.amount || 0) * (1 + (p.taxRate || 0) / 100)
            return {
              type: 'RECEITA',
              category: 'PARCELA',
              group: 'RECEITA_PRINCIPAL',
              paymentMethod: p.method || null,
              description: `Parcela ${idx + 1} - ${clientName}`,
              amount: total,
              dueDate,
              status: 'PENDENTE',
              budgetId: budget.id,
              projectId: project.id,
            }
          }),
        })
      } else {
        const entryAmount = calc.precoFinal * ((entryPercent || 50) / 100)
        const deliveryAmount = calc.precoFinal * ((deliveryPercent || 50) / 100)
        await prisma.financialEntry.createMany({
          data: [
            {
              type: 'RECEITA',
              category: 'PARCELA',
              group: 'RECEITA_PRINCIPAL',
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
              group: 'RECEITA_PRINCIPAL',
              description: `Entrega - ${clientName}`,
              amount: deliveryAmount,
              dueDate: deliveryDate,
              status: 'PENDENTE',
              budgetId: budget.id,
              projectId: project.id,
            },
          ],
        })
      }

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

      // Pro-Labore para socios — fim do mes corrente como vencimento
      const lucroLiquido = (calc.precoFinal || 0) - (calc.custoBase || 0)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      await createProLaboreEntries({
        budgetId: budget.id,
        projectId: project.id,
        clientName,
        lucroLiquido,
        due: endOfMonth,
      })
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
      corteDobraCost,
      instalacaoCost,
      profitMargin,
      casualtyMargin,
      discountPercent,
      entryPercent,
      deliveryPercent,
      taxRate,
      notes,
      images,
      items,
      employees,
      modoCalculo,
      diasExecucao,
      custoOperacionalDia,
      payments,
      picks,
      clientPersonType,
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

    // Soma picks do configurador ao custoMateriais e dias
    const custoPicks = (picks || []).reduce(
      (s: number, p: { unitPrice: number; quantity?: number }) => s + (p.unitPrice || 0) * (p.quantity ?? 1),
      0
    )
    const diasPicks = (picks || []).reduce(
      (s: number, p: { tempoDias: number; quantity?: number }) => s + (p.tempoDias || 0) * (p.quantity ?? 1),
      0
    )
    const custoMateriaisTotal = custoMateriais + custoPicks

    const isOperacional = modoCalculo === 'OPERACIONAL'
    const calc = isOperacional
      ? calcOrcamentoOperacional({
          custoOperacionalDia: custoOperacionalDia || 0,
          diasExecucao: (diasExecucao || 0) + diasPicks,
          custoMateriais: custoMateriaisTotal,
          margemLucro: profitMargin || 20,
          margemCausalidade: casualtyMargin || 5,
          aliquotaImposto: taxRate || 0,
          descontoPercent: discountPercent || 0,
        })
      : calcOrcamento({
          custoMateriais: custoMateriaisTotal,
          custoMaoDeObra,
          custoPintura: paintCost || 0,
          corteDobra: corteDobraCost || 0,
          instalacao: instalacaoCost || 0,
          margemLucro: profitMargin || 20,
          margemCausalidade: casualtyMargin || 5,
          aliquotaImposto: taxRate || 0,
          descontoPercent: discountPercent || 0,
        })

    // Delete old items, employees, payments, picks, then recreate
    await prisma.budgetItem.deleteMany({ where: { budgetId: id } })
    await prisma.budgetEmployee.deleteMany({ where: { budgetId: id } })
    await prisma.budgetPayment.deleteMany({ where: { budgetId: id } })
    await prisma.budgetConfiguratorPick.deleteMany({ where: { budgetId: id } })

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        clientId: clientId || null,
        clientName,
        clientPersonType: clientPersonType === 'PESSOA_FISICA' ? 'PESSOA_FISICA' : 'PESSOA_JURIDICA',
        clientCnpj: clientCnpj || null,
        clientPhone: clientPhone || null,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        productId: productId || null,
        type: type || 'PRODUTO',
        status: status || existing.status,
        ironCost: ironCost || 0,
        paintCost: paintCost || 0,
        corteDobraCost: corteDobraCost || 0,
        instalacaoCost: instalacaoCost || 0,
        profitMargin: profitMargin || 20,
        casualtyMargin: casualtyMargin || 5,
        discountPercent: discountPercent || 0,
        entryPercent: entryPercent || 50,
        deliveryPercent: deliveryPercent || 50,
        totalCost: calc.custoBase,
        totalPrice: calc.precoComDesconto,
        taxRate: taxRate || 0,
        modoCalculo: isOperacional ? 'OPERACIONAL' : 'MANUAL',
        diasExecucao: diasExecucao || 0,
        custoOperacionalDia: isOperacional ? (custoOperacionalDia || 0) : 0,
        notes: notes || null,
        images: images !== undefined ? (images || null) : undefined,
        items: {
          create: (items || []).map(
            (item: {
              materialId?: string
              description: string
              quantity: number
              unitPrice: number
              kind?: string
            }) => ({
              materialId: item.materialId || null,
              kind: item.kind === 'FRETE' || item.kind === 'OPCIONAL_PRODUTO' ? item.kind : 'MATERIAL',
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
        payments: {
          create: (payments || []).map(
            (p: { method: string; amount: number; taxRate?: number; dueOffset?: number; order?: number }, idx: number) => ({
              method: p.method || 'DINHEIRO',
              amount: parseFloat(String(p.amount)) || 0,
              taxRate: parseFloat(String(p.taxRate ?? 0)) || 0,
              dueOffset: parseInt(String(p.dueOffset ?? 0), 10) || 0,
              order: p.order ?? idx,
            })
          ),
        },
        configuratorPicks: {
          create: (picks || []).map(
            (p: { optionId?: string; optionName: string; categoryName: string; unitPrice: number; tempoDias: number; quantity?: number }, idx: number) => ({
              optionId: p.optionId || null,
              optionName: p.optionName,
              categoryName: p.categoryName,
              unitPrice: parseFloat(String(p.unitPrice)) || 0,
              tempoDias: parseFloat(String(p.tempoDias)) || 0,
              quantity: parseFloat(String(p.quantity ?? 1)) || 1,
              order: idx,
            })
          ),
        },
      },
      include: {
        items: { include: { material: true } },
        employees: { include: { employee: true } },
        payments: { orderBy: { order: 'asc' } },
        configuratorPicks: { orderBy: { order: 'asc' } },
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

      const hasPayments = Array.isArray(payments) && payments.length > 0
      if (hasPayments) {
        await prisma.financialEntry.createMany({
          data: payments.map((p: { method: string; amount: number; taxRate?: number; dueOffset?: number }, idx: number) => {
            const dueDate = new Date(now)
            dueDate.setDate(dueDate.getDate() + (p.dueOffset || 0))
            const total = (p.amount || 0) * (1 + (p.taxRate || 0) / 100)
            return {
              type: 'RECEITA',
              category: 'PARCELA',
              group: 'RECEITA_PRINCIPAL',
              paymentMethod: p.method || null,
              description: `Parcela ${idx + 1} - ${clientName}`,
              amount: total,
              dueDate,
              status: 'PENDENTE',
              budgetId: budget.id,
              projectId: project.id,
            }
          }),
        })
      } else {
        const entryAmount = calc.precoFinal * ((entryPercent || 50) / 100)
        const deliveryAmount = calc.precoFinal * ((deliveryPercent || 50) / 100)
        await prisma.financialEntry.createMany({
          data: [
            {
              type: 'RECEITA',
              category: 'PARCELA',
              group: 'RECEITA_PRINCIPAL',
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
              group: 'RECEITA_PRINCIPAL',
              description: `Entrega - ${clientName}`,
              amount: deliveryAmount,
              dueDate: deliveryDate,
              status: 'PENDENTE',
              budgetId: budget.id,
              projectId: project.id,
            },
          ],
        })
      }

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

      // Pro-Labore para socios — fim do mes corrente como vencimento
      const lucroLiquido = (calc.precoFinal || 0) - (calc.custoBase || 0)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      await createProLaboreEntries({
        budgetId: budget.id,
        projectId: project.id,
        clientName,
        lucroLiquido,
        due: endOfMonth,
      })
    }

    return NextResponse.json(budget)
  } catch (error) {
    return apiErrorResponse(error, 'Erro ao atualizar orcamento', 'Error updating budget:')
  }
}
