import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST() {
  try {
    // Gate duplo: ENABLE_SEED precisa estar ativo E nao pode existir usuario no banco.
    // Em producao normal, ENABLE_SEED fica desligado (ou ausente) e a rota retorna 403.
    if (process.env.ENABLE_SEED !== 'true') {
      return NextResponse.json({ error: 'Seed desabilitado neste ambiente.' }, { status: 403 })
    }

    const userCount = await prisma.user.count()
    if (userCount > 0) {
      return NextResponse.json({ error: 'Seed ja foi executado.' }, { status: 403 })
    }

    // Senhas precisam vir do ambiente — nao manter defaults no codigo publico.
    // Minimo de 12 caracteres para evitar seed com senhas fracas.
    const adminPlain = process.env.SEED_ADMIN_PASSWORD
    const vendedorPlain = process.env.SEED_VENDEDOR_PASSWORD
    if (!adminPlain || adminPlain.length < 12 || !vendedorPlain || vendedorPlain.length < 12) {
      return NextResponse.json(
        {
          error:
            'Defina SEED_ADMIN_PASSWORD e SEED_VENDEDOR_PASSWORD (minimo 12 caracteres) antes de executar o seed.',
        },
        { status: 400 }
      )
    }

    const adminPassword = await hash(adminPlain, 12)
    const vendedorPassword = await hash(vendedorPlain, 12)

    const admin = await prisma.user.create({
      data: { name: 'Administrador', email: 'admin@metalgestao.com', password: adminPassword, role: 'ADMIN' },
    })

    const vendedor = await prisma.user.create({
      data: { name: 'Carlos Vendedor', email: 'vendedor@metalgestao.com', password: vendedorPassword, role: 'VENDEDOR' },
    })

    const employees = await Promise.all([
      prisma.employee.create({ data: { name: 'Jose Silva', role: 'Soldador', monthlyCost: 4500, benefits: 800 } }),
      prisma.employee.create({ data: { name: 'Pedro Santos', role: 'Soldador', monthlyCost: 4200, benefits: 800 } }),
      prisma.employee.create({ data: { name: 'Antonio Oliveira', role: 'Montador', monthlyCost: 3800, benefits: 700 } }),
      prisma.employee.create({ data: { name: 'Marcos Lima', role: 'Pintor', monthlyCost: 3500, benefits: 600 } }),
      prisma.employee.create({ data: { name: 'Roberto Costa', role: 'Ajudante', monthlyCost: 2800, benefits: 500 } }),
    ])

    await Promise.all([
      prisma.material.create({ data: { name: 'Perfil U 4"', unit: 'M', currentPrice: 45, stock: 120, minStock: 20, category: 'ACO' } }),
      prisma.material.create({ data: { name: 'Perfil U 6"', unit: 'M', currentPrice: 68, stock: 80, minStock: 15, category: 'ACO' } }),
      prisma.material.create({ data: { name: 'Tubo Quadrado 50x50', unit: 'M', currentPrice: 32, stock: 200, minStock: 30, category: 'ACO' } }),
      prisma.material.create({ data: { name: 'Tubo Retangular 100x50', unit: 'M', currentPrice: 55, stock: 150, minStock: 25, category: 'ACO' } }),
      prisma.material.create({ data: { name: 'Chapa 3mm', unit: 'M2', currentPrice: 180, stock: 40, minStock: 10, category: 'ACO' } }),
      prisma.material.create({ data: { name: 'Telha Galvalume', unit: 'M2', currentPrice: 42, stock: 300, minStock: 50, category: 'ACO' } }),
      prisma.material.create({ data: { name: 'Tinta Esmalte Cinza', unit: 'UN', currentPrice: 280, stock: 15, minStock: 5, category: 'TINTA' } }),
      prisma.material.create({ data: { name: 'Tinta Primer', unit: 'UN', currentPrice: 220, stock: 10, minStock: 3, category: 'TINTA' } }),
      prisma.material.create({ data: { name: 'Parafuso Autobrocante', unit: 'UN', currentPrice: 0.35, stock: 5000, minStock: 500, category: 'PARAFUSO' } }),
      prisma.material.create({ data: { name: 'Eletrodo 6013', unit: 'KG', currentPrice: 22, stock: 50, minStock: 10, category: 'OUTROS' } }),
    ])

    await Promise.all([
      prisma.fixedCost.create({ data: { name: 'Aluguel Galpao', amount: 5500, category: 'ALUGUEL' } }),
      prisma.fixedCost.create({ data: { name: 'Energia Eletrica', amount: 1800, category: 'ENERGIA' } }),
      prisma.fixedCost.create({ data: { name: 'Internet', amount: 200, category: 'INTERNET' } }),
      prisma.fixedCost.create({ data: { name: 'Contador', amount: 1200, category: 'CONTADOR' } }),
      prisma.fixedCost.create({ data: { name: 'Seguro', amount: 450, category: 'OUTROS' } }),
    ])

    await Promise.all([
      prisma.taxConfig.create({ data: { name: 'ICMS Produto', type: 'ICMS', rate: 12, appliesTo: 'PRODUTO' } }),
      prisma.taxConfig.create({ data: { name: 'ISS Servico', type: 'ISS', rate: 5, appliesTo: 'SERVICO' } }),
    ])

    const budget = await prisma.budget.create({
      data: {
        clientName: 'Fazenda Boa Vista',
        clientPhone: '(11) 99999-0001',
        clientEmail: 'contato@boavista.com',
        clientAddress: 'Rodovia SP-101, Km 45',
        type: 'PRODUTO',
        status: 'APROVADO',
        ironCost: 8500,
        paintCost: 1200,
        profitMargin: 25,
        casualtyMargin: 5,
        entryPercent: 50,
        deliveryPercent: 50,
        totalCost: 15800,
        totalPrice: 22500,
        taxRate: 12,
        notes: 'Chale padrao 30m2 com varanda',
        createdById: vendedor.id,
        items: {
          create: [
            { description: 'Perfil U 4"', quantity: 60, unitPrice: 45 },
            { description: 'Tubo Quadrado 50x50', quantity: 80, unitPrice: 32 },
            { description: 'Telha Galvalume', quantity: 35, unitPrice: 42 },
            { description: 'Chapa 3mm', quantity: 8, unitPrice: 180 },
          ],
        },
        employees: {
          create: [
            { employeeId: employees[0].id, hoursAllocated: 80 },
            { employeeId: employees[1].id, hoursAllocated: 80 },
            { employeeId: employees[2].id, hoursAllocated: 40 },
          ],
        },
      },
    })

    await prisma.project.create({
      data: {
        budgetId: budget.id,
        status: 'EM_PRODUCAO',
        progress: 45,
        startDate: new Date('2026-03-10'),
        expectedEnd: new Date('2026-04-15'),
      },
    })

    await Promise.all([
      prisma.financialEntry.create({
        data: { type: 'RECEITA', category: 'PARCELA', description: 'Entrada 50% - Chale Fazenda Boa Vista', amount: 11250, dueDate: new Date('2026-03-10'), paidDate: new Date('2026-03-10'), status: 'PAGO', budgetId: budget.id },
      }),
      prisma.financialEntry.create({
        data: { type: 'RECEITA', category: 'PARCELA', description: 'Entrega 50% - Chale Fazenda Boa Vista', amount: 11250, dueDate: new Date('2026-04-15'), status: 'PENDENTE', budgetId: budget.id },
      }),
      prisma.financialEntry.create({
        data: { type: 'DESPESA', category: 'FORNECEDOR', description: 'Aco Forte Distribuidora - Perfis', amount: 6200, dueDate: new Date('2026-03-15'), paidDate: new Date('2026-03-14'), status: 'PAGO' },
      }),
      prisma.financialEntry.create({
        data: { type: 'DESPESA', category: 'CUSTO_FIXO', description: 'Aluguel Galpao - Marco', amount: 5500, dueDate: new Date('2026-03-05'), paidDate: new Date('2026-03-05'), status: 'PAGO' },
      }),
    ])

    await prisma.budget.create({
      data: {
        clientName: 'Sitio Santa Maria',
        clientPhone: '(11) 98888-0002',
        type: 'PRODUTO',
        status: 'RASCUNHO',
        ironCost: 12000,
        paintCost: 1800,
        profitMargin: 20,
        casualtyMargin: 5,
        entryPercent: 40,
        deliveryPercent: 60,
        totalCost: 21000,
        totalPrice: 28500,
        taxRate: 12,
        notes: 'Chale grande 45m2 com deck',
        createdById: vendedor.id,
      },
    })

    await Promise.all([
      prisma.employeeDeduction.create({ data: { employeeId: employees[0].id, type: 'ALMOCO', amount: 50, date: new Date('2026-03-20'), description: 'Vale almoco' } }),
      prisma.employeeDeduction.create({ data: { employeeId: employees[0].id, type: 'ADIANTAMENTO', amount: 500, date: new Date('2026-03-15'), description: 'Adiantamento quinzenal' } }),
    ])

    return NextResponse.json({ message: 'Seed completed successfully!' })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
