import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAllowedPage } from '@/lib/auth'

async function getOrCreateTemplate() {
  let template = await prisma.budgetTemplate.findFirst()
  if (!template) {
    template = await prisma.budgetTemplate.create({ data: {} })
  }
  return template
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const template = await getOrCreateTemplate()
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Erro ao buscar template' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAllowedPage('/configuracoes')
  if (error) return error

  try {
    const formData = await request.formData()
    const template = await getOrCreateTemplate()

    const data: Record<string, any> = {}

    const fields = [
      'companyName', 'companySubtitle', 'primaryColor', 'secondaryColor',
      'textColor', 'headerText', 'footerText', 'termsText', 'warrantyText',
    ]
    for (const field of fields) {
      const value = formData.get(field)
      if (value !== null) {
        data[field] = (value as string) || (field === 'companyName' ? 'SteelArt' : null)
      }
    }

    const validityDays = formData.get('validityDays')
    if (validityDays !== null) {
      data.validityDays = parseInt(validityDays as string) || 15
    }

    // Handle logo upload - convert to base64 data URI
    const logoFile = formData.get('logo') as File | null
    if (logoFile && logoFile.size > 0) {
      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const mimeType = logoFile.type || 'image/png'
      const base64 = buffer.toString('base64')
      data.logoPath = `data:${mimeType};base64,${base64}`
    }

    const removeLogo = formData.get('removeLogo')
    if (removeLogo === 'true') {
      data.logoPath = null
    }

    const updated = await prisma.budgetTemplate.update({
      where: { id: template.id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Erro ao atualizar template' }, { status: 500 })
  }
}
