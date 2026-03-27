import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'

async function getOrCreateTemplate() {
  let template = await prisma.budgetTemplate.findFirst()
  if (!template) {
    template = await prisma.budgetTemplate.create({ data: {} })
  }
  return template
}

export async function GET() {
  try {
    const template = await getOrCreateTemplate()
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Erro ao buscar template' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    // Handle logo upload
    const logoFile = formData.get('logo') as File | null
    if (logoFile && logoFile.size > 0) {
      const bytes = await logoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = logoFile.name.split('.').pop() || 'png'
      const fileName = `logo-${Date.now()}.${ext}`
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'template', fileName)
      await writeFile(filePath, buffer)
      data.logoPath = `/uploads/template/${fileName}`
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
