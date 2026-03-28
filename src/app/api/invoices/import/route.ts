import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseNFXml } from '@/lib/xml-parser'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    if (!body.xml) {
      return NextResponse.json(
        { error: 'Conteudo XML e obrigatorio' },
        { status: 400 }
      )
    }

    const nfData = parseNFXml(body.xml)

    // Check if invoice already imported
    const existing = await prisma.invoice.findFirst({
      where: {
        number: nfData.number,
        supplierCnpj: nfData.supplierCnpj,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'NF ja importada anteriormente' },
        { status: 409 }
      )
    }

    // Find existing materials to try matching
    const allMaterials = await prisma.material.findMany()

    // Build matches for each NF item
    const itemMatches = nfData.items.map((nfItem) => {
      const descLower = nfItem.description.toLowerCase().trim()
      let bestMatch: (typeof allMaterials)[0] | null = null
      let bestScore = 0

      for (const mat of allMaterials) {
        const matLower = mat.name.toLowerCase().trim()
        // Simple similarity: check if one contains the other or exact match
        if (matLower === descLower) {
          bestMatch = mat
          bestScore = 1
          break
        }
        if (matLower.includes(descLower) || descLower.includes(matLower)) {
          const score =
            Math.min(matLower.length, descLower.length) /
            Math.max(matLower.length, descLower.length)
          if (score > bestScore) {
            bestScore = score
            bestMatch = mat
          }
        }
        // Check individual words overlap
        const matWords = matLower.split(/\s+/)
        const descWords = descLower.split(/\s+/)
        const common = matWords.filter((w) => descWords.includes(w)).length
        const wordScore =
          common / Math.max(matWords.length, descWords.length)
        if (wordScore > bestScore && wordScore >= 0.5) {
          bestScore = wordScore
          bestMatch = mat
        }
      }

      return {
        ...nfItem,
        matchedMaterial: bestScore >= 0.4 ? bestMatch : null,
        matchScore: bestScore,
      }
    })

    // Create Invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        supplierName: nfData.supplierName,
        supplierCnpj: nfData.supplierCnpj,
        number: nfData.number,
        totalAmount: nfData.totalAmount,
        xmlData: body.xml,
        importDate: new Date(),
        items: {
          create: nfData.items.map((item, idx) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            materialId: itemMatches[idx].matchedMaterial?.id || null,
          })),
        },
      },
      include: { items: true },
    })

    // Update prices for matched materials
    for (const match of itemMatches) {
      if (match.matchedMaterial) {
        await prisma.material.update({
          where: { id: match.matchedMaterial.id },
          data: { currentPrice: match.unitPrice },
        })
      }
    }

    return NextResponse.json({
      invoice,
      nfData,
      matches: itemMatches.map((m) => ({
        description: m.description,
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        matchedMaterialId: m.matchedMaterial?.id || null,
        matchedMaterialName: m.matchedMaterial?.name || null,
        matchScore: m.matchScore,
      })),
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao importar NF:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao importar NF' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        items: {
          include: { material: true },
        },
      },
      orderBy: { importDate: 'desc' },
    })
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Erro ao buscar notas fiscais:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar notas fiscais' },
      { status: 500 }
    )
  }
}
