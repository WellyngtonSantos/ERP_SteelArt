import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        budget: {
          include: {
            items: { include: { material: true } },
            employees: { include: { employee: true } },
            financialEntries: true,
          },
        },
        financialEntries: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Erro ao buscar projetos' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, progress, notes, startDate, expectedEnd } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })
    }

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Projeto nao encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) updateData.status = status
    if (progress !== undefined) updateData.progress = progress
    if (notes !== undefined) updateData.notes = notes
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (expectedEnd !== undefined) updateData.expectedEnd = new Date(expectedEnd)

    // Auto-set startDate when moving to EM_PRODUCAO
    if (status === 'EM_PRODUCAO' && !existing.startDate) {
      updateData.startDate = new Date()
    }

    // Auto-set progress to 100 when CONCLUIDO
    if (status === 'CONCLUIDO') {
      updateData.progress = 100
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        budget: {
          include: {
            items: { include: { material: true } },
            employees: { include: { employee: true } },
            financialEntries: true,
          },
        },
        financialEntries: true,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Erro ao atualizar projeto' }, { status: 500 })
  }
}
