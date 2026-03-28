import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcOrcamento, calcValorHora } from '@/lib/calculations'
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, renderToBuffer } from '@react-pdf/renderer'

// --------------- Types ---------------

interface TemplateConfig {
  companyName: string
  companySubtitle: string
  logoDataUri?: string | null
  primaryColor: string
  secondaryColor: string
  textColor: string
  headerText?: string | null
  footerText: string
  termsText?: string | null
  warrantyText?: string | null
  validityDays: number
}

// --------------- Helpers ---------------

function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function fmtDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR')
}

// --------------- Dynamic Styles ---------------

function createStyles(t: TemplateConfig) {
  return StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Helvetica',
      color: t.textColor,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      borderBottom: `2px solid ${t.primaryColor}`,
      paddingBottom: 15,
    },
    logo: {
      fontSize: 22,
      fontFamily: 'Helvetica-Bold',
      color: t.textColor,
    },
    logoAccent: {
      color: t.primaryColor,
    },
    logoImage: {
      width: 150,
      height: 50,
      objectFit: 'contain',
    },
    headerRight: {
      textAlign: 'right',
    },
    subtitle: {
      fontSize: 8,
      color: '#666',
      marginTop: 2,
    },
    orcNumber: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: t.primaryColor,
    },
    headerTextBlock: {
      fontSize: 8,
      color: '#555',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: t.primaryColor,
      marginTop: 16,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottom: '1px solid #e5e5e5',
    },
    row: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    label: {
      width: 120,
      fontFamily: 'Helvetica-Bold',
      fontSize: 9,
      color: '#444',
    },
    value: {
      flex: 1,
      fontSize: 9,
    },
    table: {
      marginTop: 6,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: t.secondaryColor,
      padding: 6,
      borderRadius: 2,
    },
    tableHeaderText: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 8,
      color: '#fff',
    },
    tableRow: {
      flexDirection: 'row',
      padding: 5,
      borderBottom: '0.5px solid #e5e5e5',
    },
    tableRowAlt: {
      flexDirection: 'row',
      padding: 5,
      borderBottom: '0.5px solid #e5e5e5',
      backgroundColor: '#fafafa',
    },
    tableCell: {
      fontSize: 9,
    },
    summaryBox: {
      marginTop: 16,
      padding: 12,
      backgroundColor: `${t.primaryColor}15`,
      borderRadius: 4,
      border: `1px solid ${t.primaryColor}`,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    summaryLabel: {
      fontSize: 9,
      color: '#444',
    },
    summaryValue: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
      paddingTop: 6,
      borderTop: `1.5px solid ${t.primaryColor}`,
    },
    totalLabel: {
      fontSize: 13,
      fontFamily: 'Helvetica-Bold',
      color: t.textColor,
    },
    totalValue: {
      fontSize: 13,
      fontFamily: 'Helvetica-Bold',
      color: t.primaryColor,
    },
    paymentBox: {
      marginTop: 12,
      padding: 10,
      backgroundColor: '#f5f5f5',
      borderRadius: 4,
    },
    notesBox: {
      marginTop: 12,
      padding: 10,
      backgroundColor: '#f9fafb',
      borderRadius: 4,
      border: '0.5px solid #e5e5e5',
    },
    imagesSection: {
      marginTop: 16,
    },
    imagesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    imageContainer: {
      width: '48%',
      height: 180,
      borderRadius: 4,
      overflow: 'hidden',
      border: '0.5px solid #e5e5e5',
    },
    budgetImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: 'center',
      fontSize: 7,
      color: '#999',
      borderTop: '0.5px solid #e5e5e5',
      paddingTop: 8,
    },
  })
}

// --------------- PDF Document ---------------

function OrcamentoPDF({
  budget,
  calc,
  custoMaoDeObra,
  custoMateriais,
  imageDataUris,
  template,
}: {
  budget: any
  calc: ReturnType<typeof calcOrcamento>
  custoMaoDeObra: number
  custoMateriais: number
  imageDataUris: string[]
  template: TemplateConfig
}) {
  const s = createStyles(template)
  const orcNum = `ORC-${budget.id.slice(-6).toUpperCase()}`

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {template.logoDataUri ? (
              <Image style={s.logoImage} src={template.logoDataUri} />
            ) : (
              <Text style={s.logo}>
                {template.companyName.split(/(?=[A-Z])/).map((part, i) =>
                  i === 0 ? part : <Text key={i} style={s.logoAccent}>{part}</Text>
                )}
              </Text>
            )}
            <Text style={s.subtitle}>{template.companySubtitle}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.orcNumber}>{orcNum}</Text>
            <Text style={s.subtitle}>Data: {fmtDate(budget.createdAt)}</Text>
            <Text style={s.subtitle}>
              Tipo: {budget.type === 'PRODUTO' ? 'Produto' : 'Servico'}
            </Text>
          </View>
        </View>

        {/* Header Text */}
        {template.headerText && (
          <Text style={s.headerTextBlock}>{template.headerText}</Text>
        )}

        {/* Client Info */}
        <Text style={s.sectionTitle}>DADOS DO CLIENTE</Text>
        <View style={s.row}>
          <Text style={s.label}>Nome:</Text>
          <Text style={s.value}>{budget.clientName}</Text>
        </View>
        {budget.clientPhone && (
          <View style={s.row}>
            <Text style={s.label}>Telefone:</Text>
            <Text style={s.value}>{budget.clientPhone}</Text>
          </View>
        )}
        {budget.clientEmail && (
          <View style={s.row}>
            <Text style={s.label}>E-mail:</Text>
            <Text style={s.value}>{budget.clientEmail}</Text>
          </View>
        )}
        {budget.clientAddress && (
          <View style={s.row}>
            <Text style={s.label}>Endereco:</Text>
            <Text style={s.value}>{budget.clientAddress}</Text>
          </View>
        )}

        {/* Items Table */}
        {budget.items && budget.items.length > 0 && (
          <>
            <Text style={s.sectionTitle}>MATERIAIS E ITENS</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { flex: 3 }]}>Descricao</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qtd</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Unitario</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
              </View>
              {budget.items.map((item: any, i: number) => (
                <View key={item.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCell, { flex: 3 }]}>
                    {item.material ? item.material.name : item.description}
                  </Text>
                  <Text style={[s.tableCell, { flex: 1, textAlign: 'center' }]}>
                    {item.quantity}
                  </Text>
                  <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {fmt(item.unitPrice)}
                  </Text>
                  <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {fmt(item.quantity * item.unitPrice)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Employees */}
        {budget.employees && budget.employees.length > 0 && (
          <>
            <Text style={s.sectionTitle}>MAO DE OBRA</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderText, { flex: 2 }]}>Funcionario</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Funcao</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Horas</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Valor/h</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
              </View>
              {budget.employees.map((be: any, i: number) => {
                const valorHora = calcValorHora(be.employee.monthlyCost)
                return (
                  <View key={be.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                    <Text style={[s.tableCell, { flex: 2 }]}>{be.employee.name}</Text>
                    <Text style={[s.tableCell, { flex: 1, textAlign: 'center' }]}>
                      {be.employee.role}
                    </Text>
                    <Text style={[s.tableCell, { flex: 1, textAlign: 'center' }]}>
                      {be.hoursAllocated}h
                    </Text>
                    <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>
                      {fmt(valorHora)}
                    </Text>
                    <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>
                      {fmt(valorHora * be.hoursAllocated)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Summary */}
        <View style={s.summaryBox}>
          <Text style={[s.sectionTitle, { marginTop: 0, borderBottom: 'none' }]}>
            RESUMO FINANCEIRO
          </Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Materiais:</Text>
            <Text style={s.summaryValue}>{fmt(custoMateriais)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Mao de Obra:</Text>
            <Text style={s.summaryValue}>{fmt(custoMaoDeObra)}</Text>
          </View>
          {budget.paintCost > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Pintura:</Text>
              <Text style={s.summaryValue}>{fmt(budget.paintCost)}</Text>
            </View>
          )}
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Custo Base:</Text>
            <Text style={s.summaryValue}>{fmt(calc.custoBase)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Casualidade ({budget.casualtyMargin}%):</Text>
            <Text style={s.summaryValue}>{fmt(calc.custoComCausalidade - calc.custoBase)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Lucro ({budget.profitMargin}%):</Text>
            <Text style={s.summaryValue}>{fmt(calc.lucro)}</Text>
          </View>
          {calc.imposto > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Impostos ({budget.taxRate}%):</Text>
              <Text style={s.summaryValue}>{fmt(calc.imposto)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>VALOR TOTAL:</Text>
            <Text style={s.totalValue}>{fmt(calc.precoFinal)}</Text>
          </View>
        </View>

        {/* Payment Conditions */}
        <View style={s.paymentBox}>
          <Text style={[s.sectionTitle, { marginTop: 0 }]}>CONDICOES DE PAGAMENTO</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Entrada ({budget.entryPercent}%):</Text>
            <Text style={s.summaryValue}>
              {fmt(calc.precoFinal * (budget.entryPercent / 100))}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Na Entrega ({budget.deliveryPercent}%):</Text>
            <Text style={s.summaryValue}>
              {fmt(calc.precoFinal * (budget.deliveryPercent / 100))}
            </Text>
          </View>
        </View>

        {/* Reference Images */}
        {imageDataUris.length > 0 && (
          <View style={s.imagesSection} break={imageDataUris.length > 2}>
            <Text style={s.sectionTitle}>IMAGENS DE REFERENCIA</Text>
            <View style={s.imagesGrid}>
              {imageDataUris.map((dataUri, i) => (
                <View key={i} style={s.imageContainer}>
                  <Image style={s.budgetImage} src={dataUri} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {budget.notes && (
          <View style={s.notesBox}>
            <Text style={[s.sectionTitle, { marginTop: 0 }]}>OBSERVACOES</Text>
            <Text style={{ fontSize: 9, color: '#555' }}>{budget.notes}</Text>
          </View>
        )}

        {/* Terms & Conditions */}
        {template.termsText && (
          <View style={s.notesBox}>
            <Text style={[s.sectionTitle, { marginTop: 0 }]}>TERMOS E CONDICOES</Text>
            <Text style={{ fontSize: 9, color: '#555' }}>{template.termsText}</Text>
          </View>
        )}

        {/* Warranty */}
        {template.warrantyText && (
          <View style={s.notesBox}>
            <Text style={[s.sectionTitle, { marginTop: 0 }]}>GARANTIA</Text>
            <Text style={{ fontSize: 9, color: '#555' }}>{template.warrantyText}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={s.footer}>
          {template.companyName} — Orcamento gerado em {fmtDate(new Date())} — {template.footerText}
        </Text>
      </Page>
    </Document>
  )
}

// --------------- API Route ---------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { material: true } },
        employees: { include: { employee: true } },
      },
    })

    if (!budget) {
      return NextResponse.json({ error: 'Orcamento nao encontrado' }, { status: 404 })
    }

    // Load template config
    let dbTemplate = await prisma.budgetTemplate.findFirst()
    if (!dbTemplate) {
      dbTemplate = await prisma.budgetTemplate.create({ data: {} })
    }

    const template: TemplateConfig = {
      companyName: dbTemplate.companyName,
      companySubtitle: dbTemplate.companySubtitle,
      logoDataUri: dbTemplate.logoPath || null,
      primaryColor: dbTemplate.primaryColor,
      secondaryColor: dbTemplate.secondaryColor,
      textColor: dbTemplate.textColor,
      headerText: dbTemplate.headerText,
      footerText: dbTemplate.footerText,
      termsText: dbTemplate.termsText,
      warrantyText: dbTemplate.warrantyText,
      validityDays: dbTemplate.validityDays,
    }

    // Calculate costs
    const custoItens = budget.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const custoMateriais = custoItens + budget.ironCost

    const custoMaoDeObra = budget.employees.reduce((sum, be) => {
      const valorHora = calcValorHora(be.employee.monthlyCost)
      return sum + valorHora * be.hoursAllocated
    }, 0)

    const calc = calcOrcamento({
      custoMateriais,
      custoMaoDeObra,
      custoPintura: budget.paintCost,
      margemLucro: budget.profitMargin,
      margemCausalidade: budget.casualtyMargin,
      aliquotaImposto: budget.taxRate,
    })

    // Get budget images (stored as base64 data URIs)
    const imageDataUris = budget.images ? budget.images.split('|||').filter(Boolean) : []

    const pdfBuffer = await renderToBuffer(
      <OrcamentoPDF
        budget={budget}
        calc={calc}
        custoMaoDeObra={custoMaoDeObra}
        custoMateriais={custoMateriais}
        imageDataUris={imageDataUris}
        template={template}
      />
    )

    const orcNum = `ORC-${budget.id.slice(-6).toUpperCase()}`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${orcNum}-${budget.clientName.replace(/\s+/g, '_')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
